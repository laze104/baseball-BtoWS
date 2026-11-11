// =============================================
// gala.js : 연말 시상식 수상 소감
// - KBO·NPB·MLB 에서 큰 상(MVP·신인왕·골든글러브·투수상·타이틀) 받으면 시상식 메일
// - 소감 말투: 겸손 / 가족 (눈물) / 도발 / 유머 / 팬 공약
// - 도발·유머는 밈이 될 수 있음. 도발 밈은 다음 해 잘하면 뒤집힘, 못하면 다시 소환
// - 우승 공약은 다음 해 우승하면 지켜야 함 (안 지키면 밈)
// =============================================

const GALA_EVENTS = { KBO: "KBO 시상식", NPB: "NPB 어워즈", MLB: "뉴욕 야구기자 만찬" };

// 큰 상만 (올스타·우승·정규시즌 1위는 빼고)
function galaAwards(report) {
  return report.awards.filter((a) => !/올스타|우승|국가대표/.test(a));
}

function headAward(list) {
  const order = [/MVP/, /사이영|투수상|사와무라/, /신인왕/, /골든글러브|베스트나인|실버슬러거|골드글러브/, /왕$/];
  for (const re of order) {
    const a = list.find((x) => re.test(x));
    if (a) return a;
  }
  return list[0];
}

const GALA_JOKES = [
  "감독님, 이 트로피 받았으니 이제 번트 사인은 안 내시는 거죠?",
  "연봉 협상 때 이 트로피 들고 사무실 들어가겠습니다.",
  "상금은 받는 순간 와이프 통장으로 갑니다. 저도 구경 못 해요.",
  "올해 제일 무서웠던 투수요? 우리 팀 불펜이요. 제 승리 몇 개 날렸는지…",
  "솔직히 수상 소감 준비 안 했습니다. 받을 줄 알았으면 머리라도 했죠.",
  "트레이너님, 제 허리 보험 이 상으로 처리되나요?",
  "제 성적 절반은 우리 팀 식당 김치찌개 덕입니다. 사장님 사랑해요.",
  "작년에 저 욕하던 분들, 오늘은 박수 쳐 주시죠. 다 봤습니다.",
];

const GALA_PLEDGES = [
  "머리 노랗게 염색하기",
  "팬들 앞에서 아이돌 댄스 추기",
  "홈 개막전에 치킨 100마리 쏘기",
  "유니폼 입고 한강 수영하기",
  "팬 사인회 1,000명 다 해 주기",
];

function rivalForSpeech(player) {
  const n = (player.nemeses || []).filter((x) => x.status === "active" && x.stage >= 1).sort((a, b) => b.stage - a.stage)[0];
  return n ? n.name : null;
}

// afterSeason 에서 부름
function galaSeason(player, report) {
  if (!GALA_EVENTS[report.league] || player.retired) return;
  pledgeCheck(player, report);
  speechMemeSeason(player, report);
  const list = galaAwards(report);
  if (!list.length) return;
  const head = headAward(list);
  // 단상에 서는 건 MVP·투수상·신인왕급. 골든글러브만 받은 해는 반반, 타이틀만은 무대 없음
  if (/왕$/.test(head) && !/신인왕/.test(head)) return;
  if (/골든글러브|베스트나인|실버슬러거|골드글러브/.test(head) && Math.random() < 0.5) return;
  const married = player.married;
  const rival = rivalForSpeech(player);
  const joke = pick(GALA_JOKES.filter((j) => married || !j.includes("와이프")));
  const pledge = pick(GALA_PLEDGES);
  const quotes = {
    humble: `제가 잘해서 받은 상이 아닙니다. ${report.team} 동료들이 같이 받은 거예요.`,
    family: `어머니, 아버지… 새벽마다 운동장 데려다주셨던 거 다 기억합니다. ${married ? "그리고 여보, 고마워." : ""}`.trim(),
    bold: rival ? `${rival} 선수, 내년에도 이 자리 제 겁니다.` : "내년엔 더 압도적으로 하겠습니다. 이 상, 몇 년 더 제 겁니다.",
    joke,
    pledge: `내년에 우승하면 ${pledge}, 약속합니다!`,
  };
  pushChoice(player, {
    key: "gala",
    award: head,
    awards: list,
    quotes,
    pledge,
    mailFrom: `${GALA_EVENTS[report.league]} 사무국`,
    mailSubject: `[${head}] 수상 소감 순서 안내`,
    text: `🏆 ${GALA_EVENTS[report.league]}. 사회자가 이름을 불렀어요. ${list.join(", ")} 트로피를 들고 단상에 올랐어요. 카메라 불빛이 쏟아져요. 무슨 말을 할까요?`,
    options: [
      { id: "humble", label: "🙇 겸손하게", detail: `"${quotes.humble}" · 라커룸 ↑` },
      { id: "family", label: "😭 가족 얘기", detail: `"${quotes.family}" · 눈물 날 수도` },
      { id: "bold", label: "😤 도발", detail: `"${quotes.bold}" · 밈 될 수도 · 내년 못하면 박제` },
      { id: "joke", label: "🤣 유머", detail: `"${quotes.joke}" · 터지면 대박, 아니면 갑분싸` },
      { id: "pledge", label: "📣 팬 공약", detail: `"${quotes.pledge}" · 우승하면 지켜야 함` },
    ],
  });
}

