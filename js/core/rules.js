// =============================================
// rules.js : 실제 규정을 따르는 부분
// 1. KBO FA (1군 등록 시즌, 재자격, A/B/C 등급)
// 2. 포스팅 (KBO → MLB, NPB)
// 3. MLB 서비스타임 (연봉조정, 논텐더, FA)
// 4. 대학 진학과 드래프트
// =============================================

const FA_RULES = {
  hsGrad: 8, // 고졸: 1군 등록 8시즌이면 FA
  collegeGrad: 7, // 대졸: 7시즌
  requalify: 4, // FA 계약 후 다시 FA가 되려면 4시즌
  posting: 7, // 포스팅은 1군 등록 7시즌 + 구단 동의
  serviceShare: 0.78, // 1군 등록일수 145일 ≒ 시즌의 78%
  mlbArb: 3, // MLB 서비스타임 3년부터 연봉조정
  mlbFA: 6, // 6년이면 FA
};

const RULE_CHOICES = ["posting", "postingOffer", "draftSign", "collegePick"];

Object.assign(NEWS.special, {
  scouts: "MLB·NPB 스카우트들, {name} 보러 줄줄이 방한",
  serviceShort: "{name}, 1군 등록일수 부족… FA 시계 1년 늦어진다",
  serviceMerge: "{name}, 모자랐던 1군 등록일수 합산해 1시즌 인정… FA 시계 다시 돈다",
  renew: "{name}, FA 재자격까지 {left}시즌… {team|과} 1년 재계약",
  arbitration: "{name}, 연봉조정 거쳐 1년 {salary} 계약 (서비스타임 {years}년)",
  preArb: "{name}, 서비스타임 {years}년… 구단과 1년 {salary} 재계약",
  nontender: "{team}, {name} 논텐더 결정… 자유계약 신분으로",
});

Object.assign(FAN, {
  posting: ["가서 꼭 성공해라", "그동안 고마웠다 ㅠㅠ", "솔직히 거기선 안 통할 듯", "해외에서도 응원한다"],
  postingFail: ["아쉽지만 내년에 다시 가자", "오히려 좋아 우리 팀에 남는다", "현실의 벽이 높네"],
  college: ["대학 가서 몸 만들고 오자", "4년 뒤에 1라운드 가자", "대학야구도 볼 맛 나겠네"],
});

// ---------------------------------------------
// 1. KBO FA
// ---------------------------------------------
function kboFaNeeded(player) {
  return player.collegeGrad ? FA_RULES.collegeGrad : FA_RULES.hsGrad;
}

// 1군에 145일 이상 등록된 시즌만 FA 시즌으로 쳐줌 (2군, 상무, 해외는 제외)
function countKboService(player, report) {
  if (report.league !== "KBO") return;
  if ((report.gameFactor || 1) >= FA_RULES.serviceShare) {
    player.kboService = (player.kboService || 0) + 1;
  } else {
    const days = registeredDays(report);
    report.events.push(`1군 등록 ${days}일 (부족)`);
    // 모자란 시즌 등록일수는 쌓아 뒀다가 145일 차면 1시즌으로 쳐줌 (실제 규정)
    player.kboDaysBank = (player.kboDaysBank || 0) + days;
    let merged = false;
    if (player.kboDaysBank >= FA_DAYS) {
      player.kboDaysBank -= FA_DAYS;
      player.kboService = (player.kboService || 0) + 1;
      merged = true;
      report.events.push("등록일수 합산 1시즌 인정");
      report.specials.push({ key: "serviceMerge" });
    }
    // 부상 때문이면 크게 알려줌 (extra.js), 아니면 기사만
    if (!merged && !serviceShortNotice(player, report, days)) report.specials.push({ key: "serviceShort" });
  }
}
const FA_DAYS = 145; // 1시즌으로 쳐주는 1군 등록일수

function isKboFaEligible(player) {
  const s = player.kboService || 0;
  if (player.faCount) return s - (player.lastFaService || 0) >= FA_RULES.requalify;
  return s >= kboFaNeeded(player);
}

