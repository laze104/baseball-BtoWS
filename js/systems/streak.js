// =============================================
// streak.js : 연속 기록 + 루틴·징크스 (4구간 시즌)
// 1. 구간마다 연속 안타 / 연속 이닝 무실점 / 연속 경기 무실점이 생길 수 있음
// 2. 전반기 끝에 아직 이어지는 중이면: 루틴이 없으면 기자가 비결을 물음 (루틴 정하기)
//    루틴이 있으면 징크스 위기 (단골집 휴가, 장갑 세탁…) → 지키기 / 내려놓기 / 웃어넘기기
// 3. 후반기에 끝남. 징크스 깨진 직후 끊기면 밈이 됨
// =============================================

const ROUTINES = {
  food: {
    label: "매일 같은 메뉴 (국밥)",
    secret: "경기 전엔 무조건 국밥",
    crisis: "단골 국밥집 사장님이 하필 이번 주 휴가래요. 가게 문에 '여름휴가' 종이만 붙어 있어요.",
    keep: "옆 동네까지 택시 타고 가서 국밥",
    what: "국밥집 휴가",
  },
  glove: {
    label: "장갑 안 빨기",
    secret: "잘될 땐 장갑 절대 안 빨아요",
    crisis: "클럽하우스 직원이 냄새난다고 장갑을 세탁기에 돌려 버렸어요.",
    keep: "세탁된 장갑에 흙 다시 묻히고 동료들한테 만져 달라고 함",
    what: "장갑 세탁",
  },
  beard: {
    label: "수염 안 깎기",
    secret: "연속 기록 끝날 때까지 면도 안 해요",
    crisis: "구단 스폰서 광고 촬영이 잡혔는데 깔끔하게 면도하고 오래요.",
    keep: "광고 촬영 거절 (구단이 서운해함)",
    what: "광고 촬영 면도",
  },
  road: {
    label: "같은 길로 출근",
    secret: "야구장 갈 때 늘 같은 길로만 가요",
    crisis: "그 길이 도로 공사로 막혔대요. 돌아가면 20분이면 되는데…",
    keep: "새벽에 나와서 공사장 옆 인도로 걸어감",
    what: "도로 공사",
  },
  song: {
    label: "경기 전 같은 노래",
    secret: "경기 전에 같은 노래 한 곡만 반복해서 들어요",
    crisis: "원정 숙소에 이어폰을 두고 왔어요. 버스는 이미 출발했어요.",
    keep: "매니저한테 숙소 다녀와 달라고 부탁 (경기 전 훈련 지각)",
    what: "이어폰 분실",
  },
};

// 구간 끝 (flow.js afterHalf): 이번 구간 연속 기록
function streakHalf(player, ctx, half, part) {
  const r = ctx.report;
  const s = ctx.streak;
  // 전반기에 이어지던 기록이 후반기에 끝남
  if (s && s.live && half === 1) {
    finishStreak(player, ctx, s);
    return;
  }
  if (s && half === 1 && s.half === 1) return;
  const b = part.bat;
  const p = part.pit;
  let made = null;
  if (b && b.PA >= 120 && b.AVG >= 0.27) {
    const chance = clamp((b.AVG - 0.27) * 4 + 0.12, 0.12, 0.5);
    if (Math.random() < chance) {
      const len = Math.round(10 + Math.pow(Math.random(), 1.6) * (b.AVG - 0.24) * 140);
      made = { kind: "hit", len: clamp(len, 10, 38) };
    }
  } else if (p && p.outs >= 60 && p.ERA <= 2.8) {
    const starter = String(p.role).includes("선발");
    if (Math.random() < clamp((3 - p.ERA) * 0.15, 0.08, 0.4)) {
      made = starter
        ? { kind: "inn", len: randomInt(18, 32) + (p.ERA < 2 ? randomInt(0, 10) : 0) }
        : { kind: "app", len: randomInt(12, 24) + (p.ERA < 1.8 ? randomInt(0, 8) : 0) };
    }
  }
  if (!made) return;
  made.half = half;
  made.live = half === 0 && Math.random() < 0.45;
  ctx.streak = made;
  const word = streakWord(made);
  if (made.live) {
    r.news.push(`${player.name}, ${word} ${made.len}${streakUnit(made)} 행진 중… 후반기에도 이어 갈까`);
    r.toasts.push({ icon: "🔥", text: `${word} ${made.len}${streakUnit(made)} 진행 중` });
  } else finishStreak(player, ctx, made);
}

