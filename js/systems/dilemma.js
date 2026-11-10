// =============================================
// dilemma.js : 딜레마 선택지
// 1. 숨긴 부상: 우승 걸린 경기 직전 검진 → 숨기고 뛸지 말할지
// 2. FA 갈림길: 💰 최고액 / 🏆 우승 전력 / 🏠 고향 팀
// 3. 승부조작 제안: 신고 / 무시 / 받기 (받으면 나중에 걸릴 수 있음 → 영구 제명)
// =============================================

// ---------------------------------------------
// 1. 숨긴 부상
// ---------------------------------------------
const PAIN_PARTS = { bat: ["옆구리", "손목", "햄스트링", "허리"], pit: ["팔꿈치", "어깨", "옆구리", "허리"] };

function findClutch(player) {
  return [player.pendingChoice, ...(player.choiceQueue || [])].find((c) => c && c.key === "clutch") || null;
}

// afterSeasonStory 뒤에 부름. 우승 결정전·준우승 시리즈 결정전에만 12%
function maybeHiddenPain(player, report) {
  const c = findClutch(player);
  if (!c || !["seriesHero", "game7"].includes(c.kind) || Math.random() >= 0.12) return;
  const part = pick(PAIN_PARTS[c.side]);
  pushChoiceFirst(player, {
    key: "hiddenPain",
    part,
    text: `🩺 ${c.series || "포스트시즌"} 직전 비공개 검진에서 <b>${part}</b> 쪽 염증이 나왔어요. 아직 트레이너만 알아요.<br>"말하면 엔트리에서 빠집니다. 참고 뛰면… 그건 선수 본인 선택이에요."`,
    options: [
      { id: "hide", label: "숨기고 뛴다", detail: "결정적 순간 집중력 ↓ · 다음 시즌 큰 부상 위험 ↑" },
      { id: "tell", label: "솔직하게 말하고 빠진다", detail: "엔트리 제외 · 시리즈는 동료들에게 맡겨요" },
    ],
  });
}

function resolveHiddenPain(player, choice, option) {
  const c = findClutch(player);
  const news = [];
  if (option.id === "hide") {
    if (c) c.pain = true; // resolveClutch 에서 -10%p
    player.painRisk = choice.part; // 다음 시즌 부상 위험 (body.js)
    news.push(`${player.name}, 진통제 맞고 출전 강행… "지금 아니면 언제 뛰나"`);
    return news;
  }
  // 말하고 빠짐: 결정적 순간 없이 팀이 알아서
  if (c) {
    player.choiceQueue = (player.choiceQueue || []).filter((x) => x !== c);
    if (player.pendingChoice === c) nextChoice(player);
  }
  const r = player.lastReport;
  const lastPs = r && r.postseason ? r.postseason[r.postseason.length - 1] : null;
  const won = Math.random() < (c && c.kind === "seriesHero" ? 0.5 : 0.3);
  if (lastPs && lastPs.pending) {
    lastPs.pending = false;
    lastPs.won = won;
  }
  const h = player.history[player.history.length - 1];
  const lg = h ? h.league : player.league;
  changeFame(player, 2);
  player.painTold = (player.painTold || 0) + 1;
  news.push(`${player.name}, ${choice.part} 부상 고백하고 엔트리 제외… "팀에 짐이 될 수는 없었다"`);
  if (won && CHAMPIONSHIP[lg]) {
    lateAward(player, CHAMPIONSHIP[lg]);
    news.push(`${player.team}, ${(c && c.series) || "시리즈"} 우승! 더그아웃에서 지켜본 ${player.name}도 함께 울었다`);
  } else {
    news.push(`${player.team}, ${(c && c.series) || "시리즈"} 준우승… ${player.name} 빈자리 컸다`);
  }
  return news;
}

// ---------------------------------------------
// 2. FA 갈림길
// ---------------------------------------------
// 고교 지역 → 고향 KBO 팀
const HOME_TEAMS = {
  "서울": ["LG 트윈스", "두산 베어스", "키움 히어로즈"],
  "경기·인천": ["SSG 랜더스", "KT 위즈"],
  "충청·강원": ["한화 이글스"],
  "호남·제주": ["KIA 타이거즈"],
  "대구·경북": ["삼성 라이온즈"],
  "부산·경남": ["롯데 자이언츠", "NC 다이노스"],
};