// 다음 FA까지 남은 1군 시즌
function seasonsToFa(player) {
  const s = player.kboService || 0;
  if (player.faCount) return Math.max(0, FA_RULES.requalify - (s - (player.lastFaService || 0)));
  return Math.max(0, kboFaNeeded(player) - s);
}

// FA 등급 (직전 연봉 기준을 단순화: A ≈ 6억 이상, B ≈ 2억 이상)
// 35세 이상(한국 나이)과 세 번째 FA부터는 C등급, 두 번째 FA는 최대 B등급
function faGrade(player) {
  if (koreanAge(player.age) >= 35 || (player.faCount || 0) >= 2) return "C";
  const salary = player.contract ? player.contract.salary / priceIndex(player) : 0;
  let grade = salary >= 60000 ? "A" : salary >= 20000 ? "B" : "C";
  if (player.faCount === 1 && grade === "A") grade = "B";
  return grade;
}

const FA_COMP = {
  A: "보상선수 1명(보호선수 20명 외) + 직전 연봉 200%",
  B: "보상선수 1명(보호선수 25명 외) + 직전 연봉 100%",
  C: "보상선수 없이 직전 연봉 150%",
};

function faText(player, head) {
  const grade = faGrade(player);
  return `${head} (1군 등록 ${player.kboService}시즌) ${grade}등급 FA라서 다른 KBO 팀이 데려가면 원소속팀에 ${FA_COMP[grade]}을 줘야 해요. 해외 구단과도 협상할 수 있어요.`;
}

// FA 계약이 끝났는데 재자격(4시즌) 전이면 원소속팀과 1년 재계약
function renewAfterFa(player, report) {
  const c = player.contract;
  c.isFA = false;
  c.years = 1;
  c.total = 0;
  negotiateSalary(player);
  report.specials.push({ key: "renew", left: seasonsToFa(player) });
}

// ---------------------------------------------
// 2. 포스팅
// - 1군 등록 7시즌 + 구단 동의
// - MLB 30개 구단과 30일 동안 협상, 못 하면 복귀 (다음 비시즌에 다시 가능)
// - 포스팅 비용: 보장액 2,500만 달러까지 20%, 다음 2,500만 달러 17.5%, 그 위 15%
// - NPB는 KBO와 공식 포스팅 협정이 없어서 구단 동의를 받아 이적함
// ---------------------------------------------
const DOLLAR_25M = 3500000; // 2,500만 달러 ≒ 350억 원 (만원 단위)

function postingFee(total) {
  return Math.round(0.2 * Math.min(total, DOLLAR_25M) + 0.175 * clamp(total - DOLLAR_25M, 0, DOLLAR_25M) + 0.15 * Math.max(total - 2 * DOLLAR_25M, 0));
}

function postingChance(player, league, boost) {
  const ovr = getOvrs(player).best;
  const war = recentWar(player);
  const base = league === "MLB" ? (ovr - 66) * 0.05 + war * 0.03 : (ovr - 62) * 0.05 + war * 0.035;
  return clamp(base + (boost ? 0.25 : 0), 0.03, 0.85);
}

// KBO 폭격: 이번 시즌 WAR 6 이상이거나 MVP
function isBombing(report) {
  return report.league === "KBO" && (report.WAR >= 6 || report.awards.some((a) => a.includes("MVP")));
}

function consentChance(player, boost) {
  if (overseasClauseOk(player)) return 0.97; // 계약서에 해외 진출 보장 (contract.js)
  const underContract = player.contract && player.contract.isFA && player.contract.years > 0;
  let p = underContract ? 0.55 : 0.85;
  if (boost) p += 0.1;
  if (isFranchiseHere(player)) p -= 0.15;
  return clamp(p, 0.2, 0.95);
}