function streakWord(s) {
  return { hit: "연속 경기 안타", inn: "연속 이닝 무실점", app: "연속 경기 무실점" }[s.kind];
}
function streakUnit(s) {
  return s.kind === "inn" ? "이닝" : "경기";
}

// 끝난 연속 기록: 기사, 기록 비교, 징크스 밈
function finishStreak(player, ctx, s) {
  const r = ctx.report;
  if (s.live) {
    // 후반기로 이어진 만큼 더하기 (징크스 지켰으면 더 감)
    const keep = s.jinx === "keep" ? 0.7 : s.jinx === "joke" ? 0.5 : s.jinx === "drop" ? 0.25 : 0.5;
    if (Math.random() < keep) s.len += randomInt(3, s.kind === "inn" ? 12 : 10);
    else s.len += randomInt(0, 2);
    s.live = false;
  }
  const word = streakWord(s);
  const unit = streakUnit(s);
  const best = player.bestStreak || {};
  const prev = best[s.kind] || 0;
  best[s.kind] = Math.max(prev, s.len);
  player.bestStreak = best;
  const kboRec = s.kind === "hit" && r.league === "KBO" && s.len >= 39;
  let line = `${player.name}, ${word} ${s.len}${unit}에서 멈췄다`;
  if (s.jinx === "drop") line += ` (${ROUTINES[player.routine].what} 바로 다음 경기)`;
  r.news.push(line);
  if (kboRec || s.len >= 30) {
    r.bigMoments = r.bigMoments || [];
    r.bigMoments.push({
      tone: "gold",
      kicker: kboRec ? "KBO 기록" : "연속 기록",
      title: `🔥 ${word} ${s.len}${unit}`,
      lines: [
        kboRec ? "KBO 역대 최다 기록과 어깨를 나란히" : "리그 최근 몇 년 사이 가장 긴 기록",
        prev ? `개인 종전 기록 ${prev}${unit}` : "개인 최고 기록",
        player.routine ? `비결: ${ROUTINES[player.routine].secret}` : "",
      ].filter(Boolean),
    });
  }
  // 징크스 깨지고 바로 끊김 → 밈
  if (s.jinx === "drop" && player.routine) addMeme(player, "jinx", { what: ROUTINES[player.routine].what, len: s.len, word }, r);
  if (s.jinx === "keep" && s.len >= 25) player.jinxKept = (player.jinxKept || 0) + 1;
}

// 구간 사이 (flow.js halfBreak): 이어지는 기록이 있으면 루틴 정하기 / 징크스 위기
function streakBreak(player, ctx) {
  const s = ctx.streak;
  if (!s || !s.live || s.asked) return false;
  s.asked = true;
  const word = streakWord(s);
  if (!player.routine) {
    pushChoice(player, {
      key: "routineMake",
      mailFrom: "구단 홍보팀",
      mailSubject: "인터뷰 요청: 연속 기록 비결",
      text: `🎤 ${word} ${s.len}${streakUnit(s)}째예요. 기자들이 비결을 물어요. 사실 요즘 몰래 지키는 루틴이 하나 있는데…`,
      options: Object.entries(ROUTINES).map(([id, x]) => ({ id, label: x.label, detail: `"${x.secret}"` })),
    });
    return true;
  }
  if (Math.random() >= 0.55) return false; // 위기는 가끔만
  const rt = ROUTINES[player.routine];
  pushChoice(player, {
    key: "jinx",
    mailFrom: "매니저",
    mailSubject: "[긴급] 징크스 비상",
    text: `😱 ${word} ${s.len}${streakUnit(s)}째인데 큰일 났어요. ${rt.crisis}<br>루틴: "${rt.secret}"`,
    options: [
      { id: "keep", label: rt.keep, detail: "징크스 사수 · 기록 이어 갈 확률 ↑ · 피곤하거나 돈 듦" },
      { id: "drop", label: "에이, 징크스는 미신이지", detail: "그냥 넘어감 · 끊기면 밈 될 수도" },
      { id: "joke", label: "인터뷰에서 웃으면서 다 털어놓기", detail: "팬 여론 ↑ · 기록은 반반" },
    ],
  });
  return true;
}

