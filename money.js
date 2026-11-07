// =============================================
// money.js : 연봉, 계약, FA 제안, 재산과 쇼핑
// 금액은 모두 "만원" 단위임. (10000 = 1억)
// =============================================

// 선수 나이로 몇 년도인지 (16세 = 2026년)
function gameYear(player) {
  return START_YEAR + (player.age - 16);
}

// 고교·대학은 아마추어 (연봉 없음, 통산 기록에서 빠짐)
function isAmateur(league) {
  return league === "HS" || league === "COLLEGE";
}

// 화면에 보여주는 나이: 한국에서 흔히 쓰는 나이 (고1 = 17세)
// 게임 안 계산은 만 나이(player.age)로 하고, 보여줄 때만 +1 함
function koreanAge(age) {
  return age + 1;
}

// 물가 지수: 2026년 = 1, 매년 3%씩 오름
function priceIndex(player) {
  return Math.pow(1 + INFLATION, gameYear(player) - START_YEAR);
}

// 금액 보기 좋게: 12345 → "1.2억", 3000 → "3,000만"
function fmtMoney(won) {
  won = Math.round(won);
  if (Math.abs(won) >= 100000000) return `${(won / 100000000).toFixed(2)}조`;
  if (Math.abs(won) >= 10000) {
    const eok = won / 10000;
    return `${eok >= 100 ? Math.round(eok) : eok.toFixed(1)}억`;
  }
  return `${won.toLocaleString()}만`;
}

// 리그 최저 연봉 (물가 반영)
function minSalary(league, player) {
  const base = {
    HS: 0, COLLEGE: 0, INDIE: MONEY.indieSalary, ABL: MONEY.ablSalary,
    KBO2: MONEY.futuresMin, KBO: MONEY.kboMin, NPB: 15000, MLB: MONEY.mlbMin, MILB: 5000,
    SANGMU: MONEY.sangmuSalary, SOCIAL: MONEY.socialSalary,
  }[league];
  return Math.round(base * priceIndex(player));
}

// 최근 3시즌 평균 WAR
function recentWar(player) {
  // 고교, 상무, 사회복무 시즌은 빼고 계산함
  const last = player.history.filter((h) => !isAmateur(h.league) && !["SANGMU", "SOCIAL"].includes(h.league)).slice(-3);
  if (!last.length) return 0;
  return last.reduce((s, h) => s + h.WAR, 0) / last.length;
}

// 최근 2시즌 안에 받은 큰 상 (MVP는 몸값 x1.3, 타이틀은 x1.1)
function awardBonus(player) {
  let bonus = 1;
  for (const h of player.history.slice(-2)) {
    for (const a of h.awards) {
      if (a.includes("MVP")) bonus *= 1.3;
      else if (a.endsWith("왕") || a.includes("골든글러브") || a.includes("실버슬러거") || a.includes("사이영상")) bonus *= 1.1;
    }
  }
  return Math.min(bonus, 2);
}

// 시장 가치: 이 선수에게 리그가 1년에 줄 만한 돈
// 능력치(OVR)는 기본값만 정하고, 실제 몸값은 성적(WAR)과 수상이 크게 좌우함
function marketValue(player, league) {
  const ovr = getOvrs(player).best;
  const kbo = 3000 * Math.pow(1.18, ovr - 52);
  let value;
  if (league === "MLB") value = MONEY.mlbMin * Math.pow(1.18, ovr - 68);
  else if (league === "NPB") value = kbo * 1.3;
  else value = kbo;
  // 성적 배수: WAR 0 → 1배, 2 → 1.8배, 4 → 2.6배, 6 → 3.4배, 8 이상 → 최대 4.5배
  value *= 1 + clamp(recentWar(player) * 0.4, -0.4, 3.5);
  value *= awardBonus(player);
  // 팬 여론: 국민 스타(+100)는 x1.25, 공공의 적(-100)은 x0.75
  value *= 1 + (player.fame || 0) / 400;
  // 리그별 상한 (2026년 기준 연 KBO 30억, NPB 90억, MLB 600억)
  const cap = { MLB: 6000000, NPB: 900000 }[league] || 300000;
  value = Math.min(cap, value);
  // 나이가 많으면 몸값이 떨어짐
  if (player.age >= 33) value *= 0.75;
  if (player.age >= 36) value *= 0.7;
  return Math.max(minSalary(league, player), Math.round(value * priceIndex(player)));
}

