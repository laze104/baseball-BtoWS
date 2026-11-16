// =============================================
// cups.js : 고교 주말리그·전국대회(매년 5개)와 대학 대회
// =============================================

const HS_TOURNAMENTS = ["이마트배", "황금사자기", "청룡기", "대통령배", "봉황대기"];

// 우리 팀 전력: 학교 수준 + 내 실력 + 내 활약 (0.5 = 평균적인 팀)
function amateurStrength(player, report, level) {
  const ovr = getOvrs(player).best;
  const base = LEAGUES[player.league].level;
  return 0.5 + 0.07 * (level - 2) + clamp((ovr - base - 10) * 0.004, -0.05, 0.1) + clamp(report.WAR * 0.015, -0.03, 0.06);
}

// 탈락한 라운드 이름 (rounds = 우승까지 경기 수, i = 몇 번째 경기에서 졌는지)
function cupRoundName(rounds, i) {
  const fromEnd = rounds - 1 - i;
  return ["준우승", "4강", "8강", "16강", "32강"][fromEnd] || `${i + 1}회전 탈락`;
}

// 토너먼트 하나: 라운드가 올라갈수록 상대가 강해짐
function playCup(cup, strength, rounds) {
  for (let i = 0; i < rounds; i++) {
    const opp = 0.45 + (i / rounds) * 0.1 + (Math.random() - 0.5) * 0.12;
    const pWin = clamp(0.5 + (strength - opp) * 2, 0.12, 0.92);
    if (Math.random() >= pWin) return { wins: i, result: cupRoundName(rounds, i) };
  }
  return { wins: rounds, result: "우승" };
}

// 주말리그: 권역 학교들끼리 풀리그
function weekendLeague(player, strength, half) {
  const region = Object.keys(HS_REGIONS).find((r) => HS_REGIONS[r].includes(player.school)) || "서울";
  const schools = HS_REGIONS[region];
  const power = (name) => {
    if (name === player.school) return strength;
    const sc = HIGH_SCHOOLS.find((x) => x.name === name);
    return 0.5 + 0.07 * ((sc ? sc.level : 1) - 2) + (Math.random() - 0.5) * 0.1;
  };
  const p = Object.fromEntries(schools.map((n) => [n, power(n)]));
  const rec = Object.fromEntries(schools.map((n) => [n, { w: 0, l: 0 }]));
  for (let i = 0; i < schools.length; i++) {
    for (let j = i + 1; j < schools.length; j++) {
      const a = schools[i],
        b = schools[j];
      if (Math.random() < clamp(0.5 + (p[a] - p[b]) * 2, 0.1, 0.9)) {
        rec[a].w++;
        rec[b].l++;
      } else {
        rec[b].w++;
        rec[a].l++;
      }
    }
  }
  const order = [...schools].sort((a, b) => rec[b].w - rec[a].w || p[b] - p[a]);
  const rank = order.indexOf(player.school) + 1;
  return { half, region, rank, size: schools.length, w: rec[player.school].w, l: rec[player.school].l, qualified: rank <= Math.ceil(schools.length / 2) };
}

function playHsTournaments(player, report) {
  const school = HIGH_SCHOOLS.find((s) => s.name === player.school);
  const level = school ? school.level : 1;
  const strength = amateurStrength(player, report, level);
  report.hsLeague = [weekendLeague(player, strength, "전반기"), weekendLeague(player, strength, "후반기")];
  report.hsTournaments = [];
  HS_CUPS.forEach((cup, i) => {
    const name = cup.name;
    const lg = cup.qualify ? report.hsLeague.find((x) => x.half === cup.qualify) : null;
    if (lg && !lg.qualified) {
      report.hsTournaments.push({ name, result: "본선 진출 실패" });
      return;
    }
    const { result } = playCup(cup, strength, cup.rounds);
    report.hsTournaments.push({ name, result });
  });
  holdLastFinal(report, report.hsTournaments);
  for (const t of report.hsTournaments) {
    if (t.result !== "우승") continue;
    const award = `${t.name} 우승`;
    player.awards[award] = (player.awards[award] || 0) + 1;
    report.awards.push(award);
    report.specials.push({ key: "champion", award });
  }
}

// 그 해 마지막으로 오른 결승은 결과를 숨겨 두고, 내가 결정적 순간에서 직접 정함
// (그보다 앞선 대회 우승은 이미 끝난 일이라 그대로 보여줌)
function holdLastFinal(report, cups) {
  for (let i = cups.length - 1; i >= 0; i--) {
    if (cups[i].result === "우승" || cups[i].result === "준우승") {
      cups[i].result = "결승 진출";
      report.cupFinal = cups[i].name;
      return;
    }
  }
}

// 대학 대회: U-리그 왕중왕전(조 1~5위만), 전국대학야구선수권, 대통령기
function playCollegeTournaments(player, report) {
  const strength = amateurStrength(player, report, player.collegeTier || 2);
  const seed = report.standing ? report.standing.seed : 0;
  report.collegeCups = [];
  for (const cup of COLLEGE_CUPS) {
    if (cup.qualify && !seed) {
      report.collegeCups.push({ name: cup.name, result: "본선 진출 실패" });
      continue;
    }
    const { result } = playCup(cup, strength + (cup.qualify ? (6 - seed) * 0.01 : 0), cup.rounds);
    report.collegeCups.push({ name: cup.name, result });
  }
  holdLastFinal(report, report.collegeCups);
  for (const t of report.collegeCups) {
    if (t.result !== "우승") continue;
    const award = `${t.name} 우승`;
    player.awards[award] = (player.awards[award] || 0) + 1;
    report.awards.push(award);
    report.specials.push({ key: "champion", award });
  }
}

function hsTitles(player) {
  return HS_TOURNAMENTS.reduce((sum, name) => sum + (player.awards[`${name} 우승`] || 0), 0);
}