function maybePosting(player, report) {
  if (player.league !== "KBO" || (player.kboService || 0) < FA_RULES.posting) return;
  const bomb = isBombing(report);
  const ovr = getOvrs(player).best;
  if (!bomb && ovr < LEAGUES.KBO.level + 4) return;
  if (bomb) report.specials.push({ key: "scouts" });
  const consent = chanceLabel(consentChance(player, bomb));
  pushChoice(player, {
    key: "posting",
    boost: bomb,
    text: `${bomb ? "KBO를 폭격하자 해외 스카우트들이 몰려왔어요! " : ""}1군 등록 ${player.kboService}시즌을 채워 포스팅 자격이 있어요. 구단이 허락하면 해외 구단과 협상할 수 있어요. 실패하면 팀으로 돌아와요.`,
    options: [
      {
        id: "MLB",
        label: "MLB 포스팅 요청",
        detail: `구단 동의 ${consent} · 30개 구단과 30일 협상 · 계약 가능성 ${chanceLabel(postingChance(player, "MLB", bomb))}`,
      },
      { id: "NPB", label: "NPB 이적 요청", detail: `구단 동의 ${consent} · 계약 가능성 ${chanceLabel(postingChance(player, "NPB", bomb))}` },
      { id: "stay", label: "올해는 팀에 남는다", detail: "다음 비시즌에 다시 요청할 수 있어요" },
    ],
  });
}

function resolvePosting(player, choice, option) {
  if (option.id === "stay") return [`${player.name}, 해외 진출 대신 ${player.team} 잔류 선택`];
  const league = option.id;
  if (Math.random() > consentChance(player, choice.boost)) {
    changeFame(player, 2);
    return [`${player.team}, ${player.name} ${league === "MLB" ? "포스팅" : "해외 이적"} 불허… "아직 함께해야 할 선수"`];
  }
  if (Math.random() > postingChance(player, league, choice.boost)) {
    changeFame(player, -2);
    return [
      `${player.name}, ${LEAGUES[league].name} 진출 무산… ${league === "MLB" ? "30일 협상 기간 안에 계약 못 해" : "조건이 맞는 팀이 없어"} ${player.team} 복귀`,
    ];
  }
  const ovr = getOvrs(player).best;
  const count = ovr >= 72 ? 3 : ovr >= 68 ? 2 : 1;
  const teams = shuffle(TEAMS[league]).slice(0, count);
  const offers = teams.map((t) => makeOffer(player, league, t, 0.85));
  pushChoiceFirst(player, {
    key: "postingOffer",
    text: `${league === "MLB" ? "포스팅이 공시됐고" : "구단 동의를 받았고"} ${offers.length}개 구단이 계약을 제안했어요! 포스팅 비용은 데려가는 팀이 원소속팀 ${player.team}에 내요.`,
    options: [
      ...offers.map((o, i) => ({
        id: `p${i}`,
        label: `${o.team} (${LEAGUES[o.league].name})`,
        detail: `${o.years}년 총액 ${fmtMoney(o.total)} · 연봉 ${fmtMoney(o.salary)} · ${league === "MLB" ? "포스팅 비용" : "이적료"} ${fmtMoney(postingFee(o.total))}`,
        offer: o,
      })),
      { id: "decline", label: "조건이 아쉬워 잔류", detail: "팀으로 돌아가요" },
    ],
  });
  return [`${player.name}, ${LEAGUES[league].name} 진출 도전… 협상 테이블 차려졌다`];
}

function resolvePostingOffer(player, choice, option) {
  if (!option.offer) return [`${player.name}, 해외 제안 고사… "${player.team}에서 더 증명하겠다"`];
  const o = option.offer;
  const oldTeam = player.team;
  signContract(player, o);
  player.kboRights = oldTeam; // 나중에 KBO로 돌아오면 원소속팀으로만 복귀할 수 있음
  return [
    `${player.name}, ${o.team}과 ${o.years}년 총액 ${fmtMoney(o.total)} 계약… 꿈의 무대로`,
    `${oldTeam}, ${o.league === "MLB" ? "포스팅 비용" : "이적료"} ${fmtMoney(postingFee(o.total))} 받는다`,
  ];
}