// 계약서 만들기
function makeContract(league, team, years, total, bonus) {
  return { league, team, years, total, bonus, salary: Math.round((total - bonus) / years) };
}

// 시즌이 끝날 때 FA 전 선수의 연봉 협상
function negotiateSalary(player) {
  const c = player.contract;
  if (!c || c.isFA) return;
  // FA 전이라 시장가의 절반 정도, 최대 12억
  // 프랜차이즈 스타는 구단이 20% 더 챙겨줌
  const franchise = isFranchiseHere(player) ? 1.2 : 1;
  const target = Math.min(marketValue(player, player.league) * 0.5 * franchise, 120000 * priceIndex(player) * franchise);
  const next = Math.round(c.salary * 0.5 + target * 0.5);
  c.salary = Math.max(minSalary(player.league, player), next);
}

// ---------------------------------------------
// FA 제안 만들기: 팀마다 기간과 금액이 다름
// ---------------------------------------------
// 계약 기간: 나이가 기본, 최근 성적이 좋으면 더 길게 줌
function offerYears(player) {
  const age = player.age;
  const war = recentWar(player);
  let [min, max] = age <= 28 ? [4, 6] : age <= 31 ? [3, 5] : age <= 34 ? [2, 4] : age <= 37 ? [1, 3] : [1, 2];
  if (war >= 4) { min++; max++; }
  else if (war < 1) max = Math.max(min, max - 1);
  if (age >= 38) max = Math.min(max, 2);
  return randomInt(min, Math.min(max, 6));
}

function makeOffer(player, league, team, factor) {
  const years = offerYears(player);
  const annual = marketValue(player, league) * factor * (0.85 + Math.random() * 0.3);
  const total = Math.round(annual * years);
  const bonus = league === "MLB" ? 0 : Math.round(total * (0.2 + Math.random() * 0.2)); // 계약금
  return { league, team, years, total, bonus, salary: Math.round((total - bonus) / years) };
}

