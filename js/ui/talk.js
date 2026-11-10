// =============================================
// talk.js : 감독 면담 1대1 대화 팝업
// 요청 → 감독 질문 → 내 대답 → 한 번 더 압박 → 결론
// 대답이 감독 스타일과 맞으면 점수 조금 +, 안 맞으면 - (최대 ±3)
// 최종 판단은 world.js meetManager (실력·성적·입지가 기본)
// =============================================

const TALK_GREET = {
  trust: ["왔냐. 앉아. 무슨 일이야?", "그래, 얼굴 보니 할 말 있는 표정이네."],
  run: ["주루 훈련 끝났어? 말해 봐.", "뛰다 왔나 숨이 차네. 무슨 일이야?"],
  pitch: ["불펜 보고 왔다. 무슨 일인데?", "투수코치랑 얘기하던 중이었어. 들어와."],
  results: ["용건만 말해. 오늘 분석 미팅 있다.", "시간 없다. 짧게."],
  talk: ["커피 한잔 할래? 편하게 얘기해.", "어, 들어와. 요즘 어때?"],
  defense: ["펑고 받고 왔어? 앉아.", "수비 훈련 봤다. 무슨 일이야?"],
  youth: ["오, 왔어? 무슨 고민 있어?", "들어와. 할 말 있으면 다 해."],
};

// 요청별 첫 질문
function talkQuestion(wish) {
  if (wish.id === "resolve") return "각오라… 말로는 누구나 하지. 뭐가 달라졌는데?";
  if (wish.id === "rest") return "체력 관리라. 네가 빠지는 경기는 누가 메우지?";
  if (wish.id === "trade") return "트레이드? …진심이야? 이유부터 들어 보자.";
  if (wish.id === "captain") return "주장은 완장 하나 차는 게 아니야. 왜 너여야 하지?";
  if (wish.id === "pinch") return "대타라도 괜찮다고? 벤치가 그렇게 답답했나?";
  return `${wish.short}이라… 왜 그래야 하는지 말해 봐.`;
}

// 작년 기록 한 줄 (성적으로 말하기 선택지용)
function lastLineText(player) {
  const h = [...player.history].reverse().find((x) => !isAmateur(x.league));
  if (!h) return "";
  if (h.bat && (!h.pit || h.bat.PA > 100)) return `작년 OPS ${fmtRate(h.bat.OPS)}, WAR ${h.WAR}`;
  if (h.pit) return `작년 평균자책 ${h.pit.ERA.toFixed(2)}, WAR ${h.WAR}`;
  return `작년 WAR ${h.WAR}`;
}

// 첫 대답: 성적 / 팀 / 감정
function talkAnswers1(player, style) {
  const war = recentWar(player);
  const young = player.age <= 25;
  return [
    {
      id: "stats",
      text: lastLineText(player) ? `숫자로 말할게요. ${lastLineText(player)}입니다.` : "아직 보여 드린 건 없지만, 실력은 자신 있습니다.",
      score: (war >= 2 ? 1.5 : war >= 0.5 ? 0 : -1.5) * (style === "results" ? 1.5 : 1),
      reply: war >= 2 ? "…숫자는 거짓말 안 하지." : war >= 0.5 ? "그 정도는 다른 애들도 해." : "그 숫자로 지금 그 얘기를 하는 거야?",
    },
    {
      id: "team",
      text: "제가 그 자리에 있어야 팀이 더 이길 수 있다고 생각해요.",
      score: ["trust", "defense", "pitch"].includes(style) ? 1 : 0.5,
      reply: ["trust", "defense", "pitch"].includes(style) ? "팀 얘기부터 하는 건 마음에 드네." : "다들 그렇게 말하지.",
    },
    {
      id: "heart",
      text: "솔직히… 이대로면 저 자신한테 자꾸 실망하게 돼요.",
      score: style === "talk" ? 1.5 : style === "youth" && young ? 1 : style === "results" ? -1.5 : -0.5,
      reply:
        style === "talk" || (style === "youth" && young)
          ? "그런 얘기 해 줘서 고맙다. 진짜로."
          : style === "results"
            ? "감정은 집에 두고 와."
            : "흠. 그건 네가 이겨 내야 할 문제고.",
    },
  ];
}

// 두 번째: 안 된다고 하면?
function talkAnswers2(player, style) {
  const lv = LEAGUES[player.league].level;
  const strong = isFranchiseHere(player) || (player.fame || 0) >= 30 || getOvrs(player).best - lv >= 6;
  return [
    {
      id: "camp",
      text: "그럼 캠프에서 실력으로 증명하겠습니다.",
      score: ["talk", "youth", "trust"].includes(style) ? 0.5 : 0,
      camp: true,
      reply: "좋아. 그 말 캠프에서 지켜본다.",
    },
    {
      id: "threat",
      text: "그럼 저도 다른 길을 생각해 봐야죠.",
      score: strong ? 1.5 : -2,
      threat: true,
      reply: strong ? "…너 같은 선수를 놓칠 생각은 없다." : "지금 나한테 협박하는 거냐?",
    },
    { id: "loyal", text: "알겠습니다. 감독님 판단 따르겠습니다.", score: style === "trust" ? 0.5 : 0, loyal: true, reply: "그 태도 마음에 든다." },
  ];
}

