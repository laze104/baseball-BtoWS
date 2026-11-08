// =============================================
// world.js : v9 추가 기능
// 1. 지구·리그별 순위와 포스트시즌
// 2. 시상식 (MVP, 골든글러브, 베스트나인, 실버슬러거, 골드글러브, 투수상, 올스타)
// 3. 숨은 특성 (회춘형, 해외 체질) - 플레이어에게는 끝까지 안 알려줌
// 4. 전담 스태프 연 단위 계약
// 5. 국가대표 은퇴
// 6. 고졸 MLB 직행과 마이너리그
// =============================================

// 정규분포 비슷한 랜덤 (-3 ~ 3, 대부분 -1 ~ 1)
function gauss() {
  return (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.7;
}

// 예전 저장 데이터에도 v9 정보를 채워줌
function initWorld(player) {
  if (!player.hidden) {
    player.hidden = {
      lateBloom: Math.random() < 0.06, // 노경은처럼 늦게 꽃피는 선수
      overseas: Math.random() < 0.04,  // 류현진처럼 해외에서도 통하는 선수
    };
  }
  if (!player.services) player.services = {};
  initExtra(player); // 유리몸, 계절 특성, 국대 기록 (extra.js)
  if (player.league === "COLLEGE" && !player.collegeTier) {
    const c = COLLEGES.find((x) => x.name === player.college);
    player.collegeTier = c ? c.tier : 2;
  }
  // 호주리그 구단 정리 (질롱 코리아는 2020년 해체)
  if (player.league === "ABL" && !TEAMS.ABL.includes(player.team)) player.team = pick(TEAMS.ABL);
  // 예전 버전에서 산 트레이너는 1년 계약으로 바꿔줌
  for (const id of ["trainer", "rehab"]) {
    const i = (player.owned || []).indexOf(id);
    if (i >= 0) {
      player.owned.splice(i, 1);
      const item = SHOP_ITEMS.find((x) => x.id === id);
      player.services[id] = { left: 1, fee: itemPrice(player, item) };
    }
  }
}

// =============================================
// 1. 순위
// =============================================
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
      all.filter((t) => g.teams.includes(t.team)).sort(byWins).slice(0, 2).forEach((t, i) => (seeds[t.team] = i + 1));
    }
  } else if (lg === "INDIE") {
    // 경기도 독립리그: 1위 챔피언결정전 직행, 2·3위 플레이오프
    [...all].sort(byWins).slice(0, 3).forEach((t, i) => (seeds[t.team] = i + 1));
  } else if (lg === "COLLEGE") {
    // U-리그: 조마다 상위 4팀 왕중왕전 진출
    for (const g of LEAGUE_GROUPS.COLLEGE) {
      all.filter((t) => g.teams.includes(t.team)).sort(byWins).slice(0, 4).forEach((t, i) => (seeds[t.team] = i + 1));
    }
  } else if (lg === "ABL") {
    // 호주리그: 6팀 중 1~4위 플레이오프
    [...all].sort(byWins).slice(0, 4).forEach((t, i) => (seeds[t.team] = i + 1));
  } else if (lg === "KBO") {
    // 정규시즌 1~5위 (와일드카드 결정전부터)
    [...all].sort(byWins).slice(0, 5).forEach((t, i) => (seeds[t.team] = i + 1));
  } else if (lg === "NPB") {
    // 리그별 1~3위 클라이맥스 시리즈
    for (const g of LEAGUE_GROUPS.NPB) {
      all.filter((t) => g.teams.includes(t.team)).sort(byWins).slice(0, 3).forEach((t, i) => (seeds[t.team] = i + 1));
    }
  } else if (lg === "MLB") {
    // 리그별: 지구 우승 3팀(1~3번 시드) + 와일드카드 3팀(4~6번 시드)
    for (const name of ["아메리칸리그", "내셔널리그"]) {
      const divs = LEAGUE_GROUPS.MLB.filter((g) => g.league === name);
      const winners = divs.map((g) => all.filter((t) => g.teams.includes(t.team)).sort(byWins)[0]).sort(byWins);
      const rest = all.filter((t) => divs.some((g) => g.teams.includes(t.team)) && !winners.includes(t)).sort(byWins).slice(0, 3);
      [...winners, ...rest].forEach((t, i) => (seeds[t.team] = i + 1));
    }
  }
  return seeds;
}

// 시드별 우승 확률
function championChance(lg, seed) {
  if (!seed) return 0;
  const table = {
    KBO: [0.38, 0.24, 0.15, 0.1, 0.07],
    NPB: [0.28, 0.14, 0.08],
    MLB: [0.15, 0.13, 0.09, 0.06, 0.05, 0.04],
  }[lg];
  return table ? table[seed - 1] || 0 : 0;
}

function teamStanding(player, report) {
  const lg = player.league;
  if (lg === "MILB") return; // 마이너리그는 순위표 생략
  const teams = TEAMS[lg];
  if (!teams || !teams.includes(player.team)) return;
  const games = STANDING_GAMES[lg] || LEAGUES[lg].games;
  const all = teams.map((team) => {
    let pct = 0.5 + (Math.random() + Math.random() - 1) * 0.12;
    if (lg === "COLLEGE") pct += ((COLLEGES.find((c) => c.name === team) || { tier: 2 }).tier - 2) * 0.06; // 대학은 야구부 전력 차이가 큼
    if (team === player.team) pct += report.WAR * 0.006; // 내 활약이 팀 승률에 보탬
    if (lg === "KBO" && player.managers && player.managers[team] && player.managers[team].legend) pct += 0.015; // 레전드 감독 효과
    const w = Math.round(games * clamp(pct, 0.3, 0.7));
    return { team, w, l: games - w };
  });
  const seeds = postseasonSeeds(lg, all);
  const group = groupOf(lg, player.team);
  const table = (group ? all.filter((t) => group.teams.includes(t.team)) : all).sort((a, b) => b.w - a.w);
  table.forEach((t) => (t.seed = seeds[t.team] || 0));
  const rank = table.findIndex((t) => t.team === player.team) + 1;
  const mine = table[rank - 1];
  report.standing = {
    rank, teams: table.length, w: mine.w, l: mine.l, table,
    group: group ? group.name : null,
    leagueName: group ? group.league : null,
    seed: mine.seed,
    psLabel: { KBO: "가을야구", NPB: "클라이맥스 시리즈", MLB: "포스트시즌", ABL: "플레이오프", KBO2: "챔피언결정전", SANGMU: "챔피언결정전", INDIE: "플레이오프", COLLEGE: "왕중왕전" }[lg] || null,
  };
  // 정규시즌 1위는 바로 알려줌 (포스트시즌 우승과는 따로)
  if (rank === 1 && lg !== "HS") {
    const award = `정규시즌 우승 (${group ? group.name : LEAGUES[lg].name})`;
    player.awards[award] = (player.awards[award] || 0) + 1;
    report.awards.push(award);
  }
  saveLeagueTable(player, report, all, seeds); // 역대 순위 탭용 (extra.js)
  addMonthlyStandings(report.standing, games, report); // 월별 순위 그래프용 (story.js)
}