function generateOffers(player) {
  const ovr = getOvrs(player).best;
  const offers = [];
  const kboLevel = LEAGUES.KBO.level;

  // KBO 팀들: 실력이 좋을수록 많은 팀이 달려듦
  let kboCount = ovr >= kboLevel ? 3 : ovr >= kboLevel - 6 ? 2 : 1;
  // FA 등급: A등급은 보상(선수+연봉 200%) 부담 때문에 데려가려는 팀이 적고, C등급은 많음
  const isKboFa = player.league === "KBO" || player.league === "KBO2";
  const grade = isKboFa ? faGrade(player) : null;
  if (grade === "A") kboCount -= 1;
  if (grade === "C") kboCount += 1;
  let kboTeams = [...TEAMS.KBO].sort(() => Math.random() - 0.5);
  if (isKboFa && !kboTeams.slice(0, kboCount).includes(player.team)) {
    kboTeams.unshift(player.team); // 원소속팀은 항상 제안
  }
  // 포스팅으로 해외에 갔던 선수는 KBO로 돌아올 때 원소속팀하고만 계약할 수 있음 (보류권)
  if (!isKboFa && player.kboRights) kboTeams = [player.kboRights];
  for (const team of kboTeams.slice(0, Math.max(1, kboCount))) {
    // 원소속팀 우대: 프랜차이즈 스타면 30% 더
    const homeFactor = isFranchiseHere(player) ? 1.3 : 1.05;
    const otherFactor = grade === "A" ? 0.95 : 1; // 보상 부담만큼 조금 깎음
    offers.push(makeOffer(player, "KBO", team, team === player.team ? homeFactor : otherFactor));
  }
  // KBO·NPB에서 성적이 압도적이면 실력(OVR)이 조금 모자라도, 30대 중반이어도 해외에서 연락이 옴 (오승환 케이스)
  const buzz = overseasBuzz(player);
  const vet = player.age >= 32; // 베테랑은 1~2년 단기 계약
  const overseasOffer = (lg, team) => {
    const move = vet && lg !== player.league;
    const o = makeOffer(player, lg, team, move ? 0.8 : 1);
    if (move) {
      o.years = Math.min(o.years, 2);
      o.total = Math.round(o.salary * o.years + o.bonus);
      o.veteran = true;
    }
    return o;
  };
  if (ovr >= 69 || (buzz && ovr >= 60)) {
    for (const team of [...TEAMS.NPB].sort(() => Math.random() - 0.5).slice(0, ovr >= 72 || (buzz && buzz.strong) ? 2 : 1)) {
      offers.push(overseasOffer("NPB", team));
    }
  }
  if (ovr >= 72 || (buzz && ovr >= (buzz.npb ? 61 : 64))) { // NPB에서 통했으면 MLB 문턱이 더 낮음
    for (const team of [...TEAMS.MLB].sort(() => Math.random() - 0.5).slice(0, ovr >= 78 ? 3 : ovr >= 75 || (buzz && buzz.strong) ? 2 : 1)) {
      offers.push(overseasOffer("MLB", team));
    }
  }
  // 메가 계약: 압도적인 성적 + 아직 젊으면 돈 많은 MLB 구단이 8~12년 초대형 계약을 제시함
  // (MLB FA, 또는 NPB를 폭격하고 넘어오는 경우)
  const war = recentWar(player);
  const mlbLv = LEAGUES.MLB.level;
  const megaOk = player.age <= 31 && ovr >= mlbLv + 3 &&
    ((player.league === "MLB" && (war >= 6 || (war >= 4.5 && ovr >= mlbLv + 12))) ||
     (player.league === "NPB" && buzz && buzz.strong && ovr >= mlbLv + 5));
  if (megaOk) {
    const years = clamp(12 - Math.max(0, player.age - 26), 8, 12);
    const cap = 6000000 * priceIndex(player);
    for (const team of RICH_TEAMS.filter((t) => t !== player.team).sort(() => Math.random() - 0.5).slice(0, war >= 8 ? 2 : 1)) {
      const salary = Math.round(Math.min(cap, marketValue(player, "MLB") * (1.05 + Math.random() * 0.15)));
      offers.push({ league: "MLB", team, years, total: salary * years, bonus: 0, salary, mega: true });
    }
  }
  // 너무 많으면 고르기 힘드니 최대 6개, 금액 높은 순
  return offers.sort((a, b) => b.total - a.total).slice(0, 6);
}

// 돈 많은 MLB 구단 (메가 계약을 내밀 수 있는 팀)
const RICH_TEAMS = ["LA 다저스", "뉴욕 양키스", "뉴욕 메츠", "필라델피아 필리스", "보스턴 레드삭스", "토론토 블루제이스", "샌디에이고 파드리스", "시카고 컵스", "샌프란시스코 자이언츠", "텍사스 레인저스"];

// 해외 구단이 주목하는 성적인지: 최근 시즌 KBO·NPB에서
// WAR 5 이상, MVP, 타이틀(홈런왕·세이브왕 등), 또는 마무리로 30세이브 + 평균자책 2점대 초반
// 성적으로만 정해짐 (운 요소 없음). strong이면 더 많은 팀이 연락함
function overseasBuzz(player) {
  const recent = player.history.filter((h) => ["KBO", "NPB"].includes(h.league)).slice(-2);
  if (!recent.length || !["KBO", "NPB"].includes(player.league)) return null;
  const last = recent[recent.length - 1];
  const reasons = [];
  if (recent.some((h) => h.WAR >= 5)) reasons.push("WAR 5+");
  if (recent.some((h) => h.awards.some((a) => a.includes("MVP") && !a.includes("올스타")))) reasons.push("MVP");
  const titles = Object.values(TITLE_NAMES);
  const title = recent.flatMap((h) => h.awards).find((a) => titles.includes(a));
  if (title) reasons.push(title);
  const closer = recent.find((h) => h.pit && h.pit.SV >= 30 && h.pit.ERA <= 2.5);
  if (closer) reasons.push(`${closer.pit.SV}세이브`);
  // 필승조도 압도적이면 (홀드+세이브 25개 이상, 평균자책 2.3 이하, WAR 3 이상)
  const setup = recent.find((h) => h.pit && h.pit.HLD + h.pit.SV >= 25 && h.pit.ERA <= 2.3 && h.WAR >= 3);
  if (!closer && setup) reasons.push(`필승조 평균자책 ${setup.pit.ERA.toFixed(2)}`);
  if (!reasons.length) return null;
  return { reasons, strong: reasons.length >= 2 || last.WAR >= 6, npb: last.league === "NPB" };
}

