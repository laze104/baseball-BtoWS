// =============================================
// legacy.js : 선수마다 다른 성장유형, 업적 도감, 명예의 전당
// 업적과 명예의 전당은 선수가 바뀌어도 브라우저에 계속 남음
// =============================================

// ---------------------------------------------
// 1. 성장유형 (선수를 만들 때 랜덤으로 정해짐)
// up: 성장하는 나이에 곱하는 값, down: 노쇠하는 나이에 곱하는 값
// ---------------------------------------------
const GROWTH_TYPES = [
  {
    id: "early",
    name: "조기 완성형",
    weight: 25,
    desc: "어릴 때 쑥쑥 크지만 일찍 꺾여요",
    up: (age) => (age <= 20 ? 1.4 : age <= 23 ? 1.15 : age <= 27 ? 0.7 : 0.4),
    down: 1.3,
  },
  { id: "normal", name: "표준형", weight: 35, desc: "나이에 맞게 평범하게 커요", up: () => 1, down: 1 },
  {
    id: "late",
    name: "대기만성형",
    weight: 20,
    desc: "늦게 터져요. 20대 중후반이 전성기",
    up: (age) => (age <= 20 ? 0.7 : age <= 23 ? 0.95 : age <= 27 ? 1.7 : 2.5),
    down: 0.85,
  },
  { id: "steady", name: "꾸준형", weight: 15, desc: "폭발력은 덜해도 오래 버텨요", up: () => 0.95, down: 0.5 },
  { id: "genius", name: "천재형", weight: 5, desc: "모든 나이에 잘 커요 (아주 드물어요)", up: () => 1.3, down: 0.9 },
];

function rollGrowthType() {
  const total = GROWTH_TYPES.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of GROWTH_TYPES) {
    r -= t.weight;
    if (r < 0) return t.id;
  }
  return "normal";
}

function growthType(player) {
  return GROWTH_TYPES.find((t) => t.id === player.growthType) || GROWTH_TYPES[1];
}

// career.js의 growPlayer가 쓰는 기본 성장량
function typedGrowth(player) {
  const base = baseGrowth(player.age);
  const t = growthType(player);
  return base > 0 ? base * t.up(player.age) : base * t.down;
}

function initLegacy(player) {
  if (!player.growthType) player.growthType = rollGrowthType();
}

// ---------------------------------------------
// 2. 업적 도감
// ---------------------------------------------
const ACH_KEY = "baseball-achievements";

const sumHist = (p, side, key) => p.history.filter((h) => !isAmateur(h.league) && h[side]).reduce((s, h) => s + (h[side][key] || 0), 0);
const everIn = (p, lg) => p.history.some((h) => h.league === lg) || p.league === lg;

