// =============================================
// life.js : 팬 여론(fame)과 인터뷰·사생활 이벤트
// 이벤트 목록은 data/events.js LIFE_EVENTS + 이 파일 아래쪽 인터뷰
// =============================================

// fame: -100(공공의 적) ~ 100(국민 스타)
function changeFame(player, amount) {
  player.fame = clamp(Math.round((player.fame || 0) + amount), -100, 100);
}

function fameLabel(fame) {
  if (fame >= 60) return "국민 스타";
  if (fame >= 30) return "인기 선수";
  if (fame >= -10) return "보통";
  if (fame >= -40) return "비호감";
  return "공공의 적";
}

// 시즌 성적이 여론에 주는 영향
function seasonFame(player, report) {
  const before = player.fame || 0;
  if (!isAmateur(report.league)) {
    // 팬덤이 큰 팀은 잘하면 더 뜨겁고, 못하면 더 차가움
    const fan = 0.7 + teamFandom(report.team) * 0.12; // 1 → 0.82배, 5 → 1.3배
    if (report.grade === "great") changeFame(player, 6 * fan);
    else if (report.grade === "good") changeFame(player, 2 * fan);
    else if (report.grade === "bad") changeFame(player, -4 * fan);
  }
  changeFame(player, Math.min(report.awards.length * 2, 8));
  // 시간이 지나면 여론은 조금씩 잊힘
  player.fame = Math.round(player.fame * 0.95);
  report.fameChange = player.fame - before;
}

// 시즌 뒤 40% 확률로 인터뷰·사생활 이벤트
function maybeLifeEvent(player, report) {
  if (player.retired) return;
  const pending = [player.pendingChoice, ...player.choiceQueue].filter(Boolean);
  if (pending.some((c) => c.key === "forcedRetire")) return;
  // 인터뷰는 자주(45%), 사생활 이벤트는 가끔(25%) / 한 비시즌에 하나만
  const eligible = LIFE_EVENTS.filter((ev) => ev.when(player, report));
  const interviews = eligible.filter((ev) => ev.interview);
  const others = eligible.filter((ev) => !ev.interview);
  let ev = null;
  // 덜 본 이벤트가 먼저 나옴
  const seen = player.eventLog || (player.eventLog = {});
  const fresh = (list) => {
    const min = Math.min(...list.map((e) => seen[e.id] || 0));
    return pick(list.filter((e) => (seen[e.id] || 0) === min));
  };
  // 연애·결혼은 따로 챙김: 연애 중(만 26세+)이면 비시즌마다 40%로 결혼 이야기, 솔로면 15%로 새 인연
  const marriage = eligible.find((e) => e.id === "marriage");
  const dating = eligible.find((e) => e.id === "dating");
  if (marriage && Math.random() < 0.4) ev = marriage;
  else if (dating && Math.random() < 0.15) ev = dating;
  else if (interviews.length && Math.random() < 0.4) ev = fresh(interviews);
  else if (others.length && Math.random() < 0.5) ev = fresh(others);
  if (!ev) return;
  seen[ev.id] = (seen[ev.id] || 0) + 1;
  const idx = priceIndex(player);
  const extra = { rival: player.rival ? player.rival.name : "", event: report.national ? report.national.name : "" };
  pushChoice(player, {
    key: "life",
    eventId: ev.id,
    text: (ev.interview ? "🎤 " : "") + fillText(ev.text, player, extra),
    options: ev.options.map((o) => {
      const hints = [];
      if (o.money) hints.push(`수입 ${fmtMoney(o.money * idx)}`);
      if (o.cost) hints.push(`비용 ${fmtMoney(o.cost * idx)}`);
      if (o.stats) {
        const parts = Object.entries(o.stats)
          .filter(([k]) => player.stats[k] !== undefined)
          .map(([k, v]) => `${BATTER_STATS[k] || PITCHER_STATS[k]} ${v > 0 ? "+" : ""}${v}`);
        if (parts.length) hints.push(parts.join(", "));
      }
      if (o.nextMod > 0) hints.push("다음 시즌 컨디션 ↑");
      if (o.moneyRate) hints.push(`약 ${fmtMoney(-player.money * o.moneyRate)}`);
      if (o.nextMod < 0) hints.push("다음 시즌 컨디션 ↓");
      return { ...o, detail: hints.join(" · ") };
    }),
  });
}

function resolveLifeChoice(player, choice, option) {
  const news = [];
  const fame = option.fame === "random" ? randomInt(-15, 20) : option.fame || 0;
  changeFame(player, fame);
  if (option.money) addMoney(player, option.money * priceIndex(player));
  if (option.cost) player.money -= Math.round(option.cost * priceIndex(player));
  if (option.stats) {
    for (const [k, v] of Object.entries(option.stats)) {
      if (player.stats[k] !== undefined) player.stats[k] = clamp(player.stats[k] + v, 1, 99);
    }
  }
  if (option.flag === "kids") player.kids = (player.kids || 0) + 1;
  if (option.flag === "pet") player.pet = true;
  if (option.moneyRate) player.money += Math.round(player.money * option.moneyRate);
  if (option.mental) {
    const key = player.stats.mental !== undefined ? "mental" : "clutch";
    player.stats[key] = clamp(player.stats[key] + option.mental, 1, 99);
  }
  if (option.nextMod) player.nextMod = (player.nextMod || 0) + option.nextMod;
  if (option.flag === "dating") player.dating = true;
  if (option.flag === "married") {
    player.married = true;
    player.dating = false;
  }
  if (option.news) news.push(fillText(option.news, player, { rival: player.rival ? player.rival.name : "" }));
  news.push(`팬 여론 ${fame >= 0 ? "+" : ""}${fame} → ${player.fame} (${fameLabel(player.fame)})`);
  return news;
}

