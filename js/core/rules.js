// =============================================
// rules.js : 실제 규정을 따르는 부분
// 1. KBO FA (1군 등록 시즌·등록일수, 재자격, A/B/C 등급)
// 2. 포스팅 (KBO → MLB, NPB)
// 3. MLB 서비스타임 (연봉조정, 논텐더, FA)
// 드래프트·대학 진학은 draft.js
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

// ---------------------------------------------
// 1. KBO FA
// ---------------------------------------------

function kboFaNeeded(player) {
  return player.collegeGrad ? FA_RULES.collegeGrad : FA_RULES.hsGrad;
}

// 1군에 145일 이상 등록된 시즌만 FA 시즌으로 쳐줌 (2군, 상무, 해외는 제외)
function countKboService(player, report) {
  if (report.league === "KBO2" && report.minorLine && report.minorLine.up) bankCallupDays(player, report); // 시즌 중 콜업 (roster.js)
  if (report.league !== "KBO") return;
  const full = report.regDays !== undefined ? report.regDays >= FA_DAYS : (report.gameFactor || 1) >= FA_RULES.serviceShare;
  if (full) {
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
    // 부상 때문이면 크게 알려줌 (아래 serviceShortNotice), 아니면 기사만
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

// 1군 등록일수 (시즌 186일 기준, 145일 넘어야 FA 1시즌 인정)
const KBO_SEASON_DAYS = 186;
function registeredDays(report) {
  if (report.regDays !== undefined) return report.regDays; // 4구간 시즌은 날짜로 셈 (injury.js)
  return Math.round(KBO_SEASON_DAYS * (report.gameFactor || 1));
}

// 부상 때문에 등록일수 못 채우면 크게 알려줌
function serviceShortNotice(player, report, days) {
  if (!report.injury || (report.downDays || 0) > (report.injDays || 0)) return false; // 2군 때문이면 기사만
  report.specials.push({ key: "serviceInjury", days });
  report.bigMoments = report.bigMoments || [];
  const left = seasonsToFa(player);
  report.bigMoments.push({
    tone: "bad",
    kicker: "1군 등록일수 부족",
    title: "⏳ FA가 늦어질 수 있어요",
    lines: [
      `부상으로 1군 등록 ${days}일 (기준 145일)`,
      `이번 시즌은 FA 시즌으로 안 쳐줌 · FA까지 1군 ${left}시즌 남음`,
      `모자란 일수는 쌓아 뒀다가 145일 차면 1시즌으로 인정 (지금 ${player.kboDaysBank || 0}일)`,
    ],
  });
  return true;
}

// ---------------------------------------------
// 2. 포스팅
// ---------------------------------------------

// - 1군 등록 7시즌 + 구단 동의
// - MLB 30개 구단과 30일 동안 협상, 못 하면 복귀 (다음 비시즌에 다시 가능)
// - 포스팅 비용: 보장액 2,500만 달러까지 20%, 다음 2,500만 달러 17.5%, 그 위 15%
// - NPB는 KBO와 공식 포스팅 협정이 없어서 구단 동의를 받아 이적함
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

function chanceLabel(p) {
  if (p >= 0.6) return "높음";
  if (p >= 0.35) return "보통";
  if (p >= 0.15) return "낮음";
  return "매우 낮음";
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
// 선택지 처리
// ---------------------------------------------

function resolveRulesChoice(player, choice, option) {
  if (choice.key === "posting") return resolvePosting(player, choice, option);
  if (choice.key === "postingOffer") return resolvePostingOffer(player, choice, option);
  if (choice.key === "draftSign") return resolveDraftSign(player, choice, option);
  if (choice.key === "collegePick") return joinCollege(player, option.id);
  return [];
}

// ---------------------------------------------
// 기사·댓글 문구
// ---------------------------------------------

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

Object.assign(NEWS.special, {
  postingFail: "{name}, {league} 포스팅 무응찰… {team} 잔류",
  postingWin: "{name}, 포스팅 성공! {team|과} {years}년 총액 {total} 계약",
});
