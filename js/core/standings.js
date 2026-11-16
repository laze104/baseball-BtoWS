// =============================================
// standings.js : 팀 순위와 포스트시즌 진출, 우승 판정
// 지구·리그별로 순위를 매기고, 그 결과를 시즌 기록에 같이 저장함
// =============================================

// ---------------------------------------------
// 1. 순위
// ---------------------------------------------

function groupOf(lg, team) {
  const groups = LEAGUE_GROUPS[lg];
  return groups ? groups.find((g) => g.teams.includes(team)) || null : null;
}

// 포스트시즌 시드: 팀 이름 → 시드 번호
function postseasonSeeds(lg, all) {
  const seeds = {};
  const byWins = (a, b) => b.w - a.w;
  if (lg === "KBO2" || lg === "SANGMU") {
    // 퓨처스: 북부·남부리그 1·2위가 챔피언결정전 (준결승 → 단판 결승)
    for (const g of LEAGUE_GROUPS.KBO2) {
      all
        .filter((t) => g.teams.includes(t.team))
        .sort(byWins)
        .slice(0, 2)
        .forEach((t, i) => (seeds[t.team] = i + 1));
    }
  } else if (lg === "INDIE") {
    // 경기도 독립리그: 1위 챔피언결정전 직행, 2·3위 플레이오프
    [...all]
      .sort(byWins)
      .slice(0, 3)
      .forEach((t, i) => (seeds[t.team] = i + 1));
  } else if (lg === "COLLEGE") {
    // U-리그: 조마다 상위 4팀 왕중왕전 진출
    for (const g of LEAGUE_GROUPS.COLLEGE) {
      all
        .filter((t) => g.teams.includes(t.team))
        .sort(byWins)
        .slice(0, 4)
        .forEach((t, i) => (seeds[t.team] = i + 1));
    }
  } else if (lg === "ABL") {
    // 호주리그: 6팀 중 1~4위 플레이오프
    [...all]
      .sort(byWins)
      .slice(0, 4)
      .forEach((t, i) => (seeds[t.team] = i + 1));
  } else if (lg === "KBO") {
    // 정규시즌 1~5위 (와일드카드 결정전부터)
    [...all]
      .sort(byWins)
      .slice(0, 5)
      .forEach((t, i) => (seeds[t.team] = i + 1));
  } else if (lg === "NPB") {
    // 리그별 1~3위 클라이맥스 시리즈
    for (const g of LEAGUE_GROUPS.NPB) {
      all
        .filter((t) => g.teams.includes(t.team))
        .sort(byWins)
        .slice(0, 3)
        .forEach((t, i) => (seeds[t.team] = i + 1));
    }
  } else if (lg === "MLB") {
    // 리그별: 지구 우승 3팀(1~3번 시드) + 와일드카드 3팀(4~6번 시드)
    for (const name of ["아메리칸리그", "내셔널리그"]) {
      const divs = LEAGUE_GROUPS.MLB.filter((g) => g.league === name);
      const winners = divs.map((g) => all.filter((t) => g.teams.includes(t.team)).sort(byWins)[0]).sort(byWins);
      const rest = all
        .filter((t) => divs.some((g) => g.teams.includes(t.team)) && !winners.includes(t))
        .sort(byWins)
        .slice(0, 3);
      [...winners, ...rest].forEach((t, i) => (seeds[t.team] = i + 1));
    }
  }
  return seeds;
}

// 팀 승률: 시즌 전력(시즌마다 한 번 굴림) + 내 활약 + 감독·FA 보너스
// war: 시즌 전체 페이스로 본 내 WAR
function teamPct(player, report, team, lg, war) {
  if (!report.teamBase) report.teamBase = {};
  if (report.teamBase[team] === undefined) report.teamBase[team] = (Math.random() + Math.random() - 1) * 0.12;
  let pct = 0.5 + report.teamBase[team];
  if (lg === "COLLEGE") pct += ((COLLEGES.find((c) => c.name === team) || { tier: 2 }).tier - 2) * 0.06; // 대학은 야구부 전력 차이가 큼
  if (team === player.team) pct += war * 0.006; // 내 활약이 팀 승률에 보탬
  if (lg === "KBO" && player.managers && player.managers[team] && player.managers[team].legend) pct += 0.015; // 레전드 감독 효과
  pct += standingBonus(player, team, lg, report.year); // 우승 전력 FA, 선수단 미팅, 신생구단 (flow.js)
  return pct;
}