// ---------------------------------------------
// 3. MLB 서비스타임: 6년 전에 계약이 끝나면 구단이 권리를 가짐
// ---------------------------------------------
function mlbContractEnd(player, report) {
  const years = player.mlbService || 0;
  if (years >= FA_RULES.mlbFA) {
    pushChoice(player, faChoice(player, `MLB 서비스타임 ${years}년을 채워 FA가 됐어요! 30개 구단과 KBO 모두 협상할 수 있어요.`));
    return;
  }
  const ovr = getOvrs(player).best;
  if (ovr < LEAGUES.MLB.level - 6) {
    // 논텐더: 연봉조정 대신 풀어줌 → 자유계약
    report.specials.push({ key: "nontender", team: player.team });
    pushChoice(
      player,
      faChoice(player, `서비스타임 ${years}년이라 아직 FA가 아니지만, 구단이 연봉조정 대신 논텐더(방출)를 택했어요. 자유롭게 팀을 고를 수 있어요.`),
    );
    return;
  }
  let salary;
  if (years < FA_RULES.mlbArb) {
    salary = Math.round(minSalary("MLB", player) * 1.15); // 연봉조정 전: 최저 연봉 근처
    report.specials.push({ key: "preArb", years, salary: fmtMoney(salary) });
  } else {
    // 연봉조정: 시장가의 40% / 60% / 80% (3·4·5년차), 지난 연봉의 80% 밑으로는 안 깎임
    const share = { 3: 0.4, 4: 0.6, 5: 0.8 }[years] || 0.8;
    salary = Math.max(Math.round(marketValue(player, "MLB") * share), Math.round(player.contract.salary * 0.8));
    report.specials.push({ key: "arbitration", years, salary: fmtMoney(salary) });
  }
  player.contract = { ...makeContract("MLB", player.team, 1, salary, 0), isFA: true, arb: true };
  if (years >= FA_RULES.mlbArb) maybeArbitration(player, report, "mlb"); // 금액 차이 나면 청문회 (contract.js)
}

// ---------------------------------------------
// 4. 대학 진학과 드래프트
// ---------------------------------------------
// 드래프트 지명 기준 점수 (능력치 + 학교 + 졸업반 성적 + 전국대회 성적)
const DRAFT_LINE = { HS: 56, COLLEGE: 57, INDIE: 60, ABL: 60 };
// 이 능력치(OVR)면 점수와 상관없이 지명됨 (어지간하면 뽑히는 선)
const DRAFT_SURE = { HS: 52, COLLEGE: 54 };

function isDrafted(player, score) {
  return score >= DRAFT_LINE[player.league] || getOvrs(player).best >= DRAFT_SURE[player.league];
}

function draftRound(score, base) {
  return clamp(1 + Math.floor((base - score) / 1.2), 1, 11);
}

function draftBonus(player, round) {
  return Math.round(MONEY.draftBonus[round - 1] * priceIndex(player) * (0.8 + Math.random() * 0.4));
}

// 고교 졸업 때: 지명되면 입단할지 대학에 갈지 고름
function hsDraft(player, report) {
  const score = draftScore(player, report);
  if (isDrafted(player, score)) {
    const round = draftRound(score, 70);
    const team = pick(TEAMS.KBO);
    const bonus = draftBonus(player, round);
    report.specials.push({ key: round === 1 ? "draftTop" : "draft", round, team, bonus: fmtMoney(bonus) });
    pushChoice(player, {
      key: "draftSign",
      round,
      team,
      bonus,
      text: `${team}${josaOf(team, "이")} ${round}라운드에 지명했어요! 바로 프로에 갈까요, 지명을 거부하고 대학에 갈까요?`,
      options: [
        { id: "sign", label: `${team} 입단`, detail: `계약금 ${fmtMoney(bonus)} · FA까지 1군 ${FA_RULES.hsGrad}시즌` },
        { id: "college", label: "지명 거부하고 대학 진학", detail: `4년 뒤 대졸 드래프트 재도전 · 대졸은 FA까지 1군 ${FA_RULES.collegeGrad}시즌` },
      ],
    });
  } else {
    report.specials.push({ key: "undrafted" });
    pushChoice(player, undraftedChoice(true));
  }
  maybeMlbDirect(player, report); // 아주 드물게 미국 구단 직행 제안 (world.js)
}