// FA 선택지 만들기
function faChoice(player, reason) {
  const offers = generateOffers(player);
  const options = offers.map((o, i) => ({
    id: `offer${i}`,
    label: `${o.team} (${LEAGUES[o.league].name})`,
    detail: `${o.mega ? "💰 메가 계약 · " : ""}${o.veteran ? (o.years === 2 ? "1+1년 (베테랑 단기 계약) · " : "1년 단기 계약 · ") : ""}${o.years}년 총액 ${fmtMoney(o.total)}${o.bonus ? ` · 계약금 ${fmtMoney(o.bonus)}` : ""} · 연봉 ${fmtMoney(o.salary)}`,
    offer: o,
  }));
  // KBO FA는 신청하지 않고 1년 더 뛸 수도 있음 (자격은 그대로 남음)
  if (player.league === "KBO" || player.league === "KBO2") {
    options.push({ id: "nofile", label: "FA 신청 안 하고 잔류", detail: "원소속팀과 1년 연봉 계약 · FA 자격은 유지돼요" });
  }
  if (player.age >= 33) options.push({ id: "retire", label: "여기서 은퇴한다" });
  // 베테랑인데 해외 오퍼가 왔으면 크게 알려줌
  const buzz = overseasBuzz(player);
  if (buzz && offers.some((o) => o.veteran)) {
    const lgs = [...new Set(offers.filter((o) => o.veteran).map((o) => LEAGUES[o.league].name))].join("·");
    reason = `🌏 ${koreanAge(player.age)}세지만 ${buzz.reasons.join(", ")} 성적을 보고 ${lgs} 구단이 연락해 왔어요! ` + reason;
  }
  return { key: "fa", text: reason, options };
}

// 계약 확정
function signContract(player, offer) {
  const moved = offer.league !== player.league || offer.team !== player.team;
  // KBO FA 계약을 맺으면 재자격까지 다시 1군 4시즌이 필요함
  if (offer.league === "KBO" && (player.league === "KBO" || player.league === "KBO2")) {
    player.faCount = (player.faCount || 0) + 1;
    player.lastFaService = player.kboService || 0;
  }
  if (offer.league === "KBO") player.kboRights = null; // KBO로 돌아오면 보류권 정리
  player.league = offer.league;
  player.team = offer.team;
  player.contract = { ...makeContract(offer.league, offer.team, offer.years, offer.total, offer.bonus), isFA: true };
  addMoney(player, offer.bonus); // 계약금은 바로 들어옴
  return moved;
}

// ---------------------------------------------
// 재산
// ---------------------------------------------
// 세금과 생활비를 빼고 35%는 나감
function addMoney(player, amount) {
  player.money = (player.money || 0) + Math.round(amount * 0.65);
}

// 시즌이 끝나면 연봉이 들어옴
function payday(player, report) {
  const salary = player.contract ? player.contract.salary : minSalary(player.league, player);
  addMoney(player, salary);
  payServices(player, report); // 전담 스태프 연 계약 (world.js)
  return salary;
}

function itemPrice(player, item) {
  return Math.round(item.price * priceIndex(player));
}

function hasItem(player, id) {
  if (player.services && player.services[id]) return true; // 계약 중인 전담 스태프
  return (player.owned || []).includes(id);
}

function buyItem(player, id) {
  const item = SHOP_ITEMS.find((i) => i.id === id);
  const price = itemPrice(player, item);
  if (item.service || hasItem(player, id) || player.money < price) return false;
  player.money -= price;
  player.owned.push(id);
  if (item.fame) changeFame(player, item.fame);
  return true;
}
