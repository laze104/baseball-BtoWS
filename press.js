// =============================================
// press.js : v16 기자회견 (FM 느낌)
// - 시즌 뒤 큰일(수상, 커리어 하이, 부진, 트레이드, 숙적)이 있으면 기자회견
// - FA로 팀 옮기면 입단 기자회견
// - 질문 2개, 답변 말투 4가지: 겸손 / 자신감 / 도발 / 팀 우선
// - 자신감·도발 답변은 공약으로 남음 → 다음 시즌 성적으로 회수 (못 하면 역풍)
// =============================================

// 말투별 효과 (fame: 팬 여론, mod: 다음 시즌 컨디션, trust: 감독 신뢰, promise: 공약)
const PRESS_TONES = {
  humble: { tag: "겸손", fame: 3, mod: 0, trust: 0, hint: "팬 여론 ↑" },
  confident: { tag: "자신감", fame: 1, mod: 1, trust: 0, promise: "good", hint: "컨디션 ↑ · 공약이 됨 (내년 잘해야 함)" },
  bold: { tag: "도발", fame: "random", mod: 1, trust: -1, promise: "great", hint: "화제성 · 감독 신뢰 ↓ · 큰 공약 (내년 대박 나야 함)" },
  team: { tag: "팀 우선", fame: 2, mod: 0, trust: 1, hint: "감독 신뢰 ↑" },
};

// 상황별 첫 질문 (when 순서대로 먼저 맞는 것)
const PRESS_OPENERS = [
  {
    id: "mvp", when: (p, r) => r.awards.some((a) => a.includes("MVP") && !a.includes("올스타")),
    q: "MVP 수상을 축하드립니다. 소감 한마디 부탁드립니다.",
    a: { humble: "\"동료들이 만들어 준 상이에요\"", confident: "\"받을 만한 시즌이었다고 생각합니다\"", bold: "\"솔직히 경쟁자가 없었죠\"", team: "\"이 트로피보다 우승 반지가 더 갖고 싶어요\"" },
    news: { humble: "{name} \"동료들이 만든 MVP\"", confident: "{name} \"받을 만했다\" 당당한 MVP 소감", bold: "{name} \"경쟁자 없었다\"… MVP 소감부터 도발", team: "{name} \"MVP보다 우승 반지\"" },
  },
  {
    id: "title", when: (p, r) => r.awards.some((a) => Object.values(TITLE_NAMES).includes(a)),
    q: "{award} 타이틀을 따냈습니다. 비결이 뭔가요?",
    a: { humble: "\"운이 많이 따랐어요\"", confident: "\"겨울에 준비한 게 그대로 나왔어요\"", bold: "\"내년엔 더 큰 숫자 보여드릴게요\"", team: "\"같이 뛴 형들, 코치님들 덕분이에요\"" },
    news: { humble: "{name} \"{award}, 운이 따랐을 뿐\"", confident: "{name} \"겨울 준비가 통했다\"", bold: "{name} \"내년엔 더 큰 숫자\" 2연속 {award} 예고", team: "{name} \"{award}은 동료 덕\"" },
  },
  {
    id: "trade", when: (p, r) => !!r.tradedFrom,
    q: "시즌 도중 트레이드됐습니다. {from}에 서운한 마음은 없나요?",
    a: { humble: "\"그동안 감사했다고 전하고 싶어요\"", confident: "\"여기서 증명하면 됩니다\"", bold: "\"후회하게 만들어 드리죠\"", team: "\"이제 {team}만 생각합니다\"" },
    news: { humble: "{name} \"{from}에 감사\"… 트레이드 후 첫 소감", confident: "{name} \"새 팀에서 증명한다\"", bold: "{name}, 친정팀에 경고 \"후회하게 만들겠다\"", team: "{name} \"이제 {team}만 생각\"" },
  },
  {
    id: "great", when: (p, r) => r.grade === "great",
    q: "커리어 최고의 시즌이었습니다. 내년 목표는요?",
    a: { humble: "\"올해만큼만 해도 감사하죠\"", confident: "\"올해보다 더 잘할 자신 있어요\"", bold: "\"내년엔 리그를 씹어먹겠습니다\"", team: "\"내 기록보다 팀 가을야구가 먼저예요\"" },
    news: { humble: "{name} \"올해만큼만\" 겸손한 각오", confident: "{name} \"올해보다 더 잘할 자신\"", bold: "{name} \"내년엔 리그 씹어먹는다\" 폭탄 발언", team: "{name} \"기록보다 가을야구\"" },
  },
  {
    id: "bad", when: (p, r) => r.grade === "bad",
    q: "아쉬운 시즌이었습니다. 팬들에게 한마디 해 주시죠.",
    a: { humble: "\"죄송합니다. 변명하지 않겠습니다\"", confident: "\"내년엔 완전히 달라진 모습 보여드릴게요\"", bold: "\"기용 방식에 아쉬움이 있었어요\"", team: "\"팀에 미안할 뿐이에요\"" },
    news: { humble: "{name} \"변명 안 한다\" 고개 숙인 사과", confident: "{name} \"내년엔 완전히 달라진다\"", bold: "{name}, 부진 이유로 기용 방식 지목… 감독과 불화설", team: "{name} \"팀에 미안할 뿐\"" },
  },
  {
    id: "nemesis", when: (p, r) => r.nemesis && r.nemesis.some((x) => x.stage >= 2),
    q: "{nem} 선수와는 만날 때마다 불꽃이 튑니다. 어떤 상대인가요?",
    a: { humble: "\"정말 배울 게 많은 선수예요\"", confident: "\"붙으면 이길 자신 있어요\"", bold: "\"솔직히 제가 한 수 위죠\"", team: "\"상대가 누구든 팀이 이기면 돼요\"" },
    news: { humble: "{name} \"{nem|은} 배울 게 많은 선수\"", confident: "{name} \"{nem}, 붙으면 이긴다\"", bold: "{name}, 숙적 {nem} 공개 도발 \"내가 한 수 위\"", team: "{name} \"상대 누구든 팀 승리가 먼저\"" },
  },
];

