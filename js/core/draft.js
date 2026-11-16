// =============================================
// draft.js : 신인 드래프트와 대학 진학
// 고3·대4 시즌이 끝나면 지명 여부를 정함 (career.js moveCareer 에서 부름)
// =============================================

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
  maybeMlbDirect(player, report); // 아주 드물게 미국 구단 직행 제안 (minors.js)
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

// ---------------------------------------------
// 기사 문구
// ---------------------------------------------

Object.assign(NEWS.special, {
  trainee: "{name}, {team} 육성선수 계약… 독립리그 출신 신화 쓸까",
  openingRoster: "{name}, 신인 개막 엔트리 합류! {team} 1군에서 바로 데뷔",
});