const ACHIEVEMENTS = [
  // 아마추어
  { id: "hsTitle", group: "아마추어", name: "고교 챔피언", desc: "고교 전국대회 우승", check: (p) => hsTitles(p) >= 1 },
  {
    id: "hsSlam",
    group: "아마추어",
    name: "고교 그랜드슬램",
    desc: "5개 고교 전국대회를 모두 우승",
    check: (p) => HS_TOURNAMENTS.every((n) => p.awards[`${n} 우승`]),
  },
  { id: "college", group: "아마추어", name: "캠퍼스 스타", desc: "대학을 거쳐 프로 입단", check: (p) => p.collegeGrad && PRO_LEAGUES.includes(p.league) },
  { id: "round1", group: "아마추어", name: "최대어", desc: "1라운드 지명으로 입단", check: (p) => p.draftRound === 1 && !isAmateur(p.league) },
  {
    id: "weed",
    group: "아마추어",
    name: "잡초",
    desc: "독립리그·호주리그를 거쳐 프로 입단",
    check: (p) => (everIn(p, "INDIE") || everIn(p, "ABL")) && everIn(p, "KBO2"),
  },
  // 프로 커리어
  { id: "debut", group: "커리어", name: "1군 데뷔", desc: "KBO 1군에서 한 시즌", check: (p) => everIn(p, "KBO") },
  { id: "fa", group: "커리어", name: "FA 대박", desc: "KBO FA 계약 성공", check: (p) => (p.faCount || 0) >= 1 },
  { id: "posting", group: "커리어", name: "포스팅 성공", desc: "포스팅으로 해외 진출", check: (p) => !!p.kboRights },
  { id: "npb", group: "커리어", name: "일본 무대", desc: "NPB에서 뛰기", check: (p) => everIn(p, "NPB") },
  { id: "mlb", group: "커리어", name: "메이저리거", desc: "MLB에서 뛰기", check: (p) => everIn(p, "MLB") },
  {
    id: "mlbFA",
    group: "커리어",
    name: "억대 달러",
    desc: "MLB 총액 1,000억 이상 계약",
    check: (p) => p.contract && p.contract.league === "MLB" && p.contract.total >= 10000000,
  },
  { id: "franchise", group: "커리어", name: "프랜차이즈 스타", desc: "한 팀의 얼굴이 되기", check: (p) => !!p.franchise },
  { id: "number", group: "커리어", name: "영구결번", desc: "등번호가 영원히 남기", check: (p) => countAward(p, "영구결번") >= 1 },
  {
    id: "forty",
    group: "커리어",
    name: "불혹의 현역",
    desc: "40세(한국 나이)에도 프로에서 뛰기",
    check: (p) => p.history.some((h) => PRO_LEAGUES.includes(h.league) && koreanAge(h.age) >= 40),
  },
  { id: "army", group: "커리어", name: "군필", desc: "병역을 마치고 복귀", check: (p) => p.military === "done" },
  {
    id: "exempt",
    group: "커리어",
    name: "병역 특례",
    desc: "메달로 병역 특례 받기",
    check: (p) => p.military === "exempt" || p.history.some((h) => h.events.includes("병역 특례")),
  },
  // 시즌 기록 (타자)
  {
    id: "hr40",
    group: "시즌 기록",
    name: "40홈런",
    desc: "한 시즌 40홈런 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.HR >= 40),
  },
  {
    id: "hr50",
    group: "시즌 기록",
    name: "50홈런",
    desc: "한 시즌 50홈런 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.HR >= 50),
  },
  {
    id: "avg400",
    group: "시즌 기록",
    name: "4할 타자",
    desc: "규정타석 채우고 타율 4할 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.AVG >= 0.4 && h.bat.PA >= 400),
  },
  {
    id: "sb50",
    group: "시즌 기록",
    name: "대도",
    desc: "한 시즌 50도루 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.bat && h.bat.SB >= 50),
  },
  {
    id: "triple",
    group: "시즌 기록",
    name: "타격 3관왕",
    desc: "한 해에 타격왕·홈런왕·타점왕",
    check: (p) => p.history.some((h) => ["타격왕", "홈런왕", "타점왕"].every((a) => h.awards.includes(a))),
  },
  { id: "cycle", group: "시즌 기록", name: "사이클링 히트", desc: "결정적 순간에 사이클링 히트", check: (p) => countAward(p, "사이클링 히트") >= 1 },
  // 시즌 기록 (투수)
  {
    id: "win20",
    group: "시즌 기록",
    name: "20승",
    desc: "한 시즌 20승 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.pit && h.pit.W >= 20),
  },
  {
    id: "k250",
    group: "시즌 기록",
    name: "닥터 K",
    desc: "한 시즌 250탈삼진 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.pit && h.pit.K >= 250),
  },
  {
    id: "sv40",
    group: "시즌 기록",
    name: "철벽 마무리",
    desc: "한 시즌 40세이브 (프로)",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.pit && h.pit.SV >= 40),
  },
  {
    id: "era1",
    group: "시즌 기록",
    name: "1점대 에이스",
    desc: "규정이닝 채우고 평균자책 1점대",
    check: (p) => p.history.some((h) => !isAmateur(h.league) && h.pit && h.pit.ERA < 2 && h.pit.outs >= 3 * LEAGUES[h.league].games),
  },
  {
    id: "pTriple",
    group: "시즌 기록",
    name: "투수 3관왕",
    desc: "한 해에 다승왕·평균자책점왕·탈삼진왕",
    check: (p) => p.history.some((h) => ["다승왕", "평균자책점왕", "탈삼진왕"].every((a) => h.awards.includes(a))),
  },
  { id: "nohit", group: "시즌 기록", name: "노히트노런", desc: "결정적 순간에 노히트노런", check: (p) => countAward(p, "노히트노런") >= 1 },
  // 통산 기록
  { id: "hr300", group: "통산 기록", name: "300홈런", desc: "프로 통산 300홈런", check: (p) => sumHist(p, "bat", "HR") >= 300 },
  { id: "hr500", group: "통산 기록", name: "500홈런", desc: "프로 통산 500홈런", check: (p) => sumHist(p, "bat", "HR") >= 500 },
  { id: "hit2000", group: "통산 기록", name: "2000안타", desc: "프로 통산 2000안타", check: (p) => sumHist(p, "bat", "H") >= 2000 },
  { id: "win150", group: "통산 기록", name: "150승", desc: "프로 통산 150승", check: (p) => sumHist(p, "pit", "W") >= 150 },
  { id: "sv300", group: "통산 기록", name: "300세이브", desc: "프로 통산 300세이브", check: (p) => sumHist(p, "pit", "SV") >= 300 },
  { id: "war60", group: "통산 기록", name: "WAR 60", desc: "프로 통산 WAR 60", check: (p) => careerTotals(p).WAR >= 60 },
  // 수상
  { id: "rookie", group: "수상", name: "신인왕", desc: "신인왕 수상", check: (p) => countAward(p, "신인왕") >= 1 },
  { id: "mvp", group: "수상", name: "MVP", desc: "정규시즌 MVP", check: (p) => countAward(p, "MVP") >= 1 },
  { id: "mvp3", group: "수상", name: "MVP 3회", desc: "정규시즌 MVP 3번", check: (p) => countAward(p, "MVP") >= 3 },
  { id: "ring", group: "수상", name: "우승 반지", desc: "프로 시리즈 우승", check: (p) => countAward(p, "시리즈 우승") >= 1 },
  { id: "dynasty", group: "수상", name: "왕조의 주역", desc: "프로 시리즈 우승 5번", check: (p) => countAward(p, "시리즈 우승") >= 5 },
  { id: "hero", group: "수상", name: "시리즈의 영웅", desc: "시리즈 최우수선수", check: (p) => countAward(p, "최우수선수") >= 1 },
  { id: "gold", group: "수상", name: "금메달", desc: "국제대회 금메달", check: (p) => countAward(p, "금메달") + countAward(p, "WBC 우승") >= 1 },
  {
    id: "twoway",
    group: "수상",
    name: "진짜 이도류",
    desc: "이도류로 투타 OVR 모두 65 이상",
    check: (p) => p.type === "twoway" && getOvrs(p).bat >= 65 && getOvrs(p).pit >= 65,
  },
  // 인생
  { id: "star", group: "인생", name: "국민 스타", desc: "팬 여론 80 이상", check: (p) => (p.fame || 0) >= 80 },
  { id: "villain", group: "인생", name: "공공의 적", desc: "팬 여론 -60 이하", check: (p) => (p.fame || 0) <= -60 },
  { id: "married", group: "인생", name: "가장", desc: "결혼하기", check: (p) => !!p.married },
  { id: "rich", group: "인생", name: "100억 자산가", desc: "재산 100억", check: (p) => (p.money || 0) >= 1000000 },
  { id: "richer", group: "인생", name: "1000억 자산가", desc: "재산 1000억", check: (p) => (p.money || 0) >= 10000000 },
  {
    id: "rival",
    group: "인생",
    name: "라이벌 압승",
    desc: "은퇴할 때 통산 WAR가 라이벌의 2배 이상",
    check: (p) => p.retired && p.rival && careerTotals(p).WAR >= 10 && careerTotals(p).WAR >= 2 * Math.max(1, rivalSummary(p.rival).WAR),
  },
  { id: "hof", group: "인생", name: "명예의 전당", desc: "명예의 전당 헌액", check: (p) => p.hof && p.hof.inducted },
  { id: "hofFirst", group: "인생", name: "첫 투표 헌액", desc: "은퇴 후 첫 투표에서 바로 헌액", check: (p) => p.hof && p.hof.inducted && p.hof.ballot === 1 },
];

function loadAchievements() {
  return loadJSON(ACH_KEY, {});
}

// 새로 달성한 업적 이름 목록을 돌려줌
function checkAchievements(player) {
  const got = loadAchievements();
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (got[a.id]) continue;
    let ok = false;
    try {
      ok = a.check(player);
    } catch (e) {
      ok = false;
    }
    if (ok) {
      got[a.id] = { by: player.name, year: gameYear(player) };
      fresh.push(a.name);
    }
  }
  if (fresh.length) {
    saveJSON(ACH_KEY, got);
  }
  return fresh;
}

// ---------------------------------------------
// 3. 명예의 전당: 은퇴 5년 뒤부터 최대 10번 투표, 75% 이상이면 헌액, 5% 미만이면 탈락
// ---------------------------------------------
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