// 두 번째 질문 (일반)
const PRESS_FOLLOWUPS = [
  {
    id: "manager", q: "{manager}의 평가가 궁금합니다. 감독님과 관계는 어떤가요?",
    a: { humble: "\"아직 감독님 기대에 못 미쳐요\"", confident: "\"감독님도 저를 믿으실 거예요\"", bold: "\"솔직히 더 많이 뛰고 싶어요\"", team: "\"감독님 믿음에 보답하겠습니다\"" },
    news: { humble: "{name} \"아직 감독 기대에 못 미쳐\"", confident: "{name} \"감독님도 날 믿는다\"", bold: "{name} \"더 뛰고 싶다\" 출전 시간 공개 요구", team: "{name} \"감독님 믿음에 보답\"" },
  },
  {
    id: "fans", q: "팬들 응원이 대단합니다. 팬들에게 한마디 해 주세요.",
    a: { humble: "\"늘 감사합니다. 더 열심히 할게요\"", confident: "\"내년에도 야구장 오실 이유 만들어 드릴게요\"", bold: "\"악플 다는 분들, 내년에 다 보세요\"", team: "\"올해는 팬들과 함께 가을야구 갑니다\"" },
    news: { humble: "{name} \"팬들께 늘 감사\"", confident: "{name} \"야구장 오실 이유 만들겠다\"", bold: "{name}, 악플러에 공개 경고 \"내년에 다 봐라\"", team: "{name} \"팬들과 가을야구 간다\"" },
  },
  {
    id: "money", q: "연봉 이야기가 많습니다. 몸값에 대한 생각은요?",
    a: { humble: "\"돈보다 야구가 먼저예요\"", confident: "\"성적으로 보여드리면 따라오겠죠\"", bold: "\"제 가치는 제가 제일 잘 압니다\"", team: "\"구단 사정도 생각해야죠\"" },
    news: { humble: "{name} \"돈보다 야구\"", confident: "{name} \"성적이 몸값\"", bold: "{name} \"내 가치는 내가 안다\" 대박 계약 예고?", team: "{name} \"구단 사정도 생각\"" },
  },
];