// ---------------------------------------------
// 인터뷰 (자주 열림)
// ---------------------------------------------

for (const ev of LIFE_EVENTS) if (ev.id.startsWith("interview")) ev.interview = true;

LIFE_EVENTS.push(
  {
    id: "mediaDay",
    interview: true,
    when: (p) => !isAmateur(p.league) && !isServing(p),
    text: "시즌 개막 미디어데이. 기자가 올 시즌 목표를 물어요.",
    options: [
      { id: "a", label: '"개인 기록보다 팀 우승이 먼저입니다"', fame: 5, news: '{name} "개인 기록보다 팀"… 미디어데이 모범 답안', mood: "good" },
      { id: "b", label: '"올해 MVP는 제 겁니다"', fame: -3, nextMod: 1, news: "{name}, 미디어데이 MVP 선언… 자신감인가 허세인가", mood: "bad" },
      { id: "c", label: '"다치지 않고 풀시즌 뛰는 게 목표예요"', fame: 2, news: '{name} "목표는 풀타임" 담담한 각오', mood: "good" },
    ],
  },
  {
    id: "rivalQ",
    interview: true,
    when: (p) => p.rival && !p.rival.retired && !isAmateur(p.league),
    text: "기자가 동갑내기 라이벌 {rival}에 대해 물어요.",
    options: [
      { id: "a", label: '"정말 존경하는 선수예요"', fame: 5, news: '{name} "{rival|은} 존경하는 친구"… 훈훈한 라이벌', mood: "good" },
      { id: "b", label: '"솔직히 제가 한 수 위죠"', fame: "random", nextMod: 1, news: '{name}, 라이벌 {rival} 공개 도발 "내가 한 수 위"', mood: "bad" },
      { id: "c", label: '"남 신경 쓸 시간 없어요"', fame: 0, news: '{name} "라이벌? 신경 안 쓴다"', mood: "good" },
    ],
  },
  {
    id: "faQ",
    interview: true,
    when: (p) =>
      p.league === "KBO" &&
      ((p.contract && p.contract.isFA && p.contract.years === 1) || (p.contract && !p.contract.isFA && (p.kboService || 0) === kboFaNeeded(p) - 1)),
    text: 'FA를 1년 앞두고 기자가 묻습니다. "내년 거취는요?"',
    options: [
      { id: "a", label: '"이 팀에서 끝까지 뛰고 싶어요"', fame: 8, news: '{name} "{team}에서 은퇴하고 싶다"… 팬심 저격', mood: "good" },
      { id: "b", label: '"모든 가능성을 열어두겠습니다"', fame: -4, news: '{name} "모든 가능성 열어둔다"… 이적 시사?', mood: "bad" },
      { id: "c", label: '"해외 도전도 생각하고 있어요"', fame: 2, news: "{name}, 해외 진출 의지 공개", mood: "good" },
    ],
  },
  {
    id: "nationalQ",
    interview: true,
    when: (p, r) => !!r.national,
    text: "{event}를 마치고 돌아온 공항 인터뷰.",
    options: [
      { id: "a", label: '"태극마크는 언제나 영광입니다"', fame: 6, news: '{name} "태극마크는 영광"… 귀국 소감', mood: "good" },
      { id: "b", label: '"솔직히 많이 피곤하네요"', fame: -4, news: '{name} "대표팀 피곤했다" 솔직 발언 논란', mood: "bad" },
    ],
  },
  {
    id: "veteranQ",
    interview: true,
    when: (p) => p.age >= 34 && !isAmateur(p.league),
    text: "베테랑이 된 당신에게 기자가 은퇴 시점을 물어요.",
    options: [
      { id: "a", label: '"몸이 허락하는 한 계속 뜁니다"', fame: 3, mental: 1, news: '{name} "몸이 허락하는 한 현역"', mood: "good" },
      { id: "b", label: '"후배들에게 길을 열어줄 때가 오겠죠"', fame: 6, news: '{name} "후배들 위해 물러날 때도 생각"… 품격 있는 베테랑', mood: "good" },
    ],
  },
  {
    id: "hsQ",
    interview: true,
    when: (p, r) => p.league === "HS" && r.grade === "great",
    text: "고교 유망주로 주목받으며 첫 언론 인터뷰를 해요. 롤모델을 묻네요.",
    options: [
      { id: "a", label: '"우리 학교 선배님들이요"', fame: 4, news: '{school} {name} "선배님들처럼 되고 싶다"', mood: "good" },
      { id: "b", label: '"메이저리그 슈퍼스타요!"', fame: 2, news: '고교 유망주 {name} "꿈은 메이저리그"', mood: "good" },
    ],
  },
);
