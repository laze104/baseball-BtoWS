// =============================================
// talk.js : 감독 면담 1대1 대화 팝업
// 감독마다 말투(무뚝뚝·다정·다혈질·논리파·농담꾼) 고정 + 기분(팀 성적) + 관계(처음·아는 사이·믿는 사이·서먹)
// 흐름: 인사 → 감독이 먼저 꺼내는 얘기(밈·팬·라커룸·지난 약속·분석 등) → 내 대답 → 요청 → 질문 → 대답
//      → (애매하면) 압박 질문 → (수락이면 가끔) 조건 → 결론 + 감독이 본 것
// 대답 말투가 감독 말투랑 맞으면 + (최대 ±3), 최종 판단은 world.js meetManager
// 지난 면담은 player.talkMemory 에 남아서 다음 면담 때 감독이 꺼냄
// =============================================

const TALK_TONES = {
  blunt: { name: "무뚝뚝", likes: "humble", hates: "humor" },
  warm: { name: "다정", likes: "honest", hates: null },
  hot: { name: "다혈질", likes: "bold", hates: "honest" },
  logic: { name: "논리파", likes: "numbers", hates: "honest" },
  joker: { name: "농담꾼", likes: "humor", hates: "numbers" },
};
const TONE_KEYS = Object.keys(TALK_TONES);

function managerTone(player) {
  const m = managerOf(player);
  const h = [...(m.name || player.team || "")].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 9973, 7);
  return TONE_KEYS[h % TONE_KEYS.length];
}

// 기분: 작년 팀 성적·구단 목표
function managerMood(player) {
  const ex = player.expectResult;
  if (ex && ex.team === player.team) return ex.met ? "good" : "bad";
  const h = [...player.history].reverse().find((x) => x.team === player.team && x.standing);
  if (!h) return "normal";
  const pos = (h.standing.rank - 1) / Math.max(1, h.standing.teams - 1);
  return pos <= 0.3 ? "good" : pos >= 0.7 ? "bad" : "normal";
}

// 관계: 처음 / 아는 사이 / 믿는 사이 / 서먹
function managerBond(player) {
  const m = managerOf(player);
  const mem = player.talkMemory;
  const trust = player.trustTeam === player.team ? player.managerTrust || 0 : 0;
  if (!mem || mem.manager !== m.name || mem.team !== player.team) return "first";
  if (trust < 0 || (mem.last && mem.last.threat)) return "cold";
  if (trust >= 2 || mem.meets >= 3) return "close";
  return "known";
}

const TALK_GREET = {
  blunt: {
    good: ["왔나. 앉아.", "어. 들어와."],
    normal: ["앉아.", "무슨 일이야."],
    bad: ["…앉아. 요즘 분위기 알지.", "할 말 있으면 빨리 해."],
  },
  warm: {
    good: ["어서 와! 커피 한잔 할래? 요즘 표정 좋더라.", "오, 왔어? 앉아 앉아. 작년엔 정말 수고 많았다."],
    normal: ["들어와. 편하게 앉아. 밥은 먹었고?", "왔구나. 요즘 몸은 어때?"],
    bad: ["왔어? 다들 힘든 시기다. 너도 많이 힘들지?", "앉아. 요즘 분위기 무겁지… 그래도 얼굴 보니 좋다."],
  },
  hot: {
    good: ["오! 왔냐! 앉아! 작년 진짜 시원했다!", "왔어? 좋아, 기세 살아 있을 때 얘기하자."],
    normal: ["왔냐. 무슨 일이야, 빨리 말해.", "어 그래, 들어와. 무슨 일?"],
    bad: ["지금 내 기분 별로다. 무슨 일이야.", "하… 앉아. 요즘 성적 보면 열불 난다."],
  },
  logic: {
    good: ["앉아요. 작년 지표 정리하던 중이었어요.", "들어와요. 시간 15분 정도 있어요."],
    normal: ["앉아요. 용건부터 들을게요.", "어, 들어와요. 자료 보던 중이었어요."],
    bad: ["앉아요. 작년 팀 득실차 보고 있었어요. 할 말 많네요.", "들어와요. 요즘 숫자가 안 좋아요. 짧게 하죠."],
  },
  joker: {
    good: ["어이 스타! 사인 받으러 온 거 아니지? 하하.", "오~ 우리 팀 간판 오셨네. 앉으세요, 선생님."],
    normal: ["왔어? 혹시 연봉 올려 달라는 거면 단장실은 2층이다. 하하.", "들어와. 무슨 일이야, 사고 친 건 아니지?"],
    bad: ["왔어? 요즘 우리 팀 기사 보면 웃음밖에 안 나온다. 하하… 하.", "앉아. 나도 요즘 웃을 일이 없어서 네 얼굴 보러 왔다고 치자."],
  },
};

