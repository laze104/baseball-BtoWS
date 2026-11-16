// =============================================
// rival.js : 라이벌 (같은 해에 태어난 경쟁자)
// 내 커리어와 나란히 해마다 성적이 쌓이고 팀을 옮김
// =============================================

function createRival(player) {
  const type = player.type === "twoway" ? pick(["batter", "pitcher"]) : player.type;
  const schools = HIGH_SCHOOLS.filter((s) => s.level >= 2 && s.name !== player.school);
  const style = pick(Object.keys(STYLES[type]));
  const rival = {
    name: pick(RIVAL_NAMES.filter((n) => n !== player.name)),
    type,
    position: pick(POSITIONS[type]),
    style,
    school: pick(schools).name,
    age: player.age,
    league: "HS",
    owned: [],
    awards: {},
    history: [],
    retired: false,
    growthType: rollGrowthType(),
  };
  rival.team = rival.school;
  // 라이벌은 처음부터 조금 더 재능 있는 선수임
  rival.stats = rollStats(type, style);
  for (const key of Object.keys(rival.stats)) rival.stats[key] = clamp(rival.stats[key] + 3, 1, 99);
  // 이미 프로에 간 예전 저장 데이터: 라이벌도 비슷한 실력으로 프로에서 시작
  if (player.age >= 19) {
    for (const key of Object.keys(rival.stats)) {
      if (player.stats[key] !== undefined) rival.stats[key] = clamp(player.stats[key] + randomInt(-5, 5), 1, 99);
    }
    rival.league = getOvrs(rival).best >= LEAGUES.KBO.level - 3 ? "KBO" : "KBO2";
    rival.team = pick(TEAMS.KBO);
  }
  rival.bestOvr = getOvrs(rival).best;
  return rival;
}

// 라이벌 기록 한 줄 요약
function rivalLine(rec, isBatter) {
  if (!rec || !rec.G) return "부상으로 시즌 아웃";
  if (isBatter) return `타율 ${fmtRate(rec.AVG)} ${rec.HR}홈런 OPS ${fmtRate(rec.OPS)}`;
  if (rec.SV >= 10) return `${rec.SV}세이브 평균자책 ${rec.ERA.toFixed(2)}`;
  return `${rec.W}승 ${rec.L}패 평균자책 ${rec.ERA.toFixed(2)}`;
}

function rivalSeason(player, report) {
  const r = player.rival;
  if (!r || r.retired) return;
  const league = LEAGUES[r.league];
  const ovr = getOvrs(r).best;
  const injured = Math.random() < 0.08 ? 0.5 : 1;
  const mod = randomInt(-4, 4);

  let rec;
  if (r.type === "batter") {
    const plan = batterPlan(r, ovr);
    rec = simBattingSeason(r.stats, league.level, Math.round(plan.games * injured), plan.pa, mod, r.position, LEAGUE_ENV[r.league]);
  } else {
    const plan = pitcherPlan(r, ovr);
    rec = simPitchingSeason(r.stats, league.level, plan.role, Math.round(plan.games * injured), mod, LEAGUE_ENV[r.league]);
  }
  const line = rivalLine(rec, r.type === "batter");

  // 라이벌 수상과 우승 (간단하게)
  const awards = [];
  if (AWARD_LINE[r.league] && rec.WAR >= AWARD_LINE[r.league].war * 0.9 && Math.random() < 0.5) awards.push(`${r.league} MVP`);
  if (CHAMPIONSHIP[r.league] && Math.random() < 0.1) awards.push(CHAMPIONSHIP[r.league]);
  for (const a of awards) r.awards[a] = (r.awards[a] || 0) + 1;

  r.history.push({ year: report.year, age: r.age, league: r.league, team: r.team, WAR: rec.WAR, line, awards });

  // 성장: 포지션 핵심 능력치 2개를 훈련함
  const keys = Object.keys(r.stats);
  const focus = pickMany(POSITION_FOCUS[r.position] || keys, 2);
  growPlayer(r, focus, { WAR: rec.WAR, events: [] });
  r.age += 1;
  r.bestOvr = Math.max(r.bestOvr, getOvrs(r).best);

  report.rival = { name: r.name, league: r.league, team: r.team, line, WAR: rec.WAR, ovr, awards };

  // 나와 비교 (나도 경기에 나갔을 때만)
  const myWar = report.WAR || 0;
  if (report.bat || report.pit) {
    const diff = myWar - rec.WAR;
    if (r.league === player.league || Math.abs(diff) >= 1.5) {
      report.specials.push({ key: diff >= 0 ? "rivalWin" : "rivalLose", rival: r.name, rivalLine: line });
    }
  }
  moveRival(player, r, report);
}

function moveRival(player, r, report) {
  const ovr = getOvrs(r).best;
  const from = r.league;
  if (r.league === "HS" && r.age >= 19) {
    if (ovr + randomInt(0, 8) >= 52) {
      r.league = "KBO2";
      r.team = pick(TEAMS.KBO);
    } else {
      r.league = "INDIE";
      r.team = pick(TEAMS.INDIE);
    }
  } else if (r.league === "INDIE") {
    if (ovr >= 50 && r.age <= 25) {
      r.league = "KBO2";
      r.team = pick(TEAMS.KBO);
    }
  } else if (r.league === "KBO2") {
    if (ovr >= LEAGUES.KBO.level - 3) r.league = "KBO";
  } else if (r.league === "KBO") {
    if (ovr < LEAGUES.KBO.level - 10) r.league = "KBO2";
    else if (r.age >= 27 && ovr >= 72 && Math.random() < 0.35) {
      r.league = "MLB";
      r.team = pick(TEAMS.MLB);
    } else if (r.age >= 27 && ovr >= 67 && Math.random() < 0.25) {
      r.league = "NPB";
      r.team = pick(TEAMS.NPB);
    }
  } else if (r.league === "NPB" || r.league === "MLB") {
    if (ovr < LEAGUES[r.league].level - 10) {
      r.league = "KBO";
      r.team = pick(TEAMS.KBO);
    }
  }
  if (r.league !== from && (r.league === "MLB" || r.league === "NPB" || (from === "HS" && r.league === "KBO2"))) {
    report.specials.push({ key: "rivalMove", rival: r.name, rivalTeam: r.team });
  }

  const mustRetire = r.age >= 41 || (r.age >= 37 && ovr < 55) || (r.age >= 30 && ovr < 42) || (r.league === "INDIE" && r.age >= 27);
  if (mustRetire) {
    r.retired = true;
    report.specials.push({ key: "rivalRetire", rival: r.name });
  }
}

// 라이벌 통산 요약
function rivalSummary(r) {
  const pro = r.history.filter((h) => h.league !== "HS");
  return {
    WAR: round(
      pro.reduce((s, h) => s + h.WAR, 0),
      1,
    ),
    MVP: countAward(r, "MVP"),
    champs: countAward(r, "시리즈 우승"),
  };
}

// ---------------------------------------------
// 기사 문구
// ---------------------------------------------

Object.assign(NEWS.special, {
  rivalWin: "동갑내기 라이벌 대결, 올해는 {name}의 판정승… {rival|은} {rivalLine}",
  rivalLose: "라이벌 {rival}, {rivalLine}… {name} 자존심 상했다",
  rivalMove: "{name}의 라이벌 {rival}, {rivalTeam} 행 확정",
  rivalRetire: "{name}의 평생 라이벌 {rival}, 은퇴 선언",
});
