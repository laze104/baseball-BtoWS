// =============================================
// hof.js : 명예의 전당
// 은퇴 5년 뒤부터 최대 10번 투표, 75% 이상이면 헌액, 5% 미만이면 탈락
// 선수가 바뀌어도 브라우저에 계속 남음
// =============================================

const HOF_KEY = "baseball-hof";

function hofScore(player) {
  const t = careerTotals(player);
  let score = t.WAR;
  score += countAward(player, "MVP") * 8;
  score += countAward(player, "시리즈 우승") * 2;
  score += countAward(player, "최우수선수") * 2;
  score += countAward(player, "골든글러브") + countAward(player, "베스트나인");
  score += countAward(player, "금메달") * 2;
  score += countAward(player, "WBC 우승") * 3 + countAward(player, "WBC 준우승");
  score += Object.keys(TITLE_NAMES).reduce((s, k) => s + countAward(player, TITLE_NAMES[k]), 0);
  if (t.HR >= 500) score += 15;
  else if (t.HR >= 400) score += 8;
  if (t.H >= 3000) score += 15;
  else if (t.H >= 2500) score += 8;
  if (t.W >= 200) score += 15;
  else if (t.W >= 150) score += 8;
  if (t.SV >= 400) score += 12;
  else if (t.SV >= 300) score += 6;
  score += (player.fame || 0) / 10; // 인성 논란은 표를 깎음
  return score;
}

// 득표율: 점수 82면 50%, 91이면 약 75% (통산 WAR 60 + MVP 2회 + 타이틀 몇 개 정도)
function hofVote(score) {
  return 100 / (1 + Math.exp(-(score - 82) / 8));
}

function runHofVote(player) {
  // 후보 자격: 프로(KBO 1·2군, NPB, MLB)에서 10시즌 이상
  const proYears = player.history.filter((h) => PRO_LEAGUES.includes(h.league)).length;
  if (player.banned) {
    player.hof = { eligible: false, banned: true, proYears, inducted: false, ballots: [] }; // 제명 = 후보 자격 없음
    return player.hof;
  }
  if (proYears < 10) {
    player.hof = { eligible: false, proYears, inducted: false, ballots: [] };
    return player.hof;
  }
  const score = hofScore(player);
  let pct = hofVote(score) + randomInt(-4, 4);
  const ballots = [];
  const firstYear = gameYear(player) + 5;
  for (let ballot = 1; ballot <= 10; ballot++) {
    pct = clamp(pct, 0, 99.5);
    ballots.push({ year: firstYear + ballot - 1, pct: round(pct, 1) });
    if (pct >= 75 || pct < 5) break;
    pct += randomInt(-3, 4); // 해가 갈수록 재평가 받기도 함
  }
  const last = ballots[ballots.length - 1];
  const result = {
    inducted: last.pct >= 75,
    dropped: last.pct < 5,
    ballot: ballots.length,
    year: last.year,
    pct: last.pct,
    eligible: true,
    ballots,
  };
  player.hof = result;
  if (result.inducted) {
    const hall = loadHof();
    const t = careerTotals(player);
    hall.push({
      name: player.name,
      nickname: player.nickname || "",
      type: player.type,
      year: result.year,
      pct: result.pct,
      ballot: result.ballot,
      WAR: t.WAR,
      HR: t.HR,
      AVG: t.AVG,
      W: t.W,
      SV: t.SV,
      ERA: t.ERA,
      MVP: countAward(player, "MVP"),
      team: player.franchise || player.team,
    });
    saveJSON(HOF_KEY, hall);
  }
  return result;
}

function loadHof() {
  return loadJSON(HOF_KEY, []);
}
