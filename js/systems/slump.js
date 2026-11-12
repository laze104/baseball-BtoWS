// =============================================
// slump.js : 슬럼프 구조 (4구간 시즌, 전반기 끝)
// 시즌 시작에 슬럼프가 걸렸거나 전반기가 예상보다 한참 못하면 메일이 옴
// 폼 수정(도박) / 영상 분석(안전) / 휴식 요청(열흘 말소) / 멘탈 코치 / 그냥 버티기
// 폼 수정은 독도 될 수 있음: 실패하면 능력치도 빠지고 다음 캠프까지 꼬임
// =============================================

function slumpCheck(player, ctx) {
  const r = ctx.report;
  if ((ctx.inj && ctx.inj.left > 0) || ctx.down || ctx.slump) return false;
  const b = r.bat;
  const p = r.pit;
  const played = (b && b.PA >= 100) || (p && p.outs >= 60);
  if (!played) return false;
  const side = b && b.PA >= 100 ? "bat" : "pit";
  // 진짜 못하고 있어야 슬럼프: 리그 평균·작년 성적이랑 비교 (OPS .860 같은 건 슬럼프 아님)
  const env = LEAGUE_ENV[player.league] || NEUTRAL_ENV;
  const prev = [...player.history]
    .reverse()
    .find((h) => h.league === player.league && (side === "bat" ? h.bat && h.bat.PA >= 200 : h.pit && h.pit.outs >= 150));
  let gap; // + 면 평균보다 못함 (OPS 0.1 = 1)
  let drop = 0; // 작년보다 얼마나 떨어졌나
  if (side === "bat") {
    gap = (env.ops - b.OPS) / 0.1;
    if (prev) drop = (prev.bat.OPS - b.OPS) / 0.1;
  } else {
    gap = (p.ERA - env.era) / 1.0;
    if (prev) drop = (p.ERA - prev.pit.ERA) / 1.0;
  }
  const bad = gap >= 0.3 || (drop >= 1.2 && gap >= -0.2); // 평균보다 확실히 밑, 또는 작년보다 확 떨어지고 평균 근처
  const deep = r.events.includes("슬럼프") && bad; // 시즌 시작에 걸린 슬럼프가 실제 성적으로 드러남 (career.js)
  const pace = r.WAR * 2;
  const pj = ctx.pj ? ctx.pj.WAR : 0;
  const under = pj >= 1.5 && pace < pj - 2 && (bad || gap >= 0); // 예상보다 한참 밑 + 평균 이하
  if (!deep && !under) return false;
  const base = deep ? 5 : 2; // 되돌릴 수 있는 컨디션 폭
  ctx.slump = { base, deep };
  const line = side === "bat" ? `타율 ${fmtRate(b.AVG)} OPS ${fmtRate(b.OPS)}` : `평균자책 ${p.ERA.toFixed(2)}`;
  const vs = side === "bat" ? `리그 평균 OPS ${fmtRate(env.ops)}` : `리그 평균자책 ${env.era.toFixed(2)}`;
  const prevLine = prev && drop >= 1 ? ` 작년엔 ${side === "bat" ? `OPS ${fmtRate(prev.bat.OPS)}` : `평균자책 ${prev.pit.ERA.toFixed(2)}`}였어요.` : "";
  const formLabel = side === "bat" ? "타격폼 손보기" : "투구폼 손보기";
  const mental = hasItem(player, "mental");
  const ws = weakSpot(player, side); // analysis.js
  pushChoice(player, {
    key: "slump",
    mailFrom: side === "bat" ? "타격코치실" : "투수코치실",
    mailSubject: deep ? "[면담] 요즘 왜 이러냐" : "[면담] 전반기 돌아보기",
    side,
    text: `📉 전반기 ${line} (${vs}).${prevLine} ${deep ? (side === "bat" ? "타구 질도 공 보는 눈도 다 무너진 진짜 슬럼프예요." : "구위도 제구도 다 무너진 진짜 슬럼프예요.") : `데이터팀 예상(WAR ${pj})보다 한참 밑이에요.`} 코치가 후반기 전에 뭐라도 바꿔 보자고 해요.`,
    options: [
      { id: "form", label: formLabel, detail: "도박 · 붙으면 확 살아나고 능력치 +1, 안 붙으면 더 꼬임" },
      { id: "video", label: "좋았을 때 영상이랑 비교 분석", detail: `안전 · 전력분석팀: "요즘 ${ws.text}가 문제"` },
      { id: "rest", label: "열흘 쉬겠다고 요청", detail: "엔트리 말소 열흘 · 머리 비우고 확실히 회복" },
      { id: "mental", label: "멘탈 코치와 상담", detail: mental ? "전담 멘탈 코치 있음 · 효과 좋음" : "외부 상담 2천만 원 · 효과 보통" },
      { id: "endure", label: "그냥 버틴다. 야구는 결국 평균", detail: "운에 맡김" },
    ],
  });
  return true;
}