// 관계별 한마디 (인사 뒤)
const TALK_BOND = {
  first: {
    blunt: "처음이지. 이름은 안다.",
    warm: "이렇게 따로 얘기하는 건 처음이네. 반갑다.",
    hot: "처음 보는 자리네. 나는 돌려 말 안 한다. 알아 둬.",
    logic: "처음 면담이네요. 난 데이터로 얘기하는 사람이에요.",
    joker: "우리 정식 데이트는 처음이지? 하하.",
  },
  cold: {
    blunt: "지난번 일은 안 잊었다.",
    warm: "지난번엔 서로 좀 날이 서 있었지. 오늘은 차분하게 얘기하자.",
    hot: "지난번에 그렇게 나가 놓고 또 왔냐.",
    logic: "지난 면담 기록 봤어요. 오늘은 좀 다르길 바라요.",
    joker: "또 협박하러 온 건 아니지? 하하… 농담이야.",
  },
  close: {
    blunt: "네가 오면 뭔가 있는 거지.",
    warm: "너랑 얘기하는 건 늘 좋다. 편하게 말해.",
    hot: "너는 내가 믿는 놈이다. 말해 봐.",
    logic: "당신 판단은 대체로 맞았어요. 들어 볼게요.",
    joker: "우리 사이에 뭘 그렇게 각을 잡고 와. 하하.",
  },
};