function resolveGala(player, choice, option) {
  const q = choice.quotes[option.id];
  const news = [];
  const r = player.lastReport;
  const award = choice.award;
  player.lastGala = option.id;
  if (option.id === "humble") {
    changeFame(player, 2);
    moraleUp(player, 1);
    if (player.groups) groupUp(player, "vet", 4);
    news.push(`${player.name}, ${award} 수상 "${q}"`);
  } else if (option.id === "family") {
    const tears = Math.random() < 0.6;
    changeFame(player, tears ? 4 : 2);
    changeTeamFans(player, player.team, 3);
    news.push(tears ? `[영상] ${player.name}, ${award} 소감 중 눈물… "${q}"` : `${player.name}, ${award} 소감서 부모님께 감사`);
    player.lastGala = tears ? "tears" : "family";
  } else if (option.id === "bold") {
    changeFame(player, Math.random() < 0.5 ? 2 : -2);
    player.nextMod = (player.nextMod || 0) + 1; // 말한 게 있으니 독기
    const m = addMeme(player, "speechBold", { quote: q }, r);
    news.push(`${player.name}, ${award} 단상에서 도발… "${q}"`);
    if (m) news.push(`'${m.name}'… 시상식 끝나자마자 커뮤니티 도배`);
  } else if (option.id === "joke") {
    const hit = Math.random() < clamp(0.55 + (player.fame || 0) / 200, 0.35, 0.8);
    player.lastGala = hit ? "jokeHit" : "jokeFlop";
    if (hit) {
      changeFame(player, 4);
      const m = addMeme(player, "speechJoke", { quote: q }, r);
      news.push(`[현장] ${player.name} 수상 소감에 시상식장 빵 터져… "${q}"`);
      if (m) news.push(`'${m.name}' 짤 퍼지는 중`);
    } else {
      changeFame(player, -1);
      addMeme(player, "speechFlop", { quote: q }, r);
      news.push(`${player.name}, 수상 소감 농담에 시상식장 정적… "${q}"`);
    }
  } else if (option.id === "pledge") {
    changeFame(player, 2);
    player.pledge = { year: gameYear(player) + 1, team: player.team, text: choice.pledge };
    news.push(`${player.name}, ${award} 받고 공약 "${q}"`);
  }
  player.galaSpeeches = (player.galaSpeeches || 0) + 1;
  return news;
}

// 공약: 다음 해 우승했으면 지킴 (afterSeason)
function pledgeCheck(player, report) {
  const p = player.pledge;
  if (!p || report.year !== p.year) return;
  player.pledge = null;
  const won = report.awards.some((a) => /시리즈 우승/.test(a));
  if (!won || p.team !== report.team) return;
  if (Math.random() < 0.85) {
    changeFame(player, 5);
    player.pledgeKept = (player.pledgeKept || 0) + 1;
    report.news.push(`[화제] ${player.name}, 우승 공약 지켰다… '${p.text}' 인증`);
    moreComments(player, report, FAN.pledgeKept, 3);
  } else {
    changeFame(player, -3);
    addMeme(player, "pledgeBroken", { text: p.text }, report);
  }
}