function resolveSlump(player, choice, option) {
  const ctx = player.cur;
  if (!ctx || !ctx.slump) return [];
  const base = ctx.slump.base;
  const id = option.id;
  const add = (v) => (ctx.partMod = (ctx.partMod || 0) + round(v, 1));
  const side = choice.side;
  const key = side === "bat" ? "contact" : "control";
  const news = [];
  ctx.slump.pick = id;
  if (id === "form") {
    const stat = player.stats[key] !== undefined ? player.stats[key] : 50;
    const ok = Math.random() < clamp(0.45 + (stat - 60) / 100 + ((player.stats.mental || 50) - 50) / 200, 0.25, 0.75);
    ctx.slump.ok = ok;
    if (ok) {
      add(base + 1);
      statUp(player, key, 1); // phases.js
      news.push(`${player.name}, ${side === "bat" ? "타격폼" : "투구폼"} 수정 효과 봤다… "이제야 내 공(타이밍)을 찾았다"`);
    } else {
      add(-2);
      statUp(player, key, -1);
      player.nextMod = (player.nextMod || 0) - 1; // 다음 캠프까지 꼬임
      news.push(`${player.name}, 폼 수정 후 더 흔들려… "원래 폼도 기억 안 난다"`);
    }
  } else if (id === "video") {
    const ok = Math.random() < 0.8;
    ctx.slump.ok = ok;
    add(ok ? base * 0.7 : base * 0.25);
    const ws = weakSpot(player, side);
    news.push(`${player.name}, 전력분석팀과 영상 분석… ${ws.text} 약점 집중 점검`);
  } else if (id === "rest") {
    ctx.slumpRest = 10; // 후반기 열흘 빠짐 (flow.js beforeHalf)
    add(base * 0.8);
    news.push(`${player.name}, 자청해서 열흘 엔트리 말소… "머리 좀 비우고 오겠다"`);
  } else if (id === "mental") {
    const has = hasItem(player, "mental");
    if (!has) player.money -= 2000;
    add(has ? base * 0.8 : base * 0.5);
    news.push(`${player.name}, 멘탈 코치와 상담… "결과 말고 과정만 보기로 했다"`);
  } else {
    const v = randomInt(-1, Math.round(base * 0.7));
    ctx.slump.ok = v > 0;
    add(v);
    news.push(v > 0 ? `${player.name} "버티면 올라온다"… 후반기 반등 기대` : `${player.name}, 버티기 들어갔지만 반등 기미 없어`);
  }
  player.lastSlump = id;
  player.slumps = (player.slumps || 0) + 1;
  return news;
}

// 후반기 끝나고: 슬럼프 탈출했는지 기사 (flow.js afterHalf)
function slumpAfter(player, ctx, part) {
  const s = ctx.slump;
  if (!s || s.after) return;
  s.after = true;
  const sc = perfScore(part, player.league); // roster.js
  const r = ctx.report;
  if (sc >= 0.5) {
    r.news.push(`${player.name}, 후반기 반등… 슬럼프 탈출 ${s.pick === "form" ? "(폼 수정 신의 한 수)" : ""}`.trim());
    player.slumpEscapes = (player.slumpEscapes || 0) + 1;
    r.toasts.push({ icon: "📈", text: "슬럼프 탈출!" });
  } else if (sc <= -0.8) {
    r.news.push(`${player.name}, 후반기에도 부진… 길어지는 슬럼프`);
  }
}

Object.assign(MAIL_SENDERS, {
  slump: { from: "코치실", icon: "📉", subject: "슬럼프 면담" },
});

Object.assign(FAN, {
  slumpForm: ["폼 바꾸는 거 도박인데", "잘되면 대박 안 되면 쪽박", "타격코치 믿어 본다", "시즌 중에 폼 바꾸는 건 좀…"],
  slumpVideo: ["영상 분석 ㅇㅈ 요즘은 데이터지", "전력분석팀 일한다", "좋을 때 폼 찾아라"],
  slumpRest: ["열흘 쉬고 와라", "머리 비우는 것도 중요하지", "쉬는 것도 실력"],
  slumpMental: ["멘탈이 반이다", "멘탈 코치 효과 있더라", "마음 편하게 해라"],
  slumpEndure: ["버티는 놈이 이긴다", "결국 평균 수렴함", "언젠간 터진다 믿는다", "버티기는 무슨 2군 보내라"],
});

function slumpPool(player) {
  return { form: FAN.slumpForm, video: FAN.slumpVideo, rest: FAN.slumpRest, mental: FAN.slumpMental, endure: FAN.slumpEndure }[player.lastSlump];
}

ACHIEVEMENTS.push({ id: "slumpEscape", group: "커리어", name: "슬럼프 탈출", desc: "후반기 반등으로 슬럼프 탈출", check: (p) => (p.slumpEscapes || 0) >= 1 });