// 감독이 먼저 꺼내는 얘기 (상황 맞는 것 중 하나, 믿는 사이면 둘)
function talkTopics(player) {
  const list = [];
  const mem = player.talkMemory;
  const m = managerOf(player);
  const sameBoss = mem && mem.manager === m.name && mem.team === player.team;
  const cs = player.campScore;
  if (sameBoss && mem.last && mem.last.camp && cs && cs.team === player.team) {
    const good = cs.score >= 1;
    list.push({
      id: "campMemory",
      w: 3,
      say: `지난번에 캠프에서 증명하겠다고 했지. ${cs.line}. ${good ? "말한 건 지켰더라." : "솔직히 기대보다 못했다."}`,
      ans: { bold: good ? "말씀드린 대로 했습니다. 올해도 그럴 겁니다." : "연습경기는 연습경기입니다. 시즌에서 보여 드릴게요." },
    });
  }
  if (sameBoss && mem.last && mem.last.threat) list.push({ id: "threatMemory", w: 3, say: "지난번에 다른 길 생각해 보겠다고 했던 거. 나 아직 기억한다." });
  if (sameBoss && mem.last && mem.last.loyal)
    list.push({ id: "loyalMemory", w: 2, say: "지난번에 내 판단 따르겠다고 한 거, 고마웠다. 그런 말 하는 놈 별로 없다." });
  if (sameBoss && mem.last && mem.last.cond) {
    const ok = recentWar(player) >= 2;
    list.push({ id: "condMemory", w: 3, say: `지난번 조건 기억하지? '${mem.last.cond}'. ${ok ? "잘 지켰다." : "지켰다고 하긴 어렵지."}` });
  }
  const meme =
    typeof aliveMemes === "function"
      ? aliveMemes(player)
          .filter((x) => !x.flipped)
          .pop()
      : null;
  if (meme)
    list.push({
      id: "meme",
      w: 2,
      say: `요즘 인터넷에서 너 '${meme.name}'${josaOf(meme.name, "이라")}고 한다며? 우리 딸이 보여 주더라.`,
      ans: { humor: "그거 저도 봤어요. 굿즈 나오면 감독님 하나 드릴게요.", humble: "신경 안 쓰려고 합니다. 야구로 지우겠습니다." },
    });
  const fan = teamFanOf(player, player.team);
  if (fan >= 40) list.push({ id: "fansUp", w: 1, say: "팬들이 네 이름 연호하는 거 들었다. 구단도 그거 안다. 그게 무게야." });
  if (fan <= -20) list.push({ id: "fansDown", w: 2, say: "팬들 반응 안 좋은 거 알지? 게시판 다 봤다.", ans: { honest: "사실 요즘 댓글 보면 잠이 안 와요." } });
  const nem = (player.nemeses || []).filter((n) => n.status === "active" && n.stage >= 2).sort((a, b) => b.stage - a.stage)[0];
  if (nem)
    list.push({ id: "nemesis", w: 1, say: `${nem.team} ${nem.name}. 걔만 만나면 네가 좀 달라지더라.`, ans: { bold: `${nem.name}은 올해 제가 끝냅니다.` } });
  const g = player.groups;
  if (g && g.team === player.team) {
    const st = lockerStanding(player);
    const names = groupNames(player);
    const low = ["vet", "young", "foreign"].find((k) => g[k] < 25);
    if (low)
      list.push({ id: "lockerLow", w: 2, say: `${names[low]} 쪽이랑 좀 서먹하다며? 라커룸 일도 야구다.`, ans: { honest: "맞아요. 사실 좀 불편합니다." } });
    else if (st >= 70) list.push({ id: "lockerHigh", w: 1, say: `${g.leaders.vet}이 너 칭찬하더라. 라커룸에서 네 말이 먹힌다고.` });
  }
  const ex = player.expectResult;
  if (ex && ex.team === player.team && !ex.met && ex.id !== "rebuild")
    list.push({
      id: "expectFail",
      w: 2,
      say: `작년 '${ex.label || (EXPECTS[ex.id] || {}).label || "시즌"}' 목표 못 한 거 알지. 올해는 나도 자리가 걸려 있다.`,
    });
  const h = [...player.history].reverse().find((x) => !isAmateur(x.league));
  if (h && h.WAR >= 5) list.push({ id: "bigYear", w: 1, say: "작년 같은 시즌이면 뭐, 내가 할 말이 별로 없지." });
  if (h && h.WAR < 0.5 && h.team === player.team) list.push({ id: "badYear", w: 1, say: "작년 기록 보고 왔다. 쉽지 않았지." });
  const r = typeof mateOf === "function" ? mateOf(player, "rival") : null;
  if (r && r.ovr >= getOvrs(player).best)
    list.push({
      id: "rival",
      w: 1,
      say: `${r.name}${josaOf(r.name, "이")} 이번 겨울 준비 단단히 했다더라. 알고 있어?`,
      ans: { bold: `${r.name}보다 제가 낫습니다. 캠프에서 보세요.` },
    });
  if (player.promise && player.promise.team === player.team)
    list.push({ id: "contract", w: 1, say: `계약할 때 구단이 '${ROLE_PROMISES[player.promise.role].label}' 약속한 거, 나도 들었다. 근데 기용은 내가 한다.` });
  if (!isAmateur(player.league)) {
    const side = player.type === "pitcher" ? "pit" : "bat";
    const w = weakSpot(player, side);
    list.push({
      id: "analysis",
      w: 1,
      say: `분석팀 보고서 봤다. ${w.text}. 상대들이 거기만 판다.`,
      ans: { numbers: `저도 봤습니다. 캠프 때 ${w.kind === "zone" ? "그 코스" : "그 구종"}만 따로 잡을 겁니다.` },
    });
  }
  return list;
}

function pickTopics(list, n) {
  const out = [];
  const pool = [...list];
  while (out.length < n && pool.length) {
    const sum = pool.reduce((s, t) => s + t.w, 0);
    let x = Math.random() * sum;
    const i = pool.findIndex((t) => (x -= t.w) < 0);
    out.push(pool.splice(i < 0 ? 0 : i, 1)[0]);
  }
  return out;
}

// 감독 얘기에 대한 대답 (말투 5가지 중 3개)
const SMALL_ANSWERS = {
  humble: ["부족한 거 저도 압니다. 더 하겠습니다.", "아직 멀었습니다.", "다 코치님들 덕입니다."],
  bold: ["올해는 다를 겁니다. 보시면 압니다.", "그런 건 신경 안 씁니다. 야구로 갚겠습니다.", "작년보다 더 하겠습니다. 확실히."],
  honest: ["솔직히 마음고생 좀 했습니다.", "사실 요즘 생각이 많아요.", "저도 사람이라… 신경 쓰이긴 합니다."],
  numbers: ["타구 속도는 오히려 올랐어요. 운이 없던 부분도 있고요.", "분석팀 자료 다 봤습니다. 고칠 곳 알아요.", "숫자로 보면 생각보다 나쁘지 않습니다."],
  humor: ["감독님도 인터넷 하세요? 의외인데요.", "그래서 요즘 댓글 안 봅니다. 정신 건강에 좋아요.", "제가 원래 슬로 스타터라서요… 한 7년째."],
};