// 입단 기자회견 (FA 이적)
const PRESS_SIGNING = [
  {
    id: "why", q: "많은 팀 중에 {team}을(를) 택한 이유는요?",
    a: { humble: "\"저를 가장 필요로 해 주셨어요\"", confident: "\"여기서 우승할 수 있다고 봤어요\"", bold: "\"제일 좋은 조건을 주셨죠, 솔직히\"", team: "\"팀 분위기가 마음에 들었어요\"" },
    news: { humble: "{name} \"{team}이 날 가장 원했다\"", confident: "{name} \"{team}에서 우승한다\" 입단 일성", bold: "{name} \"조건이 제일 좋았다\" 솔직 입단 소감", team: "{name} \"{team} 분위기에 끌렸다\"" },
  },
  {
    id: "old", q: "{old} 팬들에게 한마디 해 주시겠어요?",
    a: { humble: "\"그동안 정말 감사했습니다\"", confident: "\"좋은 추억만 가져가겠습니다\"", bold: "\"맞대결 땐 봐주지 않겠습니다\"", team: "\"이제 {team} 유니폼만 생각할게요\"" },
    news: { humble: "{name}, {old} 팬들에 눈물의 작별 인사", confident: "{name} \"{old}에서 좋은 추억만\"", bold: "{name}, 친정팀 {old}에 \"봐주지 않겠다\"", team: "{name} \"이제 {team}만 생각\"" },
  },
];

FAN.pressHumble = ["인터뷰도 국대급이네", "인성 보소", "이래서 {name} 좋아함", "기자들 이런 답 좋아하더라 ㅋㅋ"];
FAN.pressConfident = ["자신감 좋다 내년에 보자", "말만 하지 말고 보여줘라", "오 각오 미쳤다", "이 정도 패기는 있어야지"];
FAN.pressBold = ["ㅋㅋㅋㅋ 미친놈 아니냐", "이거 캡처해둔다 내년에 박제각", "어그로 지리네 근데 낭만 있음", "감독 표정 썩었겠다 ㅋㅋ", "말은 존나 잘하네 성적으로 보여줘라", "와 이건 선 넘었지"];
FAN.pressTeam = ["팀퍼스트 ㄹㅇ", "주장감이다", "이런 선수가 팀에 있어야 됨", "감독이 제일 좋아할 답변"];
FAN.promiseKept = ["말한 대로 해냈다 ㄷㄷ", "작년 인터뷰 박제 풀어준다", "허세인 줄 알았는데 진짜였네", "입털고 해내는 놈이 제일 멋있음"];
FAN.promiseBroken = ["작년에 뭐라 그랬더라? ㅋㅋㅋ", "박제 소환합니다", "입만 살았네 진짜", "말을 하지 말든가 ㅅㅂ", "인터뷰 영상 다시 돌려보는 중 ㅋㅋ"];

function pressAnswers(q, vals) {
  return Object.keys(q.a).map((tone) => ({ id: tone, label: fillText(q.a[tone], currentPlayerOr(vals), vals), detail: `${PRESS_TONES[tone].tag} · ${PRESS_TONES[tone].hint}` }));
}

// fillText에 넘길 player 대신 값 묶음 (이름·팀 들어 있음)
function currentPlayerOr(vals) {
  return { name: vals.name, team: vals.team, school: "", league: "" };
}

function pressChoice(player, kind, qs, vals, idx, acc) {
  const q = qs[idx];
  return {
    key: "press",
    kind, qs, vals, idx,
    acc: acc || { fame: 0, mod: 0, trust: 0, tones: [], lines: [] },
    text: `🎤 ${kind === "sign" ? "입단 기자회견" : "시즌 결산 기자회견"} · 질문 ${idx + 1}/${qs.length}<br>기자: "${fillText(q.q, currentPlayerOr(vals), vals)}"`,
    options: pressAnswers(q, vals),
  };
}

function pressVals(player, report, extra) {
  const nem = report && report.nemesis ? report.nemesis.find((x) => x.stage >= 2) : null;
  const award = report ? report.awards.find((a) => Object.values(TITLE_NAMES).includes(a)) : "";
  let manager = "감독님";
  try { manager = managerTitle(player); } catch (e) {}
  return { name: player.name, team: player.team, award: award || "", from: (report && report.tradedFrom) || "", nem: nem ? nem.name : "", manager, ...extra };
}

// 시즌 뒤 기자회견 (career.js에서 시즌 마지막에 부름)
function pressSeason(player, report) {
  checkPromise(player, report);
  if (player.retired || !TOP_LEAGUES.includes(report.league) || (!report.bat && !report.pit)) return;
  const queue = [player.pendingChoice, ...(player.choiceQueue || [])].filter(Boolean);
  // FA 협상 중이면 입단 기자회견으로 대신함 / 인터뷰 이벤트가 이미 있으면 안 함
  if (queue.some((c) => ["fa", "forcedRetire", "agent"].includes(c.key) || (c.key === "life" && String(c.text).startsWith("🎤")))) return;
  const opener = PRESS_OPENERS.find((o) => o.when(player, report));
  if (!opener || Math.random() >= 0.55) return;
  const follow = pick(PRESS_FOLLOWUPS.filter((f) => f.id !== "money" || !isAmateur(player.league)));
  pushChoice(player, pressChoice(player, "season", [opener, follow], pressVals(player, report, {}), 0));
}