// 전반기 순위 (phases.js). 후반기 끝나면 teamStanding 이 여기에 이어서 계산함
function halfStanding(player, report) {
  const lg = player.league;
  const teams = TEAMS[lg];
  if (lg === "MILB" || !teams || !teams.includes(player.team)) return null;
  const games = STANDING_GAMES[lg] || LEAGUES[lg].games;
  const g1 = Math.round(games / 2);
  const table = teams.map((team) => {
    const pct = teamPct(player, report, team, lg, report.WAR * 2) + (Math.random() - 0.5) * 0.06;
    const w = Math.round(g1 * clamp(pct, 0.3, 0.7));
    return { team, w, l: g1 - w };
  });
  report.half1Table = table;
  report.half1WAR = report.WAR;
  const group = groupOf(lg, player.team);
  const view = (group ? table.filter((t) => group.teams.includes(t.team)) : table).slice().sort((a, b) => b.w - a.w);
  const rank = view.findIndex((t) => t.team === player.team) + 1;
  return { rank, teams: view.length, w: view[rank - 1].w, l: view[rank - 1].l, table: view, group: group ? group.name : null };
}

function teamStanding(player, report) {
  const lg = player.league;
  if (lg === "MILB") return; // 마이너리그는 순위표 생략
  const teams = TEAMS[lg];
  if (!teams || !teams.includes(player.team)) return;
  const games = STANDING_GAMES[lg] || LEAGUES[lg].games;
  let all;
  if (report.half1Table) {
    // 전반기 성적 + 후반기 (phases.js). 트레이드됐으면 후반기 내 활약은 새 팀 몫
    const war2 = report.WAR - (report.half1WAR || 0);
    all = teams.map((team) => {
      const h = report.half1Table.find((t) => t.team === team) || { w: 0, l: 0 };
      const g2 = games - h.w - h.l;
      const pct = teamPct(player, report, team, lg, war2 * 2) + (Math.random() - 0.5) * 0.06;
      const w2 = Math.round(g2 * clamp(pct, 0.3, 0.7));
      return { team, w: h.w + w2, l: h.l + g2 - w2 };
    });
  } else {
    all = teams.map((team) => {
      const w = Math.round(games * clamp(teamPct(player, report, team, lg, report.WAR), 0.3, 0.7));
      return { team, w, l: games - w };
    });
  }
  const seeds = postseasonSeeds(lg, all);
  const group = groupOf(lg, player.team);
  const table = (group ? all.filter((t) => group.teams.includes(t.team)) : all).sort((a, b) => b.w - a.w);
  table.forEach((t) => (t.seed = seeds[t.team] || 0));
  const rank = table.findIndex((t) => t.team === player.team) + 1;
  const mine = table[rank - 1];
  report.standing = {
    rank,
    teams: table.length,
    w: mine.w,
    l: mine.l,
    table,
    group: group ? group.name : null,
    leagueName: group ? group.league : null,
    seed: mine.seed,
    psLabel:
      {
        KBO: "가을야구",
        NPB: "클라이맥스 시리즈",
        MLB: "포스트시즌",
        ABL: "플레이오프",
        KBO2: "챔피언결정전",
        SANGMU: "챔피언결정전",
        INDIE: "플레이오프",
        COLLEGE: "왕중왕전",
      }[lg] || null,
  };
  // 정규시즌 1위는 바로 알려줌 (포스트시즌 우승과는 따로)
  if (rank === 1 && lg !== "HS") {
    const award = `정규시즌 우승 (${group ? group.name : LEAGUES[lg].name})`;
    player.awards[award] = (player.awards[award] || 0) + 1;
    report.awards.push(award);
  }
  saveLeagueTable(player, report, all, seeds); // 역대 순위 탭용 (아래 3번)
  addMonthlyStandings(report.standing, games, report); // 월별 순위 그래프용 (아래 2번)
}

// 우승 (KBO·NPB·MLB): 포스트시즌 시리즈를 팀 전력(정규시즌 승률)과 내 활약으로 치름
// 시드가 높을수록 치를 시리즈가 적음 (1위 팀은 바로 한국시리즈 등)
const PS_ROUNDS = {
  KBO: [1, 2, 3, 4, 4], // 1위: 한국시리즈만, 5위: 와일드카드부터
  NPB: [2, 3, 3], // 리그 1위: CS 파이널 + 재팬시리즈
  MLB: [3, 3, 4, 4, 4, 4], // 1·2번 시드: 와일드카드 시리즈 부전승
  ABL: [2, 2, 2, 2], // 준결승 시리즈 + 챔피언십 시리즈
  KBO2: [2, 2], // 준결승 + 단판 결승
  SANGMU: [2, 2],
  INDIE: [1, 2, 2], // 1위: 챔피언결정전 직행
};

