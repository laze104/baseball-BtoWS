// =============================================
// player.js : 선수 한 명 만들기 + 예전 저장 데이터 채우기
// 새 선수든 불러온 선수든 initCareer 를 거치면 필요한 칸이 다 채워짐
// =============================================

// ---------------------------------------------
// 1. 능력치와 OVR
// ---------------------------------------------

function getStatKeys(type) {
  if (type === "batter") return Object.keys(BATTER_STATS);
  if (type === "pitcher") return Object.keys(PITCHER_STATS);
  return [...Object.keys(BATTER_STATS), ...Object.keys(PITCHER_STATS)];
}

function getStatNames(type) {
  if (type === "batter") return BATTER_STATS;
  if (type === "pitcher") return PITCHER_STATS;
  return { ...BATTER_STATS, ...PITCHER_STATS };
}

// 스타일 가중치대로 능력치 포인트를 나눠줌
function rollStats(type, styleName) {
  const keys = getStatKeys(type);
  const bonus = STYLES[type][styleName];

  // 타고난 재능: 선수마다 총합이 START_TOTAL ± 30 사이에서 달라짐
  let total = START_TOTAL + randomInt(-30, 30);
  if (type === "twoway") total = Math.round(total * 1.6); // 이도류: 14개 능력치라 총량을 조금 더 줌

  const weights = keys.map((key) => bonus[key] || 1);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);

  const stats = {};
  keys.forEach((key, i) => {
    const base = (total * weights[i]) / weightSum;
    const value = Math.round(base) + randomInt(-20, 20); // 능력치마다 ±20 흔들기
    stats[key] = Math.max(1, Math.min(99, value));
  });
  return stats;
}

// 포지션에 맞춰 OVR(종합 능력치)을 계산함
function calcOvr(stats, statNames, position) {
  const focus = POSITION_FOCUS[position] || [];
  let total = 0;
  let count = 0;
  for (const key of Object.keys(statNames)) {
    if (position === "지명타자" && (key === "defense" || key === "arm")) continue; // 지명타자는 수비 능력치 제외
    const weight = focus.includes(key) ? 2 : 1;
    total += stats[key] * weight;
    count += weight;
  }
  return Math.round(total / count);
}

// 타자 OVR, 투수 OVR, 둘 중 높은 값
function getOvrs(player) {
  const [first, second] = player.position.split(" 겸 ");
  const result = { bat: null, pit: null };
  if (player.type === "batter") result.bat = calcOvr(player.stats, BATTER_STATS, first);
  if (player.type === "pitcher") result.pit = calcOvr(player.stats, PITCHER_STATS, first);
  if (player.type === "twoway") {
    result.pit = calcOvr(player.stats, PITCHER_STATS, first);
    result.bat = calcOvr(player.stats, BATTER_STATS, second);
  }
  result.best = Math.max(result.bat || 0, result.pit || 0);
  return result;
}

// ---------------------------------------------
// 2. 선수 만들기
// ---------------------------------------------

function createPlayer(info) {
  const player = { ...info, age: 16, season: 1, stats: rollStats(info.type, info.style) };
  return initCareer(player);
}

// ---------------------------------------------
// 3. 빠진 칸 채우기 (새 선수 + 예전 저장 데이터)
// ---------------------------------------------

// 예전 저장 데이터나 새 선수에 커리어 정보를 채워줌
function initCareer(player) {
  if (!player.league) player.league = "HS";
  if (!player.team) player.team = player.school;
  if (!player.history) player.history = [];
  if (!player.awards) player.awards = {};
  if (player.proSeasons === undefined) player.proSeasons = 0;
  if (player.bestOvr === undefined) player.bestOvr = getOvrs(player).best;
  if (player.retired === undefined) player.retired = false;
  if (player.pendingChoice === undefined) player.pendingChoice = null;
  if (!player.choiceQueue) player.choiceQueue = [];
  if (!player.leagueSeasons) player.leagueSeasons = {};
  if (player.money === undefined) player.money = 0;
  if (!player.owned) player.owned = [];
  if (player.fame === undefined) player.fame = 0;
  if (!player.rival) player.rival = createRival(player);
  initService(player); // 1군 등록 시즌 수
  initGrowth(player); // 성장유형 (growth.js)
  initHidden(player); // 숨은 특성, 전담 스태프 계약, 예전 저장 고치기
  initNemesis(player); // 숙적 목록 (nemesis.js)
  initNumber(player); // 등번호 (fanfare.js)
  initBalls(player); // 기념구 (ceremony.js)
  applyWorldState(player); // 시대·신생구단 다시 적용 (era.js)
  if (!player.contract && !isAmateur(player.league)) {
    player.contract = makeContract(player.league, player.team, 1, minSalary(player.league, player), 0);
  }
  return player;
}

// 예전 저장 데이터: 1군 시즌 수를 기록에서 다시 셈
function initService(player) {
  if (player.kboService === undefined) {
    player.kboService = player.history.filter((h) => h.league === "KBO").length;
    if (player.contract && player.contract.isFA && player.league === "KBO") {
      player.faCount = 1;
      player.lastFaService = player.kboService;
    }
  }
  if (player.mlbService === undefined) player.mlbService = player.history.filter((h) => h.league === "MLB").length;
}

// 성장유형 (화면엔 안 보여줌)
function initGrowth(player) {
  if (!player.growthType) player.growthType = rollGrowthType();
}

// 숨은 특성(늦깎이·해외 체질)과 전담 스태프 칸. 예전 저장 데이터에서 달라진 것도 여기서 고침
function initHidden(player) {
  if (!player.hidden) {
    player.hidden = {
      lateBloom: Math.random() < 0.06, // 노경은처럼 늦게 꽃피는 선수
      overseas: Math.random() < 0.04, // 류현진처럼 해외에서도 통하는 선수
    };
  }
  if (!player.services) player.services = {};
  initTraits(player); // 유리몸, 계절 특성, 국대 기록
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

// 예전 저장 데이터에도 새 숨은 특성을 채워줌 (플레이어한텐 끝까지 안 보여줌)
function initTraits(player) {
  const h = player.hidden || (player.hidden = {});
  if (h.glass === undefined) h.glass = Math.random() < 0.03; // 유리몸: 진짜 가끔
  if (h.season === undefined) {
    const r = Math.random();
    h.season = r < 0.05 ? "spring" : r < 0.1 ? "summer" : r < 0.15 ? "fall" : null;
  }
  if (!player.nationalHistory) player.nationalHistory = [];
  fillOldFielding(player);
  if (player.faEarned === undefined) {
    // 예전 데이터는 지금 FA 계약만 알 수 있음
    const c = player.contract;
    player.faEarned = c && c.isFA ? c.total || 0 : 0;
    player.faDeals = c && c.isFA ? 1 : 0;
  }
}

// v15 전에 치른 시즌은 실책 기록이 없어서, 그 시즌 출전 기록 + 지금 수비 능력치로 채워 넣음
function fillOldFielding(player) {
  if (player.fieldingFilled) return;
  player.fieldingFilled = true;
  const [first, second] = player.position.split(" 겸 ");
  const batPos = second || first;
  for (const h of player.history || []) {
    const lv = LEAGUES[h.league] ? LEAGUES[h.league].level : 50;
    if (h.bat && h.bat.G && h.bat.CH === undefined && FIELD_POS[batPos]) Object.assign(h.bat, fieldingSeason(player.stats, lv, 0, batPos, h.bat));
    if (h.pit && h.pit.outs && h.pit.CH === undefined) Object.assign(h.pit, pitcherFielding(player.stats, lv, 0, h.pit));
  }
}