// 감독 반응: 말투 맞으면 like, 싫어하는 말투면 hate
const TALK_REACT = {
  blunt: { like: ["…그래.", "됐다. 그거면 됐어."], meh: ["음.", "그렇군."], hate: ["농담할 기분 아니다.", "말 길다."] },
  warm: {
    like: ["그런 얘기 해 줘서 고맙다. 진짜로.", "그래, 그 마음 안다. 혼자 끙끙대지 마."],
    meh: ["그래, 그렇구나.", "응, 알겠다."],
    hate: ["그래…", "음, 그래."],
  },
  hot: { like: ["그렇지! 그 눈빛이야!", "좋아, 그 말 잊지 마라!"], meh: ["그래서?", "말은 쉽지."], hate: ["징징대지 마라. 프로잖아.", "약한 소리 하지 마!"] },
  logic: {
    like: ["좋네요. 근거가 있어요.", "맞아요. 그 숫자 저도 봤어요."],
    meh: ["그렇게 볼 수도 있죠.", "흠, 참고할게요."],
    hate: ["감정 말고 사실로 얘기하죠.", "그건 근거가 아니에요."],
  },
  joker: {
    like: ["하하하! 너 개그 되네?", "크, 이거 기자들 앞에서 해라. 하하."],
    meh: ["하하, 그래그래.", "그렇게 진지할 필요 없어."],
    hate: ["어우, 숫자 얘기는 분석팀이랑 해. 머리 아프다.", "너무 딱딱하다 야. 하하."],
  },
};

function toneScore(tone, ansTone) {
  const t = TALK_TONES[tone];
  if (t.likes === ansTone) return 1;
  if (t.hates === ansTone) return -0.8;
  return 0;
}

function toneReply(tone, ansTone) {
  const t = TALK_TONES[tone];
  const k = t.likes === ansTone ? "like" : t.hates === ansTone ? "hate" : "meh";
  return pick(TALK_REACT[tone][k]);
}

function smallAnswers(topic) {
  const tones = shuffle(Object.keys(SMALL_ANSWERS)).slice(0, 3);
  // 주제에 딱 맞는 대답이 있으면 하나는 꼭 넣음
  const special = topic.ans ? Object.keys(topic.ans) : [];
  if (special.length && !tones.some((t) => special.includes(t))) tones[0] = special[0];
  return tones.map((t) => ({ tone: t, text: (topic.ans && topic.ans[t]) || pick(SMALL_ANSWERS[t]) }));
}

// 본론 꺼내기
const TALK_ASK = {
  blunt: "그래서. 용건.",
  warm: "그래서, 오늘은 무슨 얘기 하러 왔어?",
  hot: "그래서 뭐야, 할 말이.",
  logic: "본론으로 가죠. 무슨 일이에요?",
  joker: "자, 잡담은 여기까지. 본론은?",
};

// 요청별 질문 + 말투별 꼬리
function talkQuestion(wish, tone) {
  const tail = { blunt: " 짧게.", warm: " 천천히 말해 봐.", hot: " 똑바로 말해.", logic: " 근거를 대 봐요.", joker: " 설득해 봐, 하하." }[tone];
  const q = {
    resolve: "각오라… 말로는 누구나 하지. 뭐가 달라졌는데?",
    rest: "체력 관리라. 네가 빠지는 경기는 누가 메우지?",
    trade: "트레이드? …진심이야? 이유부터 들어 보자.",
    captain: "주장은 완장 하나 차는 게 아니야. 왜 너여야 하지?",
    pinch: "대타라도 괜찮다고? 벤치가 그렇게 답답했나?",
    regular: "주전? 매일 나가려면 수비부터 타석까지 다 돼야 한다.",
    closer: "마무리? 9회는 아무나 서는 데가 아니야.",
    starter: "선발로 가겠다? 5이닝 넘길 체력은 되고?",
    bullpen: "불펜으로 가겠다? 매일 몸 풀 각오는 됐나?",
    cleanup: "4번은 팀 얼굴이야. 그 무게 견딜 수 있겠어?",
    leadoff: "1번이면 첫 타석부터 출루해야 돼. 자신 있어?",
  }[wish.id];
  return (q || `${wish.short}이라… 왜 그래야 하는지 말해 봐.`) + tail;
}