function undraftedChoice(canCollege) {
  const options = [];
  if (canCollege) options.push({ id: "COLLEGE", label: "대학에 진학한다", detail: "4년간 대학야구 · 졸업 후 대졸 드래프트" });
  options.push(
    { id: "INDIE", label: "국내 독립리그에서 재도전" },
    { id: "ABL", label: "호주리그로 건너가 경험 쌓기" },
    { id: "retire", label: "야구를 그만둔다" },
  );
  return { key: "undrafted", text: "드래프트에서 이름이 불리지 않았어요. 어디서 다시 도전할까요?", options };
}

// 대학 4학년이 끝나면 대졸 드래프트
function collegeDraft(player, report) {
  player.collegeGrad = true;
  const score = draftScore(player, report);
  if (isDrafted(player, score)) {
    const round = draftRound(score, 68);
    const team = pick(TEAMS.KBO);
    const bonus = draftBonus(player, round);
    report.specials.push({ key: round === 1 ? "draftTop" : "draft", round, team, bonus: fmtMoney(bonus) });
    signDraft(player, round, team, bonus);
    if (player.league === "KBO") report.specials.push({ key: "openingRoster", team });
  } else {
    report.specials.push({ key: "undrafted" });
    pushChoice(player, undraftedChoice(false));
  }
}

// 대학 진학: 고교 성적(드래프트 점수)에 맞는 대학들이 체육특기자로 데려가려 함
function collegeOffers(player) {
  const last = player.lastReport && player.lastReport.league === "HS" ? player.lastReport : { WAR: 0 };
  const score = draftScore(player, last);
  const tiers = score >= 54 ? [3, 3, 2] : score >= 49 ? [3, 2, 2] : score >= 44 ? [2, 2, 1] : score >= 38 ? [2, 1, 1] : [1, 1];
  const picked = [];
  for (const t of tiers) {
    const pool = COLLEGES.filter((c) => c.tier === t && !picked.includes(c));
    if (pool.length) picked.push(pick(pool));
  }
  return { score, list: picked };
}

const TIER_LABEL = { 3: "야구 명문", 2: "중위권", 1: "신생·하위권 (출전 기회 많음)" };

function enterCollege(player) {
  const { score, list } = collegeOffers(player);
  pushChoiceFirst(player, {
    key: "collegePick",
    text: `🎓 대학 야구부들이 체육특기자 입학을 제안했어요. (고교 성적 점수 ${score}) 어디로 갈까요?`,
    options: list.map((c) => ({
      id: c.name,
      label: `${c.name} 입학`,
      detail: `${TIER_LABEL[c.tier]} · ${LEAGUE_GROUPS.COLLEGE.find((g) => g.teams.includes(c.name)).name}${c.tier === 3 ? " · 주전 경쟁 치열하지만 팀이 강해요" : c.tier === 1 ? " · 1학년부터 주전 가능" : ""}`,
    })),
  });
}

function joinCollege(player, name) {
  const c = COLLEGES.find((x) => x.name === name) || COLLEGES[0];
  player.league = "COLLEGE";
  player.team = c.name;
  player.college = c.name;
  player.collegeTier = c.tier;
  player.contract = null;
  return [`${player.name}, ${c.name} 체육특기자 입학… "4년 뒤 1라운드로 돌아오겠다"`];
}