function checkChampion(player, report) {
  const lg = player.league;
  const st = report.standing;
  if (!CHAMPIONSHIP[lg] || !PS_ROUNDS[lg] || !st || !st.seed) return;
  const rounds = PS_ROUNDS[lg][st.seed - 1] || 4;
  const myPct = st.w / (st.w + st.l);
  report.postseason = [];
  for (let r = 0; r < rounds; r++) {
    // 상대는 포스트시즌 팀 평균 정도 (승률 .560), 내 팀이 강할수록, 내가 잘할수록 유리
    const edge = (myPct - 0.56) * 2.5 + Math.max(0, report.WAR) * 0.01 + (r === rounds - 1 ? 0 : st.seed === 1 ? 0.04 : 0);
    const pWin = clamp(0.5 + edge, 0.25, 0.8);
    const won = Math.random() < pWin;
    report.postseason.push({ round: rounds - r, won, pWin: Math.round(pWin * 100) });
    if (!won) return;
  }
  player.awards[CHAMPIONSHIP[lg]] = (player.awards[CHAMPIONSHIP[lg]] || 0) + 1;
  report.awards.push(CHAMPIONSHIP[lg]);
  report.specials.push({ key: "champion", award: CHAMPIONSHIP[lg] });
}

// ---------------------------------------------
// 2. 월별 순위 (그래프용)
// ---------------------------------------------

const SEASON_MONTHS = [4, 5, 6, 7, 8, 9];

function addMonthlyStandings(standing, games, report) {
  // 호주리그는 겨울(11~1월) 리그, 대학 U-리그는 4~5월 조별리그
  const MONTHS = report.league === "ABL" ? [11, 12, 1] : report.league === "COLLEGE" ? [4, 5] : SEASON_MONTHS;
  const n = MONTHS.length;
  const perMonth = games / n;
  const order = standing.table.map((t) => t.team);
  const wins = {};
  for (const t of standing.table) {
    const pct = t.w / games;
    // 달마다 승률이 출렁이지만 시즌 합계는 실제 성적과 같음
    const shares = MONTHS.map(() => clamp(pct + (Math.random() + Math.random() - 1) * 0.18, 0.15, 0.85) * perMonth);
    const scale = t.w / shares.reduce((s, x) => s + x, 0);
    let acc = 0;
    wins[t.team] = shares.map((x) => Math.round((acc += x * scale)));
    wins[t.team][n - 1] = t.w;
  }
  const ranks = {};
  order.forEach((t) => (ranks[t] = []));
  for (let m = 0; m < n; m++) {
    const sorted = [...order].sort((a, b) => wins[b][m] - wins[a][m] || order.indexOf(a) - order.indexOf(b));
    sorted.forEach((t, i) => ranks[t].push(i + 1));
  }
  standing.monthly = { months: MONTHS, ranks, wins, perMonth: Math.round(perMonth) };

  // 내 월별 성적 (타율 또는 평균자책)
  const rec = report.bat || report.pit;
  if (rec && rec.G) {
    const isBat = !!report.bat;
    const base = isBat ? rec.AVG : rec.ERA;
    // 계절 특성 있으면 그 시기에 몰아서 잘함 (splits.js makeSplits)
    const sp = report.splits && report.splits.f.length === n ? report.splits.f : null;
    const f = sp || MONTHS.map(() => 0.7 + Math.random() * 0.6);
    const mean = f.reduce((s, x) => s + x, 0) / n;
    const value = (x) => (sp && !isBat ? base / x : (base * x) / mean);
    standing.myMonthly = { label: isBat ? "월별 타율" : "월별 평균자책", isBat, values: f.map(value) };
  }
}

// ---------------------------------------------
// 3. 리그 전체 순위표 저장
// ---------------------------------------------

// 매 시즌 리그 전체 승패를 history 에 같이 저장함 (역대 순위 탭에서 씀)

function saveLeagueTable(player, report, all, seeds) {
  const st = report.standing;
  st.all = all.map((t) => [t.team, t.w, t.l, seeds[t.team] || 0]);
  // 우리 팀이 우승 못 하면 누가 우승했는지: 시드 받은 팀 중에서 승률 높을수록 유리
  const cands = all.filter((t) => seeds[t.team] && t.team !== player.team);
  if (!cands.length || !CHAMPIONSHIP[report.league] || report.league === "COLLEGE") return;
  const weight = (t) => Math.pow(t.w / (t.w + t.l), 4) * (seeds[t.team] === 1 ? 1.5 : 1);
  const total = cands.reduce((s, t) => s + weight(t), 0);
  let r = Math.random() * total;
  st.altChamp = (cands.find((t) => (r -= weight(t)) <= 0) || cands[0]).team;
}