// 작년 기록 한 줄
function lastLineText(player) {
  const h = [...player.history].reverse().find((x) => !isAmateur(x.league));
  if (!h) return "";
  if (h.bat && (!h.pit || h.bat.PA > 100)) return `작년 OPS ${fmtRate(h.bat.OPS)}, WAR ${h.WAR}`;
  if (h.pit) return `작년 평균자책 ${h.pit.ERA.toFixed(2)}, WAR ${h.WAR}`;
  return `작년 WAR ${h.WAR}`;
}

// 본론 대답: 기본 3개 + 상황 맞는 것 (캠프 성적·팬·라커룸·경쟁자)
function talkAnswers1(player, style) {
  const war = recentWar(player);
  const young = player.age <= 25;
  const list = [
    {
      id: "stats",
      tone: "numbers",
      text: lastLineText(player) ? `숫자로 말할게요. ${lastLineText(player)}입니다.` : "아직 보여 드린 건 없지만, 실력은 자신 있습니다.",
      score: (war >= 2 ? 1.5 : war >= 0.5 ? 0 : -1.5) * (style === "results" ? 1.5 : 1),
      reply: war >= 2 ? "…숫자는 거짓말 안 하지." : war >= 0.5 ? "그 정도는 다른 애들도 해." : "그 숫자로 지금 그 얘기를 하는 거야?",
    },
    {
      id: "team",
      tone: "humble",
      text: "제가 그 자리에 있어야 팀이 더 이길 수 있다고 생각해요.",
      score: ["trust", "defense", "pitch"].includes(style) ? 1 : 0.5,
      reply: ["trust", "defense", "pitch"].includes(style) ? "팀 얘기부터 하는 건 마음에 드네." : "다들 그렇게 말하지.",
    },
    {
      id: "heart",
      tone: "honest",
      text: "솔직히… 이대로면 저 자신한테 자꾸 실망하게 돼요.",
      score: style === "talk" ? 1.5 : style === "youth" && young ? 1 : style === "results" ? -1.5 : -0.5,
      reply:
        style === "talk" || (style === "youth" && young)
          ? "그런 얘기 해 줘서 고맙다."
          : style === "results"
            ? "감정은 집에 두고 와."
            : "흠. 그건 네가 이겨 내야 할 문제고.",
    },
  ];
  const extra = [];
  const cs = player.campScore;
  if (cs && cs.team === player.team && cs.score >= 1.5)
    extra.push({ id: "camp", tone: "bold", text: `작년 캠프 연습경기 보셨잖아요. ${cs.line.replace("연습경기 ", "")}.`, score: 1, reply: "그래, 그건 봤다." });
  if (teamFanOf(player, player.team) >= 40)
    extra.push({
      id: "fans",
      tone: "bold",
      text: "팬들도 제가 그 자리에 서는 걸 보고 싶어 해요.",
      score: style === "results" ? -0.5 : 0.5,
      reply: style === "results" ? "팬이 기용하는 거 아니다." : "…그건 무시 못 하지.",
    });
  if (player.groups && player.groups.team === player.team && lockerStanding(player) >= 65)
    extra.push({ id: "locker", tone: "humble", text: "라커룸에서도 다들 제가 맡는 게 맞다고 해요.", score: 0.8, reply: "고참들한테 들었다. 그건 맞더라." });
  const r = mateOf(player, "rival");
  if (r && getOvrs(player).best > r.ovr + 2)
    extra.push({
      id: "rival",
      tone: "numbers",
      text: `${r.name}보다 제가 낫다는 건 기록이 말해 줍니다.`,
      score: 1,
      reply: `${r.name} 얘기는 나도 생각해 봤다.`,
    });
  if (extra.length) list.push(pick(extra));
  return list;
}

// 압박: 안 된다고 하면?
const TALK_PRESS = {
  blunt: "안 된다면.",
  warm: "근데 만약에, 내가 이번엔 어렵다고 하면 어떡할래?",
  hot: "내가 안 된다고 하면? 어쩔 건데!",
  logic: "가정해 보죠. 제가 거절하면 어떻게 할 거예요?",
  joker: "근데 내가 '싫은데~' 하면? 하하.",
};