// FA 이적 뒤 입단 기자회견 (career.js FA 처리에서 부름)
function pressSigning(player, oldTeam) {
  pushChoiceFirst(player, pressChoice(player, "sign", PRESS_SIGNING, pressVals(player, player.lastReport, { old: oldTeam, team: player.team }), 0));
}

function resolvePress(player, choice, option) {
  const tone = PRESS_TONES[option.id];
  const q = choice.qs[choice.idx];
  const acc = { ...choice.acc, tones: [...choice.acc.tones, option.id], lines: [...choice.acc.lines] };
  const fame = tone.fame === "random" ? randomInt(-6, 8) : tone.fame;
  changeFame(player, fame);
  acc.fame += fame;
  if (tone.mod) { player.nextMod = (player.nextMod || 0) + tone.mod; acc.mod += tone.mod; }
  if (tone.trust) {
    if (player.trustTeam !== player.team) { player.trustTeam = player.team; player.managerTrust = 0; }
    player.managerTrust = clamp((player.managerTrust || 0) + tone.trust, 0, 3);
    acc.trust += tone.trust;
  }
  if (tone.promise) {
    const lvl = player.pressPromise && player.pressPromise.level === "great" ? "great" : tone.promise;
    player.pressPromise = { level: lvl, year: (player.lastReport ? player.lastReport.year : gameYear(player)) + 1, text: fillText(q.a[option.id], currentPlayerOr(choice.vals), choice.vals) };
  }
  const headline = fillText(q.news[option.id], currentPlayerOr(choice.vals), choice.vals);
  acc.lines.push(headline);
  player.lastPressTone = option.id;
  if (choice.idx + 1 < choice.qs.length) {
    pushChoiceFirst(player, pressChoice(player, choice.kind, choice.qs, choice.vals, choice.idx + 1, acc));
  } else {
    player.lastPress = acc; // 끝나면 큰 화면 요약 (main.js choiceBigMoments)
  }
  return [headline];
}

function pressPool(toneId) {
  return { humble: FAN.pressHumble, confident: FAN.pressConfident, bold: FAN.pressBold, team: FAN.pressTeam }[toneId] || FAN.good;
}

function pressSummary(acc) {
  const sign = (v) => (v > 0 ? `+${v}` : `${v}`);
  const lines = [...acc.lines];
  lines.push(`팬 여론 ${sign(acc.fame)}${acc.trust ? ` · 감독 신뢰 ${sign(acc.trust)}` : ""}${acc.mod ? ` · 다음 시즌 컨디션 ${sign(acc.mod)}` : ""}`);
  return lines;
}

// 공약 회수: 작년 기자회견에서 큰소리쳤으면 올해 성적으로 판정
function checkPromise(player, report) {
  const pr = player.pressPromise;
  if (!pr || pr.year !== report.year) return;
  player.pressPromise = null;
  if (!report.bat && !report.pit) return; // 군 복무 등은 넘어감
  const mvp = report.awards.some((a) => a.includes("MVP") && !a.includes("올스타"));
  const kept = pr.level === "great" ? report.grade === "great" || mvp : report.grade === "great" || report.grade === "good";
  const big = pr.level === "great";
  changeFame(player, kept ? (big ? 10 : 6) : big ? -10 : -5);
  const line = kept ? `${player.name}, 작년 기자회견 ${pr.text} 약속 지켰다` : `${player.name}, 작년엔 ${pr.text} 큰소리… 결과는 초라`;
  addReaction(player, report, [line], kept ? FAN.promiseKept : FAN.promiseBroken, {});
  report.bigMoments = report.bigMoments || [];
  report.bigMoments.push({ tone: kept ? "gold" : "bad", kicker: "작년 기자회견 공약", title: kept ? "✅ 말한 대로 해냈다" : "📌 박제됐다", lines: [pr.text, kept ? `팬 여론 +${big ? 10 : 6}` : `팬 여론 -${big ? 10 : 5}`] });
}