function signDraft(player, round, team, bonus) {
  // 류현진처럼 이미 1군 실력이면 바로 개막 엔트리
  const ready = getOvrs(player).best >= LEAGUES.KBO.level - 4;
  player.league = ready ? "KBO" : "KBO2";
  player.team = team;
  player.draftRound = round;
  player.contract = makeContract(player.league, team, 1, minSalary(player.league, player), 0);
  addMoney(player, bonus);
  if (ready) player.openingRoster = true;
  if (player.type === "twoway") {
    pushChoice(player, {
      key: "twoway",
      text: `${team} 코칭스태프가 묻습니다. "프로에서도 이도류를 계속할 건가?"`,
      options: [
        { id: "keep", label: "이도류 유지 (힘들지만 대박 가능)" },
        { id: "batter", label: "타자에 전념" },
        { id: "pitcher", label: "투수에 전념" },
      ],
    });
  }
}

function resolveDraftSign(player, choice, option) {
  if (option.id === "college") {
    enterCollege(player);
    return [`${player.name}, ${choice.team} 지명 거부… 대학 진학 결심 "더 성장해서 오겠다"`];
  }
  signDraft(player, choice.round, choice.team, choice.bonus);
  const news = [`${player.name}, ${choice.team} 입단 계약… 계약금 ${fmtMoney(choice.bonus)}`];
  if (player.league === "KBO") news.push(fillText(NEWS.special.openingRoster, player, { team: choice.team }));
  return news;
}

function resolveRulesChoice(player, choice, option) {
  if (choice.key === "posting") return resolvePosting(player, choice, option);
  if (choice.key === "postingOffer") return resolvePostingOffer(player, choice, option);
  if (choice.key === "draftSign") return resolveDraftSign(player, choice, option);
  if (choice.key === "collegePick") return joinCollege(player, option.id);
  return [];
}

// 예전 저장 데이터: 1군 시즌 수를 기록에서 다시 셈
function initRules(player) {
  if (player.kboService === undefined) {
    player.kboService = player.history.filter((h) => h.league === "KBO").length;
    if (player.contract && player.contract.isFA && player.league === "KBO") {
      player.faCount = 1;
      player.lastFaService = player.kboService;
    }
  }
  if (player.mlbService === undefined) player.mlbService = player.history.filter((h) => h.league === "MLB").length;
}

// 스카우트 평가 (훈련 탭에 보여줌): 지금 실력과 지난 시즌 성적으로 계산한 드래프트 점수
function draftOutlook(player) {
  if (!isAmateur(player.league)) return null;
  const last = player.lastReport && isAmateur(player.lastReport.league) ? player.lastReport : { WAR: 0 };
  const score = draftScore(player, last);
  const line = DRAFT_LINE[player.league];
  const round = isDrafted(player, score) ? draftRound(Math.max(score, line), player.league === "HS" ? 70 : 68) : null;
  return { score, line, round, sure: DRAFT_SURE[player.league], mlb: player.league === "HS" && getOvrs(player).best >= 60 && score >= 72 };
}

// 독립리그·호주리그에서 프로로: 점수가 높으면 드래프트, 조금 모자라면 육성선수 계약
function indieToPro(player, report) {
  const score = draftScore(player, report);
  const line = DRAFT_LINE[player.league] || 60;
  const draftAge = player.age <= (player.overseasReturn ? 27 : 25);
  if (draftAge && score >= line + 4) {
    const round = draftRound(score, 72);
    const team = pick(TEAMS.KBO);
    const bonus = draftBonus(player, round);
    report.specials.push({ key: "draft", round, team, bonus: fmtMoney(bonus) });
    signDraft(player, round, team, bonus);
    if (player.league === "KBO") report.specials.push({ key: "openingRoster", team });
  } else if (score >= line) {
    // 육성선수: 계약금 없이 2군에서 시작 (정식 선수 등록은 실력으로)
    const team = pick(TEAMS.KBO);
    player.league = "KBO2";
    player.team = team;
    player.trainee = true;
    player.contract = makeContract("KBO2", team, 1, minSalary("KBO2", player), 0);
    report.specials.push({ key: "trainee", team });
  }
}