function talkAnswers2(player, style) {
  const lv = LEAGUES[player.league].level;
  const strong = isFranchiseHere(player) || (player.fame || 0) >= 30 || getOvrs(player).best - lv >= 6;
  return [
    {
      id: "camp",
      tone: "bold",
      text: "그럼 캠프에서 실력으로 증명하겠습니다.",
      score: ["talk", "youth", "trust"].includes(style) ? 0.5 : 0,
      camp: true,
      reply: "좋아. 그 말 캠프에서 지켜본다.",
    },
    {
      id: "threat",
      tone: "bold",
      text: player.agent ? "그럼 에이전트랑 다른 길도 알아봐야죠." : "그럼 저도 다른 길을 생각해 봐야죠.",
      score: strong ? 1.5 : -2,
      threat: true,
      reply: strong ? "…너 같은 선수를 놓칠 생각은 없다." : "지금 나한테 협박하는 거냐?",
    },
    {
      id: "loyal",
      tone: "humble",
      text: "알겠습니다. 감독님 판단 따르겠습니다.",
      score: style === "trust" ? 0.5 : 0,
      loyal: true,
      reply: "그 태도 마음에 든다.",
    },
    { id: "joke", tone: "humor", text: "그럼… 매일 찾아오겠습니다. 커피 들고요.", score: 0, reply: "하… 너 진짜. 알았다, 알았어." },
  ];
}

// 수락하면서 거는 조건 (다정한 감독은 안 검)
const TALK_CONDITIONS = [
  { id: "month", text: "개막 한 달 안에 결과 없으면 원래 자리로 간다" },
  { id: "late", text: "훈련 지각 한 번이면 없던 일이다" },
  { id: "young", text: "후배들 엑스트라 훈련까지 네가 챙겨라" },
  { id: "media", text: "기자들 앞에서 팀 얘기 먼저 해라" },
];

const TALK_VERDICT = {
  blunt: { yes: ["해 봐.", "알았다. 대신 결과로."], camp: ["캠프에서 보자.", "아직은 모른다. 캠프."], no: ["안 된다.", "지금은 아니다."] },
  warm: {
    yes: ["좋아, 해 보자. 너라면 할 수 있어.", "그래, 믿어 볼게. 힘들면 언제든 와."],
    camp: ["지금 당장은 약속 못 하지만, 캠프에서 꼭 기회 줄게.", "캠프에서 같이 보자. 너한테 기회 있어."],
    no: ["미안하다. 이번엔 어렵겠어. 그래도 너 아끼는 거 알지?", "지금은 안 되겠다. 대신 기회 오면 제일 먼저 생각할게."],
  },
  hot: {
    yes: ["좋아! 그렇게 가자! 대신 실망시키면 각오해!", "그래, 해 봐! 그 대신 죽기 살기로!"],
    camp: ["캠프에서 보여 줘! 거기서 결판 내!", "말 말고 캠프에서 보여 줘라!"],
    no: ["안 돼! 아직 멀었어!", "지금 그 실력으로? 어림없다!"],
  },
  logic: {
    yes: ["좋아요. 데이터상 합리적이에요.", "납득했어요. 그렇게 하죠."],
    camp: ["표본이 부족해요. 캠프 데이터 보고 결정하죠.", "캠프 연습경기 결과로 판단할게요."],
    no: ["지금 지표로는 어렵네요.", "근거가 부족해요. 이번엔 안 돼요."],
  },
  joker: {
    yes: ["오케이~ 대신 잘못되면 나 잘리는 거야, 알지? 하하.", "좋아! 오늘부터 네가 해. 기자들한텐 내가 원래 계획이었다고 할게. 하하."],
    camp: ["캠프에서 보자고~ 거기서 날 감동시켜 봐.", "음… 캠프 끝나고 다시 얘기하자. 그때까지 살 빼고. 농담이야."],
    no: ["아쉽지만 이번엔 '노'다. 대신 밥은 사 줄게.", "안 돼~ 하하. 진짜 안 돼."],
  },
};

const TALK_BYE = {
  blunt: ["가 봐.", "나가."],
  warm: ["와 줘서 고맙다. 몸 관리 잘하고.", "언제든 와. 문 열려 있어."],
  hot: ["가서 땀 흘려!", "됐다, 가서 훈련해!"],
  logic: ["오늘 얘기 기록해 둘게요.", "다음엔 숫자 들고 와요."],
  joker: ["나갈 때 문 살살 닫아라. 비싼 문이다. 하하.", "가 봐~ 오늘 얘기는 비밀이다."],
};

let talkState = null;