// 우승 (KBO·NPB·MLB): 포스트시즌 시리즈를 팀 전력(정규시즌 승률)과 내 활약으로 치름
// 시드가 높을수록 치를 시리즈가 적음 (1위 팀은 바로 한국시리즈 등)
const PS_ROUNDS = {
  KBO: [1, 2, 3, 4, 4],          // 1위: 한국시리즈만, 5위: 와일드카드부터
  NPB: [2, 3, 3],                // 리그 1위: CS 파이널 + 재팬시리즈
  MLB: [3, 3, 4, 4, 4, 4],       // 1·2번 시드: 와일드카드 시리즈 부전승
  ABL: [2, 2, 2, 2],             // 준결승 시리즈 + 챔피언십 시리즈
  KBO2: [2, 2],                  // 준결승 + 단판 결승
  SANGMU: [2, 2],
  INDIE: [1, 2, 2],              // 1위: 챔피언결정전 직행
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

// =============================================
// 2. 시상식
// =============================================
// 실제 리그 기준 (리그 최고 수준 선수의 성적)
// mvp: 보통 MVP 경쟁자 점수, pitcher: 투수상 경쟁자 점수
const AWARD_RACE = {
  KBO: { mvp: 7.8, pitcher: 6.6, allstar: 3.3, pitcherAward: "최동원상" },
  NPB: { mvp: 7.3, pitcher: 6.4, allstar: 3.6, pitcherAward: "사와무라상" },
  MLB: { mvp: 8.4, pitcher: 7.0, allstar: 4.0, pitcherAward: "사이영상" },
};

// 포지션별 골든글러브(베스트나인) 경쟁자 점수: 그 포지션 1등의 보통 성적
const POSITION_RACE = { "포수": 3.4, "1루수": 4.2, "2루수": 4.0, "3루수": 4.3, "유격수": 4.3, "외야수": 3.6, "지명타자": 3.2, "투수": 6.0 };
// 실버슬러거: 포지션별로 이 정도 OPS면 경쟁권 (리그 평균 대비 배율)
const SLUGGER_RACE = { "포수": 1.08, "1루수": 1.22, "2루수": 1.1, "3루수": 1.17, "유격수": 1.1, "외야수": 1.17, "지명타자": 1.24 };

function isPitchingQualified(p, games) {
  return p.outs / 3 >= games || p.W >= 10 || p.SV >= 30 || p.HLD >= 30;
}

// 종합 임팩트 점수: WAR + 타이틀 + 굵직한 기록 + 팀 성적 + 인기
function impactScore(player, report) {
  const line = AWARD_LINE[report.league];
  const b = report.bat;
  const p = report.pit;
  let s = report.WAR;
  const titles = report.awards.filter((a) => Object.values(TITLE_NAMES).includes(a));
  s += titles.length * 0.6;
  if (b && b.G) {
    if (b.HR >= line.hr) s += 0.8;
    if (b.HR >= 40 && b.SB >= 40) s += 2.5; // 40-40
    else if (b.HR >= 30 && b.SB >= 30) s += 1;
    if (b.AVG >= line.avg && b.PA >= LEAGUES[report.league].games * 3.1) s += 0.5;
    if (b.RBI >= line.rbi) s += 0.5;
    if (["홈런왕", "타격왕", "타점왕"].every((t) => titles.includes(t))) s += 2.5; // 타격 3관왕
  }
  if (p && p.G) {
    if (p.W >= line.w) s += 0.8;
    if (p.ERA <= line.era && p.outs / 3 >= LEAGUES[report.league].games) s += 0.8;
    if (p.SV >= line.sv) s += 0.6;
    if (["다승왕", "평균자책점왕", "탈삼진왕"].every((t) => titles.includes(t))) s += 2.5; // 투수 3관왕
  }
  if (report.standing) {
    if (report.standing.seed === 1) s += 0.6;
    else if (report.standing.seed) s += 0.3;
    else s -= 0.4; // 가을야구 못 간 팀은 표가 덜 옴
  }
  s += clamp((player.fame || 0) / 100, -0.3, 0.6); // 기자단도 사람이라 인기가 조금 반영됨
  return s;
}

// 리그 이름 붙이기 (NPB·MLB는 리그가 2개라 상도 리그별)
function awardLeague(report) {
  return report.standing && report.standing.leagueName ? report.standing.leagueName : report.league;
}

function batPosition(player) {
  if (player.type === "pitcher") return null;
  return player.position.split(" 겸 ").pop();
}

// 수상 레이스: 내 점수가 기준(그 상을 받으려면 필요한 점수)을 넘으면 수상
// 확률이 아니라 성적으로만 정해짐. 결과 탭에서 내 점수와 기준을 같이 보여줌
function race(player, report, award, mine, need, unit) {
  const won = mine >= need;
  report.races = report.races || [];
  report.races.push({ award, mine: round(mine, unit === "ops" ? 3 : 1), need: round(need, unit === "ops" ? 3 : 1), won, unit });
  if (won) addAward(player, report, award);
  return won;
}

function seasonAwards(player, report) {
  const lg = report.league;
  const rc = AWARD_RACE[lg];
  if (!rc || !report.ranks) return;
  const games = LEAGUES[lg].games;
  const two = lg !== "KBO"; // 리그가 2개면 경쟁자가 절반이라 기준이 조금 낮음
  const b = report.bat && report.bat.G ? report.bat : null;
  const p = report.pit && report.pit.G ? report.pit : null;
  const name = awardLeague(report);
  const impact = impactScore(player, report);
  report.impact = round(impact, 1);
  const extra = impact - report.WAR; // WAR 말고 타이틀·기록·팀 성적·인기로 얻은 점수

  // MVP: WAR + 타이틀 + 굵직한 기록 + 팀 성적
  race(player, report, `${name} MVP`, impact, rc.mvp - (two ? 0.5 : 0));

  // 신인왕: 이 리그 첫 시즌
  if (!player.leagueSeasons[lg]) race(player, report, `${name} 신인왕`, impact, two ? 3.2 : 3.6);

  // 투수상 (최동원상·사와무라상은 선발만, 사이영상은 리그별·마무리도 가능)
  if (p) {
    const starter = p.GS >= 15;
    const okRole = lg === "MLB" ? starter || p.SV >= 40 : starter;
    if (okRole) {
      const pScore = p.WAR + report.awards.filter((a) => ["다승왕", "평균자책점왕", "탈삼진왕"].includes(a)).length * 0.7;
      race(player, report, lg === "MLB" ? `${name} ${rc.pitcherAward}` : rc.pitcherAward, pScore, rc.pitcher - (lg === "MLB" ? 0.4 : 0));
    }
  }

  // 포지션별 상
  const pos = batPosition(player);
  if (lg === "KBO" || lg === "NPB") {
    // KBO 골든글러브, NPB 베스트나인: 그 포지션에서 공격·수비 종합 1등
    const label = lg === "KBO" ? "골든글러브" : `${name} 베스트나인`;
    let won = false;
    if (b && pos && b.G >= games * 0.6) {
      won = race(player, report, `${label} (${pos})`, b.WAR + extra * 0.6, POSITION_RACE[pos] - (pos === "외야수" ? 0.4 : 0));
    }
    if (!won && p && isPitchingQualified(p, games)) {
      race(player, report, `${label} (투수)`, p.WAR + extra * 0.6, POSITION_RACE["투수"]);
    }
  }
  if (lg === "MLB" && b && pos && b.PA >= games * 3.1) {
    // 실버슬러거: 포지션별 OPS 1등
    race(player, report, `${name} 실버슬러거 (${pos})`, b.OPS, LEAGUE_ENV.MLB.ops * SLUGGER_RACE[pos], "ops");
  }
  // KBO 수비상 (2023년부터): 포지션별 수비 1등
  if (lg === "KBO" && b && pos && pos !== "지명타자" && b.G >= games * 0.6) {
    race(player, report, `KBO 수비상 (${pos})`, (player.stats.defense + player.stats.arm) / 2, LEAGUES.KBO.level + 12);
  }
  if (lg === "MLB" && b && b.PA >= games * 3.1) {
    // 행크 애런상: 리그 최고의 타자 (OPS)
    race(player, report, `${name} 행크 애런상`, b.OPS, LEAGUE_ENV.MLB.ops * 1.38, "ops");
    // 에드가 마르티네스상: 최고의 지명타자
    if (pos === "지명타자") race(player, report, "에드가 마르티네스상", b.OPS, LEAGUE_ENV.MLB.ops * 1.22, "ops");
  }
  // 올해의 구원투수: MLB 마리아노 리베라상(아메리칸리그)·트레버 호프먼상(내셔널리그)
  if (lg === "MLB" && p && p.SV >= 25) {
    const award = name.startsWith("아메리칸") ? "마리아노 리베라상" : "트레버 호프먼상";
    race(player, report, award, p.SV / 10 + (LEAGUE_ENV.MLB.era - p.ERA), 5.5);
  }
  // 올해의 재기상 (MLB·NPB): 작년에 부진·부상·공백이었는데 올해 부활
  if ((lg === "MLB" || lg === "NPB") && player.history.length >= 2) {
    const prev = player.history[player.history.length - 1]; // 아직 올해 기록은 안 들어갔음
    const wasDown = prev.WAR < 1 || ["SANGMU", "SOCIAL"].includes(prev.league) || (prev.events || []).some((e) => e.includes("부상"));
    if (wasDown && !isAmateur(prev.league)) race(player, report, `${name} 올해의 재기상`, report.WAR, lg === "MLB" ? 4.5 : 4);
  }
  // 로베르토 클레멘테상: 야구 실력 + 사회 공헌 (기부·장학재단) + 팬 사랑
  if (lg === "MLB" && !player.awards["로베르토 클레멘테상"] && (hasItem(player, "donation") || hasItem(player, "foundation"))) {
    race(player, report, "로베르토 클레멘테상", report.WAR / 2 + (player.fame || 0) / 20, 6.5); // 평생 한 번
  }

  // 수비상: MLB 골드글러브, NPB 골든글러브 (수비·송구 능력치)
  if (lg === "MLB" || lg === "NPB") {
    const label = lg === "MLB" ? `${name} 골드글러브` : "NPB 골든글러브";
    const level = LEAGUES[lg].level;
    if (b && pos && pos !== "지명타자" && b.G >= games * 0.6) {
      race(player, report, `${label} (${pos})`, (player.stats.defense + player.stats.arm) / 2, level + 12);
    } else if (p && player.stats.fielding !== undefined && p.outs / 3 >= games * 0.8) {
      race(player, report, `${label} (투수)`, player.stats.fielding, level + 14);
    }
  }
}

// 올스타: 성적 + 인기 (팬 투표)
function allStar(player, report) {
  const lg = report.league;
  const rec = report.bat || report.pit;
  if (!rec || !rec.G) return;
  const fame = player.fame || 0;
  if (lg === "KBO2") {
    race(player, report, "퓨처스 올스타", report.WAR, 1.5);
    return;
  }
  const rc = AWARD_RACE[lg];
  if (!rc) return;
  // 부상으로 덜 뛴 해는 전반기 성적으로 봐줌
  // 팬 투표: 팬덤이 큰 팀 + 팀 성적이 좋으면 몰표 (백업 선수는 투표 대상이 잘 안 됨)
  const backup = report.bat && report.bat.role && report.bat.role.startsWith("백업");
  const st = report.standing;
  const teamPct = st ? st.w / (st.w + st.l) : 0.5;
  const f = teamFandom(report.team) - 3;
  // 팬덤 작은 팀도 감독 추천으로 뽑힐 길이 있어서 불리함은 조금만
  const fanVote = (f * (f > 0 ? 0.6 : 0.25) + clamp((teamPct - 0.5) * 10, -0.8, 1.3)) * (backup ? 0.3 : 1);
  report.fanVote = round(fanVote, 1);
  let score = report.WAR * (report.gameFactor < 1 ? 1.3 : 1) + fame / 50 + fanVote;
  // 이정후처럼 압도적이면 팬덤이 작은 팀이어도 감독 추천·선수단 투표로 무조건 뽑힘
  const dominant = report.WAR >= rc.allstar + 1.5 || report.awards.some((a) => Object.values(TITLE_NAMES).includes(a));
  if (dominant) score = Math.max(score, rc.allstar + 0.1);
  if (!race(player, report, "올스타", score, rc.allstar)) return;
  const fanPick = fame >= 40 || fanVote >= 1.5;
  report.allStar = { fanPick, mvp: false };
  // 미스터 올스타: 올스타 중에서도 압도적인 성적 + 큰 무대 강심장(클러치·멘탈)
  const nerve = player.type === "pitcher" ? player.stats.mental : player.stats.clutch;
  if (score >= rc.allstar + 4 && nerve >= LEAGUES[lg].level + 15) {
    addAward(player, report, "미스터 올스타");
    report.allStar.mvp = true;
  }
}

// =============================================
// 3. 숨은 특성 (화면에는 절대 안 보여줌)
// =============================================
// 시즌 시작 전 컨디션 보정
function hiddenMod(player, report) {
  let mod = 0;
  const h = player.hidden || {};
  // 해외 체질: NPB·MLB·마이너에서 실력 이상으로 통함 (류현진, 이정후처럼)
  if (h.overseas && ["NPB", "MLB", "MILB"].includes(player.league)) mod += 6;
  // 회춘 기간
  if (player.revival > 0) {
    mod += 4;
    player.revival--;
    report.events.push("제2의 전성기");
  }
  return mod;
}

// 시즌 뒤: 늦게 꽃피는 선수는 30대에 갑자기 각성함 (노경은처럼)
function maybeRevival(player, report) {
  if (player.revivalUsed || player.age < 31 || player.age > 38 || isAmateur(player.league)) return;
  const h = player.hidden || {};
  const chance = h.lateBloom ? 0.3 : 0.004;
  if (Math.random() >= chance) return;
  player.revivalUsed = true;
  player.revival = 3;
  const keys = Object.keys(player.stats);
  for (const key of keys) player.stats[key] = clamp(player.stats[key] + randomInt(3, 7), 1, 99);
  report.events.push("회춘");
  report.specials.push({ key: "revival" });
  report.bigMoments = report.bigMoments || [];
  report.bigMoments.push({ tone: "gold", kicker: "믿을 수 없는 일", title: "🔥 회춘!", lines: [`${koreanAge(player.age)}세에 찾아온 제2의 전성기`, "모든 능력치가 크게 올랐어요"] });
}

// 회춘 기간과 셰프는 노화를 늦춤
function adjustGrowthBase(player, base) {
  if (player.revival > 0 && base < 0.3) return 0.3;
  if (hasItem(player, "chef") && base < 0) return base * 0.75;
  return base;
}

// =============================================
// 4. 전담 스태프 (연 단위 계약)
// =============================================
const SERVICE_YEARS = [
  { years: 1, discount: 1 },
  { years: 3, discount: 0.95 },
  { years: 5, discount: 0.9 },
];

function serviceFee(player, item, years) {
  const d = SERVICE_YEARS.find((s) => s.years === years).discount;
  return Math.round(itemPrice(player, item) * d);
}

// 계약할 때 첫해 비용을 내고, 다음 해부터는 시즌이 끝날 때마다 냄
function hireService(player, id, years) {
  const item = SHOP_ITEMS.find((i) => i.id === id);
  const fee = serviceFee(player, item, years);
  if (hasItem(player, id) || player.money < fee) return false;
  player.money -= fee;
  player.services[id] = { left: years, total: years, fee };
  return true;
}

// payday에서 부름: 남은 기간을 줄이고 다음 해 비용을 냄
function payServices(player, report) {
  for (const [id, s] of Object.entries(player.services || {})) {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    s.left--;
    if (s.left <= 0) {
      delete player.services[id];
      if (report) report.specials.push({ key: "serviceEnd", item: item ? item.name : id });
    } else {
      player.money -= s.fee;
    }
  }
}

// =============================================
// 5. 국가대표 은퇴
// =============================================
function canRetireNational(player) {
  return !player.nationalRetired && player.age >= 30 && (player.awards["국가대표"] || 0) > 0;
}

function retireNational(player) {
  player.nationalRetired = true;
  player.nationalPlan = null;
  const caps = player.awards["국가대표"] || 0;
  changeFame(player, 3);
  return `${player.name}, 태극마크 반납… "${caps}번의 대표팀, 영광이었습니다. 이제 후배들에게"`;
}

// =============================================
// 6. 고졸 MLB 직행과 마이너리그
// =============================================
const DOLLAR = 0.14; // 1달러 = 1,400원 = 0.14만원

function maybeMlbDirect(player, report) {
  const ovr = getOvrs(player).best;
  // 고교 최대어만 미국 구단이 직접 데려감: 능력치 60 이상 + 드래프트 점수 72 이상
  if (ovr < 60 || draftScore(player, report) < 72) return;
  const org = pick(TEAMS.MLB);
  const dollars = clamp(Math.round((ovr - 55) * 12 + (draftScore(player, report) - 72) * 5), 50, 200); // 만 달러 (실제 한국 고교 유망주: 약 50만~150만 달러)
  const bonus = Math.round(dollars * 10000 * DOLLAR * priceIndex(player));
  report.specials.push({ key: "mlbScout", team: org });
  pushChoiceFirst(player, {
    key: "mlbDirect",
    org, bonus,
    text: `🇺🇸 ${org} 스카우트가 직접 찾아왔어요! 졸업하자마자 미국으로 오라는 제안이에요. 마이너리그 ${MILB_AFFILIATE[org]}에서 시작해요.`,
    options: [
      { id: "go", label: `${org}와 계약 (미국 직행)`, detail: `계약금 ${fmtMoney(bonus)} · 마이너리그부터 · 실패하면 KBO 복귀까지 2년 유예` },
      { id: "stay", label: "국내에 남는다", detail: "KBO 드래프트·대학 진학 중에서 고를 수 있어요" },
    ],
  });
}

function resolveMlbDirect(player, choice, option) {
  if (option.id !== "go") return [`${player.name}, ${choice.org} 제안 거절… "한국에서 먼저 증명하겠다"`];
  // 국내 진로 선택지는 없앰
  const domestic = ["draftSign", "undrafted"];
  player.choiceQueue = player.choiceQueue.filter((c) => !domestic.includes(c.key));
  if (player.pendingChoice && domestic.includes(player.pendingChoice.key)) nextChoice(player);
  player.league = "MILB";
  player.mlbOrg = choice.org;
  player.team = MILB_AFFILIATE[choice.org];
  player.milbYears = 0;
  player.overseasAmateur = true;
  player.contract = makeContract("MILB", player.team, 1, minSalary("MILB", player), 0);
  addMoney(player, choice.bonus);
  return [
    `[단독] ${player.name}, ${choice.org} 입단! 계약금 ${fmtMoney(choice.bonus)}`,
    `${player.name}, "꿈의 무대에서 살아남겠다"… ${player.team}에서 첫발`,
  ];
}

// 마이너리그 시즌이 끝날 때
function milbTick(player, report) {
  player.milbYears = (player.milbYears || 0) + 1;
  const ovr = getOvrs(player).best;
  const mlbLevel = LEAGUES.MLB.level;
  if (ovr >= mlbLevel - 4 || (ovr >= mlbLevel - 7 && report.WAR >= 4 && Math.random() < 0.5)) {
    player.league = "MLB";
    player.team = player.mlbOrg;
    player.contract = makeContract("MLB", player.team, 1, minSalary("MLB", player), 0);
    report.specials.push({ key: "mlbCallup", team: player.team });
    report.bigMoments = report.bigMoments || [];
    report.bigMoments.push({ tone: "gold", kicker: "THE SHOW", title: "⚾ 메이저리그 콜업!", lines: [`${player.team} 26인 로스터 합류`, `마이너리그 ${player.milbYears}시즌 만의 꿈`] });
    return;
  }
  if (player.age >= 25 && player.milbYears >= 4 && ovr < mlbLevel - 10) {
    report.specials.push({ key: "milbRelease", team: player.team });
    player.overseasReturn = true;
    pushChoice(player, {
      key: "undrafted",
      text: `${player.mlbOrg} 구단이 방출을 통보했어요. 해외 직행 선수는 KBO 복귀까지 2년을 기다려야 해서, 독립리그나 호주에서 버티다 드래프트에 다시 나가야 해요.`,
      options: [
        { id: "INDIE", label: "국내 독립리그에서 KBO 재도전" },
        { id: "ABL", label: "호주리그에서 감 유지" },
        { id: "retire", label: "야구를 그만둔다" },
      ],
    });
  }
}

// =============================================
// 큰 화면 알림에 띄울 상
// =============================================
const BIG_AWARD_WORDS = ["행크 애런상", "리베라상", "호프먼상", "재기상", "클레멘테상", "마르티네스상", "수비상", "MVP", "골든글러브", "베스트나인", "실버슬러거", "골드글러브", "신인왕", "사이영상", "사와무라상", "최동원상", "올스타", "우승", "왕", "메달", "최우수선수", "노히트노런", "사이클링"];

function isBigAward(name) {
  return BIG_AWARD_WORDS.some((w) => name.includes(w));
}

// 시즌 결과에서 큰 화면 알림 목록 만들기
function seasonBigMoments(report) {
  const list = [];
  const awards = report.awards.filter(isBigAward);
  if (awards.length) {
    const top = awards.find((a) => a.includes("MVP") && !a.includes("올스타")) || awards.find((a) => a.includes("우승")) || awards[0];
    list.push({
      tone: "gold",
      kicker: `${report.year} 시즌 시상식`,
      title: `🏆 ${top}`,
      awards,
      lines: report.allStar && report.allStar.fanPick ? ["올스타 팬 투표 1위!"] : [],
    });
  }
  // 드래프트 결과도 큰 화면으로
  const from = { HS: "고졸", COLLEGE: "대졸", INDIE: "독립리그 출신", ABL: "호주리그 출신" }[report.league] || "";
  for (const sp of report.specials) {
    if (sp.key === "draft" || sp.key === "draftTop") {
      list.unshift({
        tone: "gold",
        kicker: `KBO 신인 드래프트 · ${from}`,
        title: sp.round === 1 ? "🎉 1라운드 지명!" : `🎉 ${sp.round}라운드 지명!`,
        lines: [`${sp.team} ${sp.round}라운드 지명`, `계약금 ${sp.bonus}`],
      });
    } else if (sp.key === "openingRoster") {
      list.push({ tone: "gold", kicker: "신인 개막 엔트리", title: "⚾ 바로 1군!", lines: [`${sp.team} 1군에서 프로 데뷔`] });
    } else if (sp.key === "trainee") {
      list.unshift({ tone: "good", kicker: `${from} 프로 입단`, title: "✍️ 육성선수 계약", lines: [`${sp.team}과 육성선수 계약`, "계약금은 없지만 프로 유니폼을 입었어요"] });
    } else if (sp.key === "undrafted") {
      list.unshift({ tone: "bad", kicker: `KBO 신인 드래프트 · ${from}`, title: "😢 미지명", lines: ["끝내 이름이 불리지 않았어요", "다음 길을 골라야 해요"] });
    } else if (sp.key === "mlbScout") {
      list.push({ tone: "gold", kicker: "깜짝 소식", title: "🇺🇸 MLB 스카우트 방문", lines: [`${sp.team} 스카우트의 미국 직행 제안`] });
    }
  }
  return list.concat(report.bigMoments || []);
}

// =============================================
// 기사·댓글 문구 (v9)
// =============================================
Object.assign(NEWS.special, {
  mlbScout: "[단독] {team} 스카우트, 고교 졸업반 {name}에 러브콜",
  mlbCallup: "{name}, 드디어 메이저리그 콜업! {team} 데뷔 임박",
  milbRelease: "{name}, {team}에서 방출… 아메리칸 드림 일단 멈춤",
  revival: "{name}, 나이를 거꾸로 먹나… 제2의 전성기 활짝",
  serviceEnd: "{name}, {item} 계약 만료",
  trainee: "{name}, {team} 육성선수 계약… 독립리그 출신 신화 쓸까",
  openingRoster: "{name}, 신인 개막 엔트리 합류! {team} 1군에서 바로 데뷔",
});
Object.assign(FAN, {
  revival: ["회춘 ㄷㄷ 이게 되네", "나이는 숫자에 불과하다는 걸 증명함", "작년이랑 다른 사람 아님?", "은퇴하라던 사람들 다 어디 감", "이 나이에 커리어하이 실화냐"],
  mlbDirect: ["고졸 미국 직행 ㄷㄷ", "마이너는 버스 10시간 탄다던데 버텨라", "KBO 거치고 가지 아깝다", "잘되면 전설, 안되면 복귀 2년 유예… 도박이네"],
  mlbCall: ["드디어 빅리그 ㅠㅠ", "마이너 버스 생활 끝!", "메이저 데뷔전 무조건 본다", "고졸 직행 성공 사례 나오나"],
  allstar: ["올스타 축하!", "팬투표 몰표 ㅋㅋ", "올스타전에서도 한 건 해라", "이 정도면 리그 얼굴"],
  nationalRetire: ["태극마크 수고 많으셨습니다", "대표팀 레전드였다 진짜", "이제 소속팀에서 오래 봐요", "국대 경기에서 울컥했던 기억 난다"],
});

// =============================================
// v9 업적
// =============================================
ACHIEVEMENTS.push(
  { id: "allstar", group: "수상", name: "별들의 잔치", desc: "올스타 선정", check: (p) => (p.awards["올스타"] || 0) >= 1 },
  { id: "allstar10", group: "수상", name: "올스타 단골", desc: "올스타 10번 선정", check: (p) => (p.awards["올스타"] || 0) >= 10 },
  { id: "mrAllstar", group: "수상", name: "미스터 올스타", desc: "올스타전 MVP", check: (p) => countAward(p, "미스터 올스타") >= 1 },
  { id: "glove", group: "수상", name: "황금 장갑", desc: "골든글러브·베스트나인·골드글러브·실버슬러거 중 하나", check: (p) => ["골든글러브", "베스트나인", "골드글러브", "실버슬러거"].some((a) => countAward(p, a) >= 1) },
  { id: "ace", group: "수상", name: "리그 최고 투수", desc: "최동원상·사와무라상·사이영상", check: (p) => ["최동원상", "사와무라상", "사이영상"].some((a) => countAward(p, a) >= 1) },
  { id: "direct", group: "커리어", name: "아메리칸 드림", desc: "고교 졸업 후 미국 직행", check: (p) => !!p.overseasAmateur },
  { id: "revival", group: "커리어", name: "회춘", desc: "30대에 찾아온 제2의 전성기", check: (p) => !!p.revivalUsed },
  { id: "nretire", group: "커리어", name: "태극마크 반납", desc: "국가대표 은퇴 선언", check: (p) => !!p.nationalRetired },
);

// =============================================
// 감독 면담 (v13): 비시즌마다 1번, 원하는 역할을 말해볼 수 있음
// 감독은 실력(OVR), 최근 성적, 팀 내 입지(프랜차이즈·인기)를 보고 판단함
// 결과: 수락 / 캠프 경쟁 후 결정 / 거절 (확정은 아님)
// =============================================
const MEETING_WISHES = [
  // side: 투수(pit)·타자(bat) / need: 감독이 OK하려면 필요한 점수 / ok: 요청할 수 있는 상황
  { id: "starter", short: "선발 전환", side: "pit", label: "선발로 뛰고 싶어요", need: 1, extra: (p) => (p.stats.stamina - LEAGUES[p.league].level) / 4,
    ok: (p) => p.position === "불펜", hint: "체력이 중요해요" },
  { id: "bullpen", short: "불펜 전환", side: "pit", label: "불펜으로 가고 싶어요", need: -6, extra: () => 0,
    ok: (p) => p.position === "선발", hint: "대부분 받아줘요" },
  { id: "closer", short: "마무리", side: "pit", label: "마무리를 맡고 싶어요", need: 4, extra: (p) => (p.stats.mental - LEAGUES[p.league].level) / 4,
    ok: (p) => p.position.startsWith("불펜") && p.role !== "closer", hint: "멘탈·구위가 중요해요" },
  { id: "regular", short: "주전 보장", side: "bat", label: "주전으로 써 주세요", need: -1, extra: () => 0,
    ok: (p) => !p.starterPromise, hint: "실력이 리그 수준 근처면 가능" },
  { id: "leadoff", short: "1번 타자", side: "bat", label: "1번 타자를 하고 싶어요", need: 1, extra: (p) => ((p.stats.speed + p.stats.eye) / 2 - LEAGUES[p.league].level) / 4,
    ok: (p) => p.lineup !== "leadoff", hint: "주루·선구가 중요해요 (타석 +)" },
  { id: "pinch", short: "대타 요원", side: "bat", label: "대타로라도 써 주세요", need: -9, extra: (p) => (p.stats.clutch - LEAGUES[p.league].level) / 4,
    ok: (p) => p.lineup !== "pinch" && !p.starterPromise, hint: "벤치 선수용 · 경기 수 늘어요 (클러치가 중요)" },
  { id: "cleanup", short: "4번 타자", side: "bat", label: "4번 타자를 하고 싶어요", need: 4, extra: (p) => (p.stats.power - LEAGUES[p.league].level) / 3,
    ok: (p) => p.lineup !== "cleanup", hint: "파워가 중요해요 (타점 기회 +)" },
  // 요청 말고 '말'만 하는 면담 (special: 결과를 직접 정함)
  { id: "resolve", short: "각오 전하기", side: "any", label: "올 시즌 잘하겠습니다, 믿어 주세요", special: true,
    ok: () => true, hint: "부탁 없이 각오만 · 감독 신뢰 +1, 다음 시즌 컨디션 +" },
  { id: "captain", short: "주장", side: "any", label: "주장을 맡고 싶어요", need: 0, extra: (p) => (p.fame || 0) / 25 + (p.age >= 30 ? 1 : 0),
    ok: (p) => p.age >= 27 && p.captainTeam !== p.team, hint: "나이·인기·팀 내 입지가 중요해요 · 팬 여론 +" },
  { id: "rest", short: "체력 관리", side: "any", label: "체력 관리 좀 해 주세요", special: true,
    ok: (p) => p.age >= 32 && !p.restPlan, hint: "베테랑용 · 출전은 조금 줄고 부상 위험도 줄어요" },
  { id: "trade", short: "트레이드 요청", side: "any", label: "트레이드 시켜 주세요", special: true,
    ok: (p) => p.league === "KBO", hint: "다른 팀에서 새 출발 · 원하는 팀이 있어야 해요 (팬 여론 -)" },
];

// 특별 면담: 각오·체력 관리·트레이드는 감독 점수 대신 상황으로 정함
function specialMeeting(player, wish, who) {
  const lv = LEAGUES[player.league].level;
  const ovr = getOvrs(player).best;
  if (wish.id === "resolve") {
    if (player.trustTeam !== player.team) player.managerTrust = 0;
    player.trustTeam = player.team;
    player.managerTrust = Math.min(3, (player.managerTrust || 0) + 1);
    player.nextMod = (player.nextMod || 0) + 1;
    return { result: "yes", line: `${who}이 "그 말 믿는다"며 어깨를 두드려 줬어요. (감독 신뢰 ${player.managerTrust}/3)`, news: `${player.name}, 감독 면담서 "올 시즌 각오 남다르다"` };
  }
  if (wish.id === "rest") {
    player.restPlan = player.team;
    return { result: "yes", line: `${who}이 "관리해 주마, 대신 나갈 땐 확실히 해라"라고 했어요.`, news: `${player.name}, 베테랑 체력 안배 들어간다` };
  }
  if (wish.id === "trade") {
    if (isFranchiseHere(player)) return { result: "no", line: `${who}이 "너는 이 팀의 얼굴이다"라며 단칼에 거절했어요.`, news: `${player.name}, 트레이드 요청했지만 구단 "절대 안 보낸다"` };
    if (ovr < lv - 4) return { result: "no", line: "구단이 알아봤지만 원하는 팀이 없었어요.", news: `${player.name}, 트레이드 요청… 시장 반응은 싸늘` };
    const old = player.team;
    const next = pick(TEAMS.KBO.filter((t) => t !== old));
    player.team = next;
    if (player.contract) player.contract.team = next;
    changeFame(player, -4);
    player.traded = true;
    return { result: "yes", line: `${old} → ${next} 트레이드가 성사됐어요!`, news: `[트레이드] ${player.name}, ${old}에서 ${next}로… "새 팀에서 증명하겠다"` };
  }
}

function canMeetManager(player) {
  return !player.retired && !isAmateur(player.league) && !isServing(player) && player.meetingSeason !== player.season;
}

function meetingWishes(player) {
  return MEETING_WISHES.filter((w) => {
    if (w.side === "pit" && player.type === "batter") return false;
    if (w.side === "bat" && player.type === "pitcher") return false;
    if (player.type === "twoway" && (w.id === "starter" || w.id === "bullpen")) return false;
    if (w.id === "trade" && player.league !== "KBO") return false;
    return w.ok(player);
  });
}

// 우리 팀 감독 (KBO는 실제·역대 감독, 2군·해외 팀은 이름 없이 스타일만)
function managerOf(player) {
  if (player.league === "KBO") {
    initManagers(player);
    if (player.managers[player.team]) return player.managers[player.team];
  }
  const keys = ["trust", "run", "pitch", "results", "talk", "defense", "youth"];
  const hash = [...(player.team || "")].reduce((h, c) => h + c.charCodeAt(0), 0);
  return { name: player.league === "KBO2" ? `${player.team} 퓨처스` : player.team, style: keys[hash % keys.length], anonymous: true };
}

function managerTitle(player) {
  const m = managerOf(player);
  return `${m.legend ? "👑 " : ""}${m.name} 감독`;
}

// 감독이 보는 점수: 실력 차이 + 최근 성적 + 팀 내 입지 + 요청별 능력치 + 감독 스타일
function managerScore(player, wish) {
  const ovrs = getOvrs(player);
  const ovr = wish.side === "pit" ? ovrs.pit : wish.side === "bat" ? ovrs.bat : ovrs.best;
  const style = managerOf(player).style;
  let s = (ovr || 0) - LEAGUES[player.league].level;
  s += clamp(recentWar(player) - 2, -3, 3) * (style === "results" ? 1.5 : 1);
  if (style === "trust" && (wish.id === "regular" || wish.id === "pinch")) s += 2;
  if (style === "run" && wish.id === "leadoff") s += 2;
  if (style === "pitch" && wish.side === "pit") s += 1.5;
  if (style === "results") s -= 1;
  if (style === "defense" && player.stats.defense !== undefined && wish.side === "bat") s += (player.stats.defense - LEAGUES[player.league].level) / 5;
  if (style === "youth") s += player.age <= 24 ? 2 : player.age >= 32 ? -1 : 0;
  if (style === "training") s -= 1;
  if (style === "freedom") s += player.age >= 30 ? 2 : 0;
  if (isFranchiseHere(player)) s += 2;
  if (player.trustTeam === player.team) s += player.managerTrust || 0; // 각오를 전해서 쌓은 신뢰
  s += clamp((player.fame || 0) / 30, -1, 1.5);
  s += wish.extra(player);
  return round(s, 1);
}

function meetManager(player, wishId) {
  const wish = MEETING_WISHES.find((w) => w.id === wishId);
  player.meetingSeason = player.season;
  if (wish.special) return { wish, score: 0, ...specialMeeting(player, wish, managerTitle(player)) };
  const score = managerScore(player, wish);
  const m = managerOf(player);
  const campRange = m.style === "talk" ? 4.5 : 3;
  let result;
  if (score >= wish.need) result = "yes";
  else if (score >= wish.need - campRange) result = "camp";
  else result = "no";

  const who = managerTitle(player);
  const line = {
    yes: `${who}이 요청을 받아들였어요.`,
    camp: `${who}: 스프링캠프에서 보고 결정하겠대요.`,
    no: `${who}이 아직은 이르다고 했어요.`,
  }[result];
  let news;
  if (result === "yes") {
    applyWish(player, wish.id);
    news = `${player.name}, 감독 면담 끝에 '${wish.short}' 요청 받아들여져`;
  } else if (result === "camp") {
    player.campWish = { id: wish.id, need: wish.need };
    news = `${player.name}, 감독에게 역할 변경 요청… 스프링캠프 경쟁으로 결정`;
  } else {
    if (score < wish.need - 7) player.nextMod = (player.nextMod || 0) - 1; // 무리한 요구는 관계가 살짝 서먹해짐
    news = `${player.name}, 감독 면담에서 요청 거절당해`;
  }
  return { wish, result, line, news, score };
}

function applyWish(player, id) {
  player.promiseTeam = player.team;
  if (id === "starter") { player.position = "선발"; player.role = null; }
  if (id === "bullpen") { player.position = "불펜"; player.role = null; }
  if (id === "closer") player.role = "closer";
  if (id === "regular") player.starterPromise = true;
  if (id === "leadoff" || id === "cleanup") { player.lineup = id; player.starterPromise = true; }
  if (id === "pinch") player.lineup = "pinch";
  if (id === "captain") { player.captainTeam = player.team; changeFame(player, 4); }
}

// 시즌 시작 때 캠프 경쟁 결과 (시즌 컨디션까지 포함해서 다시 판단)
function resolveCampWish(player, report, mod) {
  // 팀을 옮기면 예전 감독과의 약속은 없던 일이 됨
  if (player.promiseTeam && player.promiseTeam !== player.team) {
    player.starterPromise = false;
    player.lineup = null;
    player.role = null;
    player.closerOffer = false;
    player.campWish = null;
    player.promiseTeam = null;
    player.restPlan = null;
  }
  const cw = player.campWish;
  if (!cw) return;
  player.campWish = null;
  const wish = MEETING_WISHES.find((w) => w.id === cw.id);
  const score = managerScore(player, wish) + mod / 3 + randomInt(-1, 1);
  if (score >= cw.need) {
    applyWish(player, cw.id);
    report.events.push("캠프 경쟁 승리");
    report.bigMoments = report.bigMoments || [];
    report.bigMoments.push({ tone: "good", kicker: "스프링캠프 결과", title: "✅ 경쟁 승리!", lines: [`감독이 요청을 받아들였어요: ${wish.short}`] });
  } else {
    report.events.push("캠프 경쟁 패배");
  }
}

// 타순 효과: 1번 타자는 득점, 4번 타자는 타점이 많음
function lineupEffect(player, bat) {
  if (!bat) return;
  if (player.lineup === "leadoff") { bat.R = Math.round(bat.R * 1.15); bat.RBI = Math.round(bat.RBI * 0.85); }
  if (player.lineup === "cleanup") { bat.RBI = Math.round(bat.RBI * 1.15); }
}

// 감독이 먼저 찾아옴: 필승조로 압도적이면 "내년엔 네가 뒷문 맡아라"
function maybeCloserOffer(player, report) {
  const p = report.pit;
  if (!p || !p.role || p.role !== "필승조" || player.role === "closer" || isAmateur(player.league)) return false;
  if (!(p.ERA <= 2.6 && p.WAR >= 2.5 && p.HLD >= 15)) return false;
  pushChoice(player, {
    key: "closerOffer",
    text: `🗣️ ${managerTitle(player)}이 불렀어요. "평균자책 ${p.ERA.toFixed(2)}, 홀드 ${p.HLD}개. 내년엔 네가 뒷문 맡아라."`,
    options: [
      { id: "accept", label: "마무리 맡겠습니다", detail: "다음 시즌 마무리 (세이브 기회)" },
      { id: "stay", label: "지금 자리가 편합니다", detail: "필승조 그대로" },
    ],
  });
  return true;
}

function resolveCloserOffer(player, choice, option) {
  if (option.id === "accept") {
    player.role = "closer";
    player.closerOffer = true;
    player.closerPromoted = true; // 업적용
    player.promiseTeam = player.team;
    return [`${player.name}, 새 시즌 마무리 낙점… "9회는 내가 책임진다"`];
  }
  return [`${player.name}, 마무리 제안 고사… "지금 자리에서 팀을 돕겠다"`];
}

// 감독이 먼저 찾아옴: 벤치 타자에게 "대타로 쓸 테니 대타 훈련해라"
function maybeManagerTalk(player, report) {
  if (maybeCloserOffer(player, report)) return;
  if (player.retired || isAmateur(player.league) || isServing(player) || player.type !== "batter") return;
  if (!report.bat || !report.bat.role || !report.bat.role.startsWith("백업") || player.lineup === "pinch") return;
  const pending = [player.pendingChoice, ...player.choiceQueue].filter(Boolean);
  if (pending.some((c) => ["forcedRetire", "fa", "military"].includes(c.key))) return;
  if (Math.random() > 0.5) return;
  const who = managerTitle(player);
  pushChoice(player, {
    key: "managerTalk",
    text: `🗣️ ${who}이 불렀어요. "내년엔 너를 대타 요원으로 쓸 생각이다. 비시즌에 대타 감각 좀 만들어 와라."`,
    options: [
      { id: "accept", label: "알겠습니다, 대타 훈련하겠습니다", detail: "대타 요원 (출전 경기 늘어남) · 클러치 +2, 컨택 +1" },
      { id: "compete", label: "주전 경쟁 해보고 싶습니다", detail: "스프링캠프에서 주전 경쟁 (못 이기면 백업)" },
    ],
  });
}

function resolveManagerTalk(player, choice, option) {
  if (option.id === "accept") {
    player.lineup = "pinch";
    player.promiseTeam = player.team;
    for (const [k, v] of [["clutch", 2], ["contact", 1]]) player.stats[k] = clamp(player.stats[k] + v, 1, 99);
    return [`${player.name}, 비시즌 대타 특훈… "한 타석에 모든 걸 건다"`];
  }
  player.campWish = { id: "regular", need: -1 };
  player.promiseTeam = player.team;
  return [`${player.name}, "주전 경쟁 피하지 않겠다"… 스프링캠프 정면 승부`];
}

// =============================================
// 감독 교체 (v14): 성적이 나쁘거나 계약이 끝나면 감독이 바뀜
// 역대 감독(👑 레전드 포함)과 새 얼굴, 은퇴한 라이벌까지 후보가 됨
// =============================================
function initManagers(player) {
  if (player.managers) return;
  player.managers = {};
  const now = gameYear(player);
  for (const [team, m] of Object.entries(MANAGERS)) {
    // 예전 버전 저장 파일로 이어 하면 지금 해 기준으로 부임 연도를 맞춤
    const since = now > START_YEAR + 3 ? now - randomInt(0, 3) : MANAGER_SINCE[team] || START_YEAR;
    player.managers[team] = { ...m, note: "", since };
  }
  player.managerPool = {};  // 한 번이라도 감독을 했던 사람 (다시 돌아올 수 있음)
  player.managerRest = {};  // 경질된 감독은 2년 쉼
  player.myManagers = [];   // 내가 함께한 KBO 감독
}

function managerCandidates(player, year) {
  const busy = new Set(Object.values(player.managers).map((m) => m.name));
  const rest = player.managerRest;
  const ok = (name) => !busy.has(name) && !(rest[name] > year);
  const age = year - START_YEAR; // 게임이 흘러갈수록 옛 감독은 줄고 새 얼굴이 늘어남
  const list = [];
  const young = (m) => !m.born || year + 1 - m.born <= 68; // 다음 시즌 나이 기준
  for (const m of PAST_MANAGERS) {
    if (!ok(m.name) || (m.until ? year > m.until : !young(m))) continue;
    list.push({ m, w: m.legend ? Math.max(0.15, 1 - age * 0.06) : Math.max(0.2, 1.5 - age * 0.08) });
  }
  for (const m of Object.values(player.managerPool)) {
    if (ok(m.name) && young(m) && !PAST_MANAGERS.some((x) => x.name === m.name)) list.push({ m, w: Math.max(0.3, 1.2 - (year - (m.left || year)) * 0.1) });
  }
  for (const name of NEW_MANAGER_NAMES) {
    if (ok(name) && !player.managerPool[name]) {
      list.push({ m: { name, born: year - randomInt(43, 52), style: pick(Object.keys(MANAGER_STYLES)), note: "코치 출신 신임 감독" }, w: 0.8 + age * 0.2 });
    }
  }
  const r = player.rival;
  if (r && r.retired && ok(r.name) && player.age >= 38) { // 라이벌은 나랑 동갑
    list.push({ m: { name: r.name, born: year - player.age, style: r.type === "pitcher" ? "pitch" : pick(["trust", "talk", "run"]), note: "내 라이벌 · 은퇴 후 지도자로" }, w: 4 });
  }
  return list;
}

function weightedPick(list) {
  let roll = Math.random() * list.reduce((t, x) => t + x.w, 0);
  for (const x of list) if ((roll -= x.w) <= 0) return x.m;
  return list[list.length - 1].m;
}

// 감독 스타일이 내 시즌에 주는 효과 (지옥 훈련, 자율 야구)
function managerSeasonEffect(player, report) {
  if (report.league !== "KBO" || !player.managers || !player.managers[report.team]) return;
  const m = player.managers[report.team];
  if (!player.myManagers.includes(m.name)) player.myManagers.push(m.name);
  if (m.style === "training") {
    const keys = Object.keys(player.stats);
    const k = pick(keys);
    player.stats[k] = clamp(player.stats[k] + 1, 1, 99);
    report.events.push("지옥 훈련");
    report.news.push(`${player.name}, ${m.name} 감독의 지옥 훈련 버텨냈다… "펑고 1000개는 기본"`);
  }
  if (m.style === "freedom" && player.age >= 31) player.nextMod = (player.nextMod || 0) + 1;
}

function rotateManagers(player, report) {
  initManagers(player);
  managerSeasonEffect(player, report);
  const year = report.year;
  const myLastTeam = report.league === "KBO" ? report.team : null;
  const changes = [];
  // 다른 팀 순위: 내가 KBO에 있으면 실제 순위표, 아니면 대충 랜덤
  const table = report.league === "KBO" && report.standing ? report.standing.table : null;
  const shuffled = Object.keys(player.managers).sort(() => Math.random() - 0.5);
  const rankOf = (team) => (table ? table.findIndex((t) => t.team === team) + 1 : shuffled.indexOf(team) + 1);
  for (const team of shuffled) {
    const old = player.managers[team];
    if (!old.contractEnd) old.contractEnd = Math.max(year, old.since + randomInt(1, 2)); // 예전 저장 파일: 계약 기간 채워 넣기
    const past = PAST_MANAGERS.find((x) => x.name === old.name);
    const rank = rankOf(team);
    const ps = rank <= 5;
    let reason = null;
    if ((past && past.until && year >= past.until) || (!(past && past.until) && old.born && year + 1 - old.born > 72)) {
      reason = "지휘봉 내려놓음"; // 나이
    } else if (year >= old.contractEnd) {
      // 계약 마지막 해: 가을야구 가면 대부분 재계약, 꼴찌권이면 대부분 교체
      const renew = rank === 1 ? 0.95 : ps ? 0.85 : rank <= 7 ? 0.5 : 0.15;
      if (Math.random() < renew) {
        old.contractEnd = year + randomInt(2, 3);
        if (team === myLastTeam && ps) report.news.push(`${team}, ${old.name} 감독과 재계약… "${rank === 1 ? "왕조를 이어간다" : "다음엔 더 높은 곳으로"}"`);
        continue;
      }
      reason = rank >= 8 ? "재계약 불발 (성적 부진)" : "계약 만료";
    } else if (rank >= 9 && Math.random() < 0.15) {
      reason = "성적 부진으로 경질"; // 계약 기간 중 경질은 드묾
    } else {
      continue;
    }
    if (reason !== "지휘봉 내려놓음" && changes.length >= 3) continue; // 한 겨울에 너무 많이 바뀌지 않게

    const cands = managerCandidates(player, year);
    if (!cands.length) continue;
    const next = { ...weightedPick(cands) };
    delete next.left;
    next.since = year + 1;
    next.contractEnd = year + randomInt(2, 3); // 보통 2~3년 계약
    player.managers[team] = next;
    player.managerPool[old.name] = { ...old, left: year };
    player.managerPool[next.name] = { ...next };
    player.managerRest[old.name] = year + 2;
    changes.push({ team, old, next, reason });
  }

  for (const c of changes) {
    if (player.rival && c.next.name === player.rival.name) { report.news.push(`라이벌 ${c.next.name}, ${c.team} 감독으로 돌아왔다… "${player.name}? 이제 적장으로 만나죠"`); continue; }
    report.news.push(c.next.legend
      ? `'레전드' ${c.next.name} 감독, ${c.team} 지휘봉 잡는다… ${c.old.name} 감독은 ${c.reason}`
      : `${c.team}, 새 사령탑에 ${c.next.name} 선임… ${c.old.name} 감독 ${c.reason}`);
  }

  // 다음 시즌 내 팀 감독이 바뀌면: 예전 약속은 없던 일, 면담도 새로
  const mine = player.league === "KBO" && changes.find((c) => c.team === player.team);
  if (mine) {
    player.starterPromise = false;
    player.lineup = null;
    if (player.role === "closer") player.role = null;
    player.campWish = null;
    player.meetingSeason = null;
    player.managerTrust = 0;
    player.closerOffer = false;
    const st = MANAGER_STYLES[mine.next.style];
    report.bigMoments = report.bigMoments || [];
    report.bigMoments.push({
      tone: mine.next.legend ? "gold" : "good",
      kicker: `${player.team} 감독 교체`,
      title: `${mine.next.legend ? "👑 " : ""}새 감독 ${mine.next.name}`,
      lines: [
        `${mine.old.name} 감독 ${mine.reason}`,
        mine.next.note ? mine.next.note : "새 얼굴의 지휘봉",
        `스타일: ${st.name}`,
        "예전 감독과의 약속은 없던 일이 됐어요. 면담으로 다시 어필해 보세요",
      ],
    });
  }
}

// KBO 10개 구단 감독 현황표 (감독 면담 패널 안)
function managerBoardHtml(player, year) {
  initManagers(player);
  const rows = Object.entries(player.managers).map(([team, m]) =>
    `<tr${team === player.team ? ' class="mine"' : ""}><td>${team}</td><td>${m.legend ? "👑 " : ""}${m.name}</td><td>${MANAGER_STYLES[m.style].name}</td><td>${Math.max(1, year - m.since + 1)}년째</td></tr>`).join("");
  return `<details class="mgr-board"><summary>KBO 감독 현황</summary><table class="standings"><tr><th>팀</th><th>감독</th><th>스타일</th><th>재임</th></tr>${rows}</table></details>`;
}

// =============================================
// 업적 더 다양하게 (v14)
// =============================================
const proSeasons = (p) => p.history.filter((h) => PRO_LEAGUES.includes(h.league) || h.league === "MILB");
const qualifiedBat = (h) => !isAmateur(h.league) && h.bat && h.bat.PA >= 3.1 * LEAGUES[h.league].games;
ACHIEVEMENTS.push(
  // 아마추어·커리어
  { id: "hsMonster", group: "아마추어", name: "고교 괴물", desc: "고교에서 타율 5할 또는 평균자책 0점대", check: (p) => p.history.some((h) => h.league === "HS" && ((h.bat && h.bat.AVG >= 0.5 && h.bat.PA >= 60) || (h.pit && h.pit.ERA < 1 && h.pit.outs >= 90))) },
  { id: "rookieWar", group: "커리어", name: "괴물 신인", desc: "1군 첫 시즌 WAR 5 이상", check: (p) => { const f = p.history.find((h) => TOP_LEAGUES.includes(h.league)); return !!f && f.WAR >= 5; } },
  { id: "oneClub", group: "커리어", name: "원클럽맨", desc: "프로 10시즌 이상을 한 팀에서만 뛰고 은퇴", check: (p) => p.retired && proSeasons(p).length >= 10 && new Set(proSeasons(p).filter((h) => TOP_LEAGUES.includes(h.league)).map((h) => h.team)).size === 1 },
  { id: "journey", group: "커리어", name: "저니맨", desc: "프로 1군 팀 5곳 이상에서 뛰기", check: (p) => new Set(p.history.filter((h) => TOP_LEAGUES.includes(h.league)).map((h) => h.team)).size >= 5 },
  { id: "worldTour", group: "커리어", name: "한·미·일 정복", desc: "KBO·NPB·MLB에서 모두 뛰기", check: (p) => ["KBO", "NPB", "MLB"].every((lg) => everIn(p, lg)) },
  { id: "traded", group: "커리어", name: "새 출발", desc: "트레이드 요청으로 팀 옮기기", check: (p) => !!p.traded },
  { id: "captain", group: "커리어", name: "캡틴", desc: "팀 주장 맡기", check: (p) => !!p.captainTeam },
  { id: "closerUp", group: "커리어", name: "뒷문 승격", desc: "감독이 먼저 마무리를 맡기기", check: (p) => !!p.closerPromoted },
  { id: "mega", group: "커리어", name: "메가 계약", desc: "8년 이상 초대형 계약 서명", check: (p) => !!p.megaSigned },
  { id: "abroadDefer", group: "커리어", name: "국외 체류 연기", desc: "MLB에서 뛰며 입대 연기", check: (p) => !!p.abroadDefer },
  { id: "legendBoss", group: "커리어", name: "레전드의 제자", desc: "👑 레전드 감독 밑에서 뛰기", check: (p) => (p.myManagers || []).some((n) => PAST_MANAGERS.some((m) => m.legend && m.name === n)) },
  { id: "rivalBoss", group: "커리어", name: "적장이 된 라이벌", desc: "은퇴한 라이벌이 KBO 감독이 되기", check: (p) => !!(p.rival && p.managerPool && p.managerPool[p.rival.name]) },
  // 시즌 기록
  { id: "thirty30", group: "시즌 기록", name: "30-30", desc: "한 시즌 30홈런·30도루 (프로)", check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.HR >= 30 && h.bat.SB >= 30) },
  { id: "forty40", group: "시즌 기록", name: "40-40", desc: "한 시즌 40홈런·40도루 (프로)", check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.HR >= 40 && h.bat.SB >= 40) },
  { id: "hit200", group: "시즌 기록", name: "200안타", desc: "한 시즌 200안타 (프로)", check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.H >= 200) },
  { id: "ops1000", group: "시즌 기록", name: "OPS 1.000", desc: "규정타석 채우고 OPS 1.000 이상", check: (p) => p.history.some((h) => qualifiedBat(h) && h.bat.OPS >= 1) },
  { id: "rbi130", group: "시즌 기록", name: "타점 기계", desc: "한 시즌 130타점 (프로)", check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.RBI >= 130) },
  { id: "ip200", group: "시즌 기록", name: "이닝 이터", desc: "한 시즌 200이닝 (프로)", check: (p) => p.history.some((h) => !isAmateur(h.league) && h.pit && h.pit.outs >= 600) },
  { id: "k300", group: "시즌 기록", name: "300K", desc: "한 시즌 300탈삼진 (프로)", check: (p) => p.history.some((h) => !isAmateur(h.league) && h.pit && h.pit.K >= 300) },
  { id: "hld30", group: "시즌 기록", name: "홀드 장인", desc: "한 시즌 30홀드 (프로)", check: (p) => p.history.some((h) => !isAmateur(h.league) && h.pit && h.pit.HLD >= 30) },
  { id: "war10", group: "시즌 기록", name: "WAR 10", desc: "한 시즌 WAR 10 이상", check: (p) => p.history.some((h) => !isAmateur(h.league) && h.WAR >= 10) },
  // 통산 기록
  { id: "hit3000", group: "통산 기록", name: "3000안타", desc: "프로 통산 3000안타", check: (p) => sumHist(p, "bat", "H") >= 3000 },
  { id: "win200", group: "통산 기록", name: "200승", desc: "프로 통산 200승", check: (p) => sumHist(p, "pit", "W") >= 200 },
  { id: "k2000", group: "통산 기록", name: "2000탈삼진", desc: "프로 통산 2000탈삼진", check: (p) => sumHist(p, "pit", "K") >= 2000 },
  { id: "sb400", group: "통산 기록", name: "도루 400", desc: "프로 통산 400도루", check: (p) => sumHist(p, "bat", "SB") >= 400 },
  { id: "war100", group: "통산 기록", name: "WAR 100", desc: "프로 통산 WAR 100", check: (p) => careerTotals(p).WAR >= 100 },
  // 수상
  { id: "regular1", group: "수상", name: "정규시즌 1위", desc: "정규시즌 우승", check: (p) => countAward(p, "정규시즌 우승") >= 1 },
  { id: "mvpRing", group: "수상", name: "완벽한 한 해", desc: "같은 해에 MVP와 시리즈 우승", check: (p) => p.history.some((h) => h.awards.some((a) => a.includes("MVP") && !a.includes("올스타")) && h.awards.some((a) => a.includes("시리즈 우승"))) },
  { id: "glove5", group: "수상", name: "황금 장갑 수집가", desc: "골든글러브·베스트나인 5회", check: (p) => countAward(p, "골든글러브") + countAward(p, "베스트나인") >= 5 },
  { id: "aceTwice", group: "수상", name: "에이스 중의 에이스", desc: "최동원상·사와무라상·사이영상 합쳐 3회", check: (p) => ["최동원상", "사와무라상", "사이영상"].reduce((t, a) => t + countAward(p, a), 0) >= 3 },
  { id: "aaron", group: "수상", name: "리그 최고의 타자", desc: "행크 애런상", check: (p) => countAward(p, "행크 애런상") >= 1 },
  { id: "reliever", group: "수상", name: "올해의 구원투수", desc: "마리아노 리베라상·트레버 호프먼상", check: (p) => countAward(p, "리베라상") + countAward(p, "호프먼상") >= 1 },
  { id: "comeback", group: "수상", name: "재기의 아이콘", desc: "올해의 재기상", check: (p) => countAward(p, "재기상") >= 1 },
  { id: "clemente", group: "수상", name: "그라운드 밖의 영웅", desc: "로베르토 클레멘테상", check: (p) => countAward(p, "클레멘테상") >= 1 },
  { id: "medals", group: "수상", name: "메달 컬렉터", desc: "국제대회 메달 3개", check: (p) => countAward(p, "메달") >= 3 },
  // 인생
  { id: "dad", group: "인생", name: "아빠 선수", desc: "아이 태어나기", check: (p) => (p.kids || 0) >= 1 },
  { id: "petLover", group: "인생", name: "집사", desc: "반려동물 키우기", check: (p) => !!p.pet },
  { id: "landlord", group: "인생", name: "건물주", desc: "건물주 되기", check: (p) => hasItem(p, "building") },
  { id: "islander", group: "인생", name: "섬 주인", desc: "남태평양 개인 섬 사기", check: (p) => hasItem(p, "island") },
  { id: "giver", group: "인생", name: "기부 천사", desc: "기부 아이템 4개 이상", check: (p) => ["donation", "foundation", "alma", "coal", "elderly", "disaster", "little", "camp"].filter((id) => hasItem(p, id)).length >= 4 },
  { id: "hyodo", group: "인생", name: "효자", desc: "부모님 집과 차 선물", check: (p) => hasItem(p, "parents") && hasItem(p, "parentsCar") },
  { id: "collector", group: "인생", name: "쇼핑왕", desc: "상점 아이템 20개 보유", check: (p) => (p.owned || []).length >= 20 },
);