const TALK_VERDICT = {
  yes: ["좋아. 그렇게 하자.", "알았다. 대신 결과로 보여 줘.", "네 말 믿어 보마."],
  camp: ["당장 답은 못 준다. 캠프에서 보자.", "캠프 끝나고 다시 얘기하자. 거기서 보여 줘."],
  no: ["아직은 아니다.", "지금은 안 된다. 더 보여 줘야 해.", "미안하지만 이번엔 안 되겠다."],
};

let talkState = null;

function openMeetingTalk(player, wishId) {
  const wish = MEETING_WISHES.find((w) => w.id === wishId);
  const m = managerOf(player);
  talkState = { player, wish, style: m.style, bonus: 0, opts: {}, step: 0 };
  const modal = $("talk-modal");
  modal.querySelector(".talk-head").innerHTML =
    `<span class="talk-face">🧢</span><div><b>${managerTitle(player)}</b><small>${MANAGER_STYLES[m.style] ? MANAGER_STYLES[m.style].name : ""} · 감독실</small></div>`;
  modal.querySelector(".talk-log").innerHTML = "";
  modal.querySelector(".talk-options").innerHTML = "";
  modal.hidden = false;
  talkSay("them", pick(TALK_GREET[m.style] || TALK_GREET.talk), () => {
    talkSay("me", wish.label, () => talkSay("them", talkQuestion(wish), () => talkChoices(talkAnswers1(player, m.style))), 0);
  });
}

// 말풍선 하나 (감독은 "..." 타이핑 뒤에 나옴)
function talkSay(who, text, next, delay) {
  const log = $("talk-modal").querySelector(".talk-log");
  const wait = delay !== undefined ? delay : who === "them" ? 700 : 250;
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
    if (next) setTimeout(next, 300);
  }, wait);
}

function talkChoices(answers) {
  const box = $("talk-modal").querySelector(".talk-options");
  box.innerHTML = "";
  for (const a of answers) {
    const b = document.createElement("button");
    b.className = "choice";
    b.textContent = a.text;
    b.addEventListener("click", () => talkAnswer(a));
    box.appendChild(b);
  }
}

function talkAnswer(a) {
  const s = talkState;
  $("talk-modal").querySelector(".talk-options").innerHTML = "";
  s.bonus += a.score;
  if (a.camp) s.opts.camp = true;
  if (a.threat) s.opts.threat = true;
  if (a.loyal) s.opts.loyal = true;
  s.step += 1;
  talkSay(
    "me",
    a.text,
    () =>
      talkSay("them", a.reply, () => {
        // 특별 면담(각오·체력·트레이드)은 질문 하나로 끝
        if (s.step === 1 && !s.wish.special) {
          talkSay("them", "만약 내가 안 된다고 하면?", () => talkChoices(talkAnswers2(s.player, s.style)));
        } else {
          talkFinish();
        }
      }),
    0,
  );
}

function talkFinish() {
  const s = talkState;
  const bonus = clamp(s.bonus, -3, 3);
  const r = meetManager(s.player, s.wish.id, bonus, s.opts);
  const say = s.wish.special ? (r.result === "no" ? "그건 안 되겠다." : "알았다. 그렇게 하자.") : pick(TALK_VERDICT[r.result]);
  talkSay("them", say, () => {
    const box = $("talk-modal").querySelector(".talk-options");
    const tag = { yes: "✅ 수락", camp: "🤔 캠프에서 결정", no: "❌ 거절" }[r.result];
    let extra = "";
    if (r.result === "no" && s.opts.loyal) extra = "<small>대신 감독 신뢰가 쌓였어요</small>";
    if (r.result === "no" && s.opts.threat) extra = "<small>감독과 사이가 서먹해졌어요 (다음 시즌 컨디션 -1)</small>";
    box.innerHTML = `<p class="talk-result ${r.result}">${tag}<span>${r.line}</span>${extra}</p><button id="talk-close">면담 끝</button>`;
    $("talk-close").addEventListener("click", () => closeMeetingTalk(r));
  });
}

function closeMeetingTalk(r) {
  const player = talkState.player;
  $("talk-modal").hidden = true;
  talkState = null;
  addReaction(player, player.lastReport, [r.news], r.result === "no" ? FAN.lifeBad : FAN.good, {});
  savePlayer(player);
  showPlayer(player);
}