function resolveRoutine(player, choice, option) {
  player.routine = option.id;
  const ctx = player.cur;
  if (ctx) ctx.partMod = (ctx.partMod || 0) + 0.5; // 루틴 생기니 마음이 편함
  const rt = ROUTINES[option.id];
  return [`${player.name} 연속 기록 비결은? "${rt.secret}"… 팬들 사이에 화제`];
}

function resolveJinx(player, choice, option) {
  const ctx = player.cur;
  if (!ctx || !ctx.streak) return [];
  const id = option.id;
  const rt = ROUTINES[player.routine];
  ctx.streak.jinx = id;
  player.lastJinx = id;
  if (id === "keep") {
    if (player.routine === "food" || player.routine === "song") player.money -= 30;
    if (player.routine === "beard") changeTeamFans(player, player.team, -1);
    return [`${player.name}, 징크스 사수 작전… ${rt.keep}`];
  }
  if (id === "joke") {
    changeFame(player, 2);
    return [`${player.name} "${rt.what}? 기록 끊기면 그 탓 하려고요 ㅋㅋ"… 인터뷰 화제`];
  }
  return [`${player.name} "징크스는 미신이죠"… ${rt.what}에도 덤덤`];
}

Object.assign(MEME_TYPES, {
  jinx: {
    name: (p, x) => `${x.what} 때문에 끊긴 ${x.word} ${x.len}`,
    comments: ["{meme} ㅋㅋㅋ 이거 아직도 웃김", "징크스는 과학이다", "{name} 루틴 건드리지 마라", "{meme} 그 직원 아직 일하냐"],
    again: ["또 징크스 깨지는 거 아니지?", "{meme} 시즌2 각", "루틴 지켜라 제발"],
    flipNick: "징크스 극복남",
    flipNews: "{name}, '{meme}' 이젠 옛말… 루틴 없이도 기록 행진",
  },
});

Object.assign(MAIL_SENDERS, {
  routineMake: { from: "구단 홍보팀", icon: "🎤", subject: "연속 기록 인터뷰" },
  jinx: { from: "매니저", icon: "😱", subject: "징크스 비상" },
});

Object.assign(FAN, {
  routine: ["이게 비결이었냐 ㅋㅋㅋ", "야구선수들 징크스 진짜 많더라", "이제 그 루틴 못 바꾸겠네", "오늘도 그거 했냐?"],
  jinxKeep: ["징크스는 과학이다 ㅋㅋ", "그 정도 정성이면 기록 이어 간다", "이게 프로의 자세 ㅋㅋㅋ", "구단 직원들 고생한다"],
  jinxDrop: ["쿨하네 근데 끊기면 ㅈ된다", "미신이라더니 끊기면 웃기겠다", "징크스 무시하면 벌 받음"],
  jinxJoke: ["인터뷰 개웃기네 ㅋㅋㅋ", "예능감 미쳤다", "이런 선수 좋아", "기자들 빵 터짐 ㅋㅋ"],
});

function jinxPool(player, key) {
  if (key === "routineMake") return FAN.routine;
  return { keep: FAN.jinxKeep, drop: FAN.jinxDrop, joke: FAN.jinxJoke }[player.lastJinx];
}

ACHIEVEMENTS.push(
  { id: "streak30", group: "시즌 기록", name: "멈추지 않는 기차", desc: "연속 경기 안타 30경기", check: (p) => ((p.bestStreak || {}).hit || 0) >= 30 },
  { id: "jinxKept", group: "인생", name: "징크스는 과학", desc: "징크스 지켜 가며 연속 기록 25 이상", check: (p) => (p.jinxKept || 0) >= 1 },
);