function homeTeamOf(player) {
  if (player.homeTeam === undefined) {
    const list = HOME_TEAMS[hsRegion(player.school)] || [];
    player.homeTeam = list.length ? pick(list) : null; // 한 번 정하면 그 팀이 고향 팀
  }
  return player.homeTeam;
}

// 지난 시즌 순위 3위 안 (KBO), 해외는 30% 확률로 우승 후보
function isContender(player, o) {
  if (o.contender !== undefined) return o.contender;
  const st = player.lastReport && player.lastReport.standing;
  if (o.league === "KBO" && st && st.table && player.lastReport.league === "KBO") {
    const i = st.table.findIndex((t) => t.team === o.team);
    o.contender = i >= 0 && i < 3;
  } else {
    o.contender = Math.random() < 0.3;
  }
  return o.contender;
}

// 처음 FA 열릴 때: 고향 팀이 없으면 55% 확률로 고향 팀이 연락 옴 (돈은 조금 적게)
function addHomeOffer(player, offers) {
  const home = homeTeamOf(player);
  if (!home || !(player.league === "KBO" || player.league === "KBO2" || ["MLB", "NPB", "MILB"].includes(player.league))) return offers;
  if (offers.some((o) => o.team === home) || player.kboRights || Math.random() >= 0.55) return offers;
  const o = makeOffer(player, "KBO", home, 0.88);
  o.homeCall = true;
  return [...offers, o];
}

// 태그 붙이기 (기다리기·협상 뒤에도 다시 계산)
function markFaPaths(player, offers) {
  if (offers.length < 2) return offers;
  const home = homeTeamOf(player);
  const top = Math.max(...offers.map((o) => o.total));
  for (const o of offers) {
    o.richest = o.total === top;
    o.hometown = !!home && o.team === home;
    isContender(player, o);
  }
  return offers;
}

function faPathTags(o) {
  return `${o.richest ? "💰 최고액 · " : ""}${o.contender ? "🏆 우승 전력 · " : ""}${o.hometown ? "🏠 고향 팀 · " : ""}`;
}

// 계약하고 나서: 어떤 길을 골랐는지
function faPathResult(player, o, stayed) {
  const news = [];
  player.lastFaPath = null;
  if (o.hometown && !stayed) {
    player.lastFaPath = "home";
    player.homeSigned = true;
    changeFame(player, 4);
    news.push(`${player.name}, 고향 팀 ${o.team} 품으로… "어릴 때 응원하던 팀에서 뛰고 싶었다"`);
  } else if (o.contender && !stayed && !o.richest) {
    player.lastFaPath = "win";
    player.contenderTeam = o.team; // 그 팀 있는 동안 팀 승률 보너스 (flow.js)
    news.push(`${player.name}, 돈보다 반지… 우승 전력 ${o.team} 선택`);
  } else if (o.richest && !stayed && !o.hometown && !o.contender) {
    player.lastFaPath = "money";
    player.moneyMeme = (player.moneyMeme || 0) + 1;
    changeFame(player, -3);
    news.push(`${player.name}, 최고액 제시한 ${o.team} 행… 팬들 "결국 돈 따라갔네"`);
  }
  if (o.contender && !stayed) player.contenderTeam = o.team;
  return news;
}