function openMeetingTalk(player, wishId) {
  const wish = MEETING_WISHES.find((w) => w.id === wishId);
  const m = managerOf(player);
  const tone = managerTone(player);
  const mood = managerMood(player);
  const bond = managerBond(player);
  talkState = { player, wish, style: m.style, tone, mood, bond, bonus: 0, opts: {}, step: 0, turns: 0 };
  const modal = $("talk-modal");
  const styleName = MANAGER_STYLES[m.style] ? MANAGER_STYLES[m.style].name : "";
  const bondName = { first: "첫 면담", known: "아는 사이", close: "믿는 사이", cold: "서먹한 사이" }[bond];
  const moodName = { good: "기분 좋음", normal: "", bad: "예민함" }[mood];
  modal.querySelector(".talk-head").innerHTML =
    `<span class="talk-face">🧢</span><div><b>${managerTitle(player)}</b><small>${styleName} · 말투 ${TALK_TONES[tone].name} · ${bondName}${moodName ? ` · ${moodName}` : ""}</small></div>`;
  modal.querySelector(".talk-log").innerHTML = "";
  modal.querySelector(".talk-options").innerHTML = "";
  modal.hidden = false;
  if (bond === "cold") talkState.bonus -= 0.5;
  if (bond === "close") talkState.bonus += 0.5;
  const topics = pickTopics(talkTopics(player), bond === "close" ? 2 : 1);
  const greet = pick(TALK_GREET[tone][mood]);
  const bondLine = bond !== "known" ? TALK_BOND[bond][tone] : null;
  talkSay("them", greet, () => {
    const afterBond = () => talkTopic(topics, 0);
    if (bondLine) talkSay("them", bondLine, afterBond);
    else afterBond();
  });
}

// 감독이 꺼낸 얘기 → 내 대답 → 감독 반응 → 다음 얘기 또는 본론
function talkTopic(topics, i) {
  const s = talkState;
  if (i >= topics.length) {
    talkSay(
      "them",
      TALK_ASK[s.tone],
      () => talkSay("me", s.wish.label, () => talkSay("them", talkQuestion(s.wish, s.tone), () => talkChoices(talkAnswers1(s.player, s.style), talkMain))),
      300,
    );
    return;
  }
  const t = topics[i];
  talkSay("them", t.say, () =>
    talkChoices(smallAnswers(t), (a) => {
      s.bonus += toneScore(s.tone, a.tone) * 0.6;
      s.turns++;
      talkSay("me", a.text, () => talkSay("them", toneReply(s.tone, a.tone), () => talkTopic(topics, i + 1)), 0);
    }),
  );
}

// 말풍선 하나 (감독은 "..." 타이핑 뒤에 나옴)
function talkSay(who, text, next, delay) {
  const log = $("talk-modal").querySelector(".talk-log");
  const wait = speed(delay !== undefined ? delay : who === "them" ? 650 : 250);
  let typing = null;
  if (who === "them" && wait) {
    typing = document.createElement("p");
    typing.className = "bubble them typing";
    typing.innerHTML = "<i></i><i></i><i></i>";
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;
  }
  setTimeout(() => {
    if (typing) typing.remove();
    const p = document.createElement("p");
    p.className = `bubble ${who}`;
    p.textContent = text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    if (next) setTimeout(next, speed(250));
  }, wait);
}

function talkChoices(answers, onPick) {
  const box = $("talk-modal").querySelector(".talk-options");
  box.innerHTML = "";
  for (const a of answers) {
    const b = document.createElement("button");
    b.className = "choice";
    b.textContent = a.text;
    b.addEventListener("click", () => {
      box.innerHTML = "";
      onPick(a);
    });
    box.appendChild(b);
  }
}

// 본론 대답 뒤: 판단이 확실하면 바로 결론, 애매하면 압박 질문
function talkMain(a) {
  const s = talkState;
  s.bonus += a.score + toneScore(s.tone, a.tone) * 0.5;
  s.turns++;
  talkSay(
    "me",
    a.text,
    () =>
      talkSay("them", toneScore(s.tone, a.tone) > 0 ? toneReply(s.tone, a.tone) : a.reply, () => {
        if (s.wish.special) return talkFinish();
        const est = managerScore(s.player, s.wish) + clamp(s.bonus, -3, 3);
        const need = s.wish.need;
        if (est >= need + 2.5 || est < need - 8) return talkFinish(); // 이미 마음 정함
        talkSay("them", TALK_PRESS[s.tone], () => talkChoices(talkAnswers2(s.player, s.style), talkPress));
      }),
    0,
  );
}