// 도발 소감 밈: 다음 해 잘하면 뒤집기, 못하면 소환 (meme.js memeSeason 이랑 같은 방식)
function speechMemeSeason(player, report) {
  const m = aliveMemes(player, report.year).find((x) => x.kind === "speechBold" && x.year < report.year);
  if (!m) return;
  if (galaAwards(report).length && report.WAR >= 4) flipMeme(player, report, m);
  else if (report.WAR < 2) fireMeme(player, report, m);
}

Object.assign(MEME_TYPES, {
  speechBold: {
    name: (p, x) => `"${x.quote}"`,
    comments: ["{meme} 기억함 ㅋㅋ", "{name} 시상식 소감 박제해 둠", "말 한 거 있으니 올해 잘해야지", "{meme} 이거 아직도 웃김"],
    again: ["{meme} 어디 갔냐 ㅋㅋㅋ", "입은 MVP 실력은 글쎄", "작년 소감 다시 틀어 줘라 ㅋㅋ"],
    flipNick: "말한 대로 하는 남자",
    flipNews: "{name}, '{meme}' 그 말 지켰다… 올해도 시상식 단상에",
  },
  speechJoke: {
    name: (p, x) => `"${x.quote}"`,
    comments: ["{meme} 이거 레전드 소감 ㅋㅋㅋ", "{name} 예능 나가라", "소감 장인 인정", "{meme} 짤 아직도 돈다"],
    again: ["올해도 소감 기대함 ㅋㅋ"],
    flipNick: null,
    flipNews: null,
  },
  speechFlop: {
    name: () => "갑분싸 수상 소감",
    comments: ["{meme} 그 정적 아직도 생각남", "{name} 개그는 하지 마라 제발", "야구만 잘하자 ㅋㅋ"],
    again: ["또 개그 하나 ㄷㄷ"],
    flipNick: null,
    flipNews: null,
  },
  pledgeBroken: {
    name: (p, x) => `'${x.text}' 공약 먹튀`,
    comments: ["{meme} 언제 하냐", "공약 지켜라 ㅋㅋ", "{name} 공약은 믿지 마라"],
    again: ["또 공약 거냐 ㅋㅋ"],
    flipNick: null,
    flipNews: null,
  },
});

ACHIEVEMENTS.push(
  {
    id: "galaJoke",
    group: "인기",
    name: "소감 장인",
    desc: "수상 소감으로 시상식장을 빵 터뜨림",
    check: (p) => (p.memes || []).some((m) => m.kind === "speechJoke"),
  },
  { id: "pledgeKept", group: "인기", name: "공약은 지킨다", desc: "우승 공약 지키기", check: (p) => (p.pledgeKept || 0) >= 1 },
);

Object.assign(FAN, {
  galaHumble: ["인성까지 MVP", "겸손한 거 보소", "이러니까 동료들이 좋아하지", "상 받을 자격 있다"],
  galaTears: ["나도 울었다 ㅠㅠ", "부모님 얘기에 무너짐", "효자 인정", "아 눈물 나네 진짜"],
  galaFamily: ["가족 얘기 훈훈하다", "부모님 뿌듯하시겠다", "좋은 소감이었다"],
  galaBold: ["자신감 미쳤다 ㅋㅋ", "내년에 못하면 박제다", "이런 캐릭터 좋음", "말 한 거 지켜라 ㅋㅋ"],
  galaJokeHit: ["ㅋㅋㅋㅋㅋ 소감 레전드", "예능감 미쳤다", "감독 표정 봤냐 ㅋㅋㅋ", "올해 소감 1등"],
  galaJokeFlop: ["…?", "정적 3초 ㅋㅋㅋ", "개그는 접자", "사회자 수습하느라 고생함"],
  galaPledge: ["공약 캡처 완료", "우승하면 꼭 해라 ㅋㅋ", "벌써 기대된다", "이거 구단이 막을 듯 ㅋㅋ"],
  pledgeKept: ["공약 지킨 거 실화냐 ㅋㅋㅋ", "약속 지키는 남자", "이건 평생 짤이다", "진짜 했네 ㄷㄷ"],
});

function galaPool(player) {
  return {
    humble: FAN.galaHumble,
    tears: FAN.galaTears,
    family: FAN.galaFamily,
    bold: FAN.galaBold,
    jokeHit: FAN.galaJokeHit,
    jokeFlop: FAN.galaJokeFlop,
    pledge: FAN.galaPledge,
  }[player.lastGala];
}