// ---------------------------------------------
// 3. 승부조작 제안
// ---------------------------------------------
function maybeFixingOffer(player, report) {
  if (player.banned || player.retired || !["KBO", "KBO2"].includes(player.league) || player.fixing) return;
  if ((player.fixOffers || 0) >= 2 || Math.random() >= 0.008) return;
  player.fixOffers = (player.fixOffers || 0) + 1;
  const amount = Math.round(5000 * priceIndex(player));
  const ask = player.type === "batter" ? "1회 첫 타석 삼진 하나" : "1회 첫 타자 볼넷 하나";
  pushChoice(player, {
    key: "fixing",
    amount,
    text: `✉️ 모르는 번호로 연락이 왔어요.<br>"다음 주 경기, <b>${ask}</b>만 부탁합니다. 현금 ${fmtMoney(amount)} 바로 드려요. 경기 결과엔 아무 지장 없고, 아무도 몰라요."`,
    options: [
      { id: "report", label: "구단과 KBO에 바로 신고한다", detail: "팬 여론 크게 ↑ · 클린 베이스볼" },
      { id: "ignore", label: "무시하고 번호를 차단한다", detail: "조용히 넘어가지만, 신고 안 한 게 나중에 문제가 될 수도" },
      { id: "accept", label: "받는다", detail: `${fmtMoney(amount)} · 걸리면 영구 제명` },
    ],
  });
}

function resolveFixing(player, choice, option) {
  const news = [];
  if (option.id === "report") {
    player.fixReported = true;
    changeFame(player, 12);
    news.push(`${player.name}, 승부조작 제안 자진 신고… KBO "클린 베이스볼의 모범"`);
    news.push(`경찰, ${player.name} 제보로 불법 브로커 일당 검거`);
  } else if (option.id === "ignore") {
    player.fixIgnored = { year: gameYear(player), left: 3 };
    news.push(`${player.name}, 시즌 준비 매진 중`);
  } else {
    addMoney(player, choice.amount);
    player.fixing = { year: gameYear(player), left: 6 };
    news.push(`${player.name}, 비시즌 개인 훈련 중`); // 겉으로는 아무 일 없음
  }
  return news;
}

// 매 시즌 끝에: 받았으면 12%씩 최대 6시즌 (≒54%), 무시했으면 9%씩 3시즌 (≒25%)
function fixingInvestigation(player, report) {
  if (player.banned) return;
  report.bigMoments = report.bigMoments || [];
  if (player.fixing && player.fixing.left > 0) {
    player.fixing.left--;
    if (Math.random() < 0.12) {
      player.banned = true;
      changeFame(player, -80);
      report.news.push(`[속보] 검찰, 승부조작 브로커 수사 중 ${player.name} 연루 확인`);
      report.news.push(`KBO 상벌위원회, ${player.name} 영구 제명… "어떤 이유로도 용서 없다"`);
      report.bigMoments.push({
        tone: "bad",
        kicker: `${player.fixing.year}년의 그 연락`,
        title: "⛔ 영구 제명",
        lines: ["승부조작 가담 사실이 드러났어요.", "KBO 상벌위원회가 영구 제명을 결정했어요.", "명예의 전당 후보 자격도 사라져요."],
      });
      // 다른 선택지 다 지우고 은퇴만 남김
      player.choiceQueue = [];
      player.pendingChoice = {
        key: "banned",
        text: `⚖️ KBO 상벌위원회 결정문<br>"${player.name} 선수는 ${player.fixing.year}년 불법 브로커로부터 금품을 받고 경기 일부를 조작하기로 약속한 사실이 확인되어 <b>영구 실격</b> 처분한다."`,
        options: [{ id: "retire", label: "유니폼을 벗는다" }],
      };
      if (typeof addReaction === "function") addReaction(player, report, [], FAN.banned, { team: player.team });
    }
  } else if (player.fixIgnored && player.fixIgnored.left > 0) {
    player.fixIgnored.left--;
    if (Math.random() < 0.09) {
      player.fixIgnored.left = 0;
      player.fixPunished = true;
      changeFame(player, -8);
      player.nextMod = (player.nextMod || 0) - 3;
      report.news.push(`KBO, 승부조작 제안 받고 신고 안 한 ${player.name}에 출장정지 30경기·제재금`);
      report.bigMoments.push({
        tone: "bad",
        kicker: "브로커 수사 불똥",
        title: "⚠️ 미신고 징계",
        lines: [`${player.fixIgnored.year}년 받았던 연락이 수사에서 드러났어요.`, "신고 의무 위반으로 출장정지 30경기", "다음 시즌 컨디션 -3"],
      });
    }
  }
}