function talkPress(a) {
  const s = talkState;
  s.bonus += a.score + toneScore(s.tone, a.tone) * 0.5;
  s.turns++;
  if (a.camp) s.opts.camp = true;
  if (a.threat) s.opts.threat = true;
  if (a.loyal) s.opts.loyal = true;
  talkSay("me", a.text, () => talkSay("them", a.reply, talkFinish), 0);
}

function talkFinish() {
  const s = talkState;
  const bonus = clamp(s.bonus, -3, 3);
  // 수락할 분위기면 조건 거는 감독도 있음 (다정한 감독 빼고, 반반)
  const est = s.wish.special ? -99 : managerScore(s.player, s.wish) + bonus;
  if (!s.condAsked && est >= s.wish.need && s.tone !== "warm" && Math.random() < 0.5) {
    s.condAsked = true;
    const c = pick(TALK_CONDITIONS);
    talkSay("them", `좋아. 대신 조건 하나. ${c.text}.`, () =>
      talkChoices(
        [
          { text: "받아들이겠습니다.", ok: true },
          { text: "조건은 좀… 그냥 믿어 주시면 안 될까요?", ok: false },
        ],
        (a) => {
          s.turns++;
          if (a.ok) {
            s.opts.cond = c.text;
            if (c.id === "young" && s.player.groups) groupUp(s.player, "young", 5);
          } else s.bonus -= 1.5;
          talkSay("me", a.text, () => talkSay("them", a.ok ? "좋아. 약속이다." : "…조건 없인 나도 부담이다.", talkVerdict), 0);
        },
      ),
    );
    return;
  }
  talkVerdict();
}

function talkVerdict() {
  const s = talkState;
  const bonus = clamp(s.bonus, -3, 3);
  const r = meetManager(s.player, s.wish.id, bonus, s.opts);
  rememberTalk(s, r);
  const say = s.wish.special ? (r.result === "no" ? "그건 안 되겠다." : pick(TALK_VERDICT[s.tone].yes)) : pick(TALK_VERDICT[s.tone][r.result]);
  talkSay("them", say, () => {
    talkSay("them", pick(TALK_BYE[s.tone]), () => {
      const box = $("talk-modal").querySelector(".talk-options");
      const tag = { yes: "✅ 수락", camp: "🤔 캠프에서 결정", no: "❌ 거절" }[r.result];
      let extra = "";
      if (r.result === "no" && s.opts.loyal) extra = "<small>대신 감독 신뢰가 쌓였어요</small>";
      if (r.result === "no" && s.opts.threat) extra = "<small>감독과 사이가 서먹해졌어요 (다음 시즌 컨디션 -1)</small>";
      if (s.opts.cond && r.result === "yes") extra += `<small>조건: ${s.opts.cond}</small>`;
      const view = r.view
        ? `<details class="mview-box"><summary>감독이 본 것</summary>${managerViewHtml(r.view)}<p class="small">대화 ${bonus >= 0 ? "+" : ""}${round(bonus, 1)} · 합계 ${r.score} / 필요 ${r.need}</p></details>`
        : "";
      box.innerHTML = `<p class="talk-result ${r.result}">${tag}<span>${r.line}</span>${extra}</p>${view}<button id="talk-close">면담 끝</button>`;
      $("talk-close").addEventListener("click", () => closeMeetingTalk(r));
    });
  });
}

// 다음 면담 때 감독이 꺼내는 기억
function rememberTalk(s, r) {
  const p = s.player;
  const m = managerOf(p);
  const mem = p.talkMemory && p.talkMemory.manager === m.name && p.talkMemory.team === p.team ? p.talkMemory : { manager: m.name, team: p.team, meets: 0 };
  mem.meets++;
  mem.last = {
    year: gameYear(p),
    wish: s.wish.id,
    result: r.result,
    camp: !!s.opts.camp,
    threat: !!s.opts.threat,
    loyal: !!s.opts.loyal,
    cond: s.opts.cond || null,
  };
  p.talkMemory = mem;
}

function closeMeetingTalk(r) {
  const player = talkState.player;
  $("talk-modal").hidden = true;
  talkState = null;
  addReaction(player, player.lastReport, [r.news], r.result === "no" ? FAN.lifeBad : FAN.good, {});
  savePlayer(player);
  showPlayer(player);
}
