// =============================================
// roster.js : 1군·2군 오르내리기 (4구간 시즌)
// 1. 전반기 끝에 부진하면 2군 강등 통보 (메일) → 받아들이기 / 감독실 찾아가기 / 리프레시 말소(베테랑)
// 2. 2군 기록은 따로 (report.minorLine). 2군에서 잘 치면 빨리 콜업, 9월 확대 엔트리 때 올라오기도 함
// 3. 퓨처스·마이너 선수는 전반기 잘하면 1군 콜업 → 후반기는 1군에서
// 4. 1군 등록일수: 2군 간 날은 빠짐 (KBO FA 시계), 콜업된 날은 쌓임
// 시즌 리그(report.league)는 그대로 두고, 다른 레벨에서 뛴 건 minorLine 에만 남김 (통산 기록 안 섞이게)
// =============================================

// 내려가는 곳 / 올라가는 곳
const DOWN_LEVEL = {
  KBO: { key: "KBO2", name: "퓨처스", back: "1군 복귀" },
  NPB: { key: "KBO2", name: "2군", level: 54, back: "1군 재등록" },
  MLB: { key: "MILB", name: "트리플A", back: "빅리그 복귀" },
};
const UP_LEVEL = {
  KBO2: { key: "KBO", name: "1군" },
  MILB: { key: "MLB", name: "메이저리그" },
};
const SEPT_DAY = 62; // 후반기 62일째 = 9월 확대 엔트리

// 다른 레벨에서 days 일 동안 뛴 기록 (리그만 잠깐 바꿔서 출전 계획 계산)
function simAtLevel(player, lgKey, level, days, mod) {
  const keep = player.league;
  const lv = level || LEAGUES[lgKey].level;
  const env = LEAGUE_ENV[lgKey];
  const frac = days / KBO_SEASON_DAYS;
  const out = {};
  player.league = lgKey;
  try {
    const ovrs = getOvrs(player);
    if (ovrs.bat !== null) {
      const plan = batterPlan(player, ovrs.bat);
      const g = Math.max(1, Math.round(plan.games * frac));
      out.bat = steadyBattingSeason(player.stats, lv, g, plan.pa, mod, player.position.split(" 겸 ").pop(), env);
      out.bat.role = plan.label;
    }
    if (ovrs.pit !== null) {
      const plan = pitcherPlan(player, ovrs.pit);
      const g = Math.max(1, Math.round(plan.games * frac));
      out.pit = steadyPitchingSeason(player.stats, lv, plan.role, g, mod, env);
      out.pit.role = plan.label;
    }
  } finally {
    player.league = keep;
  }
  return out;
}

// 성적 점수: 0 = 리그 평균, +1 = 꽤 잘함, -1 = 꽤 못함
function perfScore(rec, lgKey) {
  const env = LEAGUE_ENV[lgKey] || NEUTRAL_ENV;
  let s = null;
  if (rec.bat && rec.bat.PA >= 30) s = (rec.bat.OPS - env.ops) / 0.1;
  if (rec.pit && rec.pit.outs >= 30) {
    const p = (env.era - rec.pit.ERA) / 1.2;
    s = s === null ? p : Math.max(s, p);
  }
  return s === null ? 0 : s;
}

function lineText(rec) {
  const parts = [];
  if (rec.bat && rec.bat.PA) parts.push(`타율 ${fmtRate(rec.bat.AVG)} ${rec.bat.HR}홈런 OPS ${fmtRate(rec.bat.OPS)}`);
  if (rec.pit && rec.pit.outs) parts.push(`${fmtInnings(rec.pit.outs)}이닝 평균자책 ${rec.pit.ERA.toFixed(2)}`);
  return parts.join(" / ");
}

// ---------------------------------------------
// 1. 2군 강등 (전반기 끝)
// ---------------------------------------------
function demotionCheck(player, ctx) {
  const lg = player.league;
  const down = DOWN_LEVEL[lg];
  if (!down || ctx.down || (ctx.inj && ctx.inj.left > 0)) return false;
  const r = ctx.report;
  const env = LEAGUE_ENV[lg];
  const b = r.bat;
  const p = r.pit;
  const bench = b && !String(b.role).startsWith("주전");
  let bad = 0;
  if (b && b.PA >= (bench ? 40 : 80)) bad = Math.max(bad, (env.ops - (bench ? 0.06 : 0.1) - b.OPS) / 0.06);
  if (p && p.outs >= 45) bad = Math.max(bad, (p.ERA - env.era - 1.4) / 0.8);
  if (bad <= 0) return false;
  let chance = clamp(0.35 + bad * 0.25, 0, 0.85);
  if (isFranchiseHere(player)) chance *= 0.3;
  const c = player.contract;
  if (c && c.isFA && c.total >= 300000 * priceIndex(player)) chance *= 0.4; // 비싼 선수는 잘 안 내림
  if ((player.fame || 0) >= 50) chance *= 0.6;
  if (Math.random() >= chance) return false;
  const m = managerOf(player);
  const who = m.anonymous ? "코칭스태프가" : `${m.name} 감독이`;
  const vet = player.age >= 30 || (c && c.isFA);
  const kboNote =
    lg === "KBO"
      ? ` 엔트리에서 빠지면 열흘 뒤에야 다시 올라올 수 있고, 내려가 있는 날은 1군 등록일수에서 빠져요${c && c.isFA ? "" : ` (FA까지 1군 ${seasonsToFa(player)}시즌)`}.`
      : lg === "MLB"
        ? " 마이너 옵션을 써서 트리플A로 보낸대요."
        : "";
  const options = [
    { id: "accept", label: `받아들이고 ${down.name}에서 다시 시작`, detail: `${down.name}에서 잘 치면 빨리 콜업 · 감독 신뢰 유지` },
    { id: "plead", label: "감독실 찾아가 한 번만 더 기회를 달라", detail: "통하면 1군 잔류, 안 통하면 더 오래 내려감" },
  ];
  if (vet) options.push({ id: "refresh", label: "리프레시 차원으로 열흘만 쉬겠다", detail: "베테랑만 · 열흘 말소 후 바로 복귀 · 컨디션 +1" });
  pushChoice(player, {
    key: "demote",
    mailFrom: "감독실",
    mailSubject: `[엔트리 변경] ${down.name}행 통보`,
    text: `📉 ${who} 불렀어요. "전반기 ${lineText(r) || "기록"}… ${down.name} 내려가서 감 좀 찾고 오자."${kboNote}`,
    options,
  });
  return true;
}

function resolveDemote(player, choice, option) {
  const ctx = player.cur;
  if (!ctx) return [];
  const down = DOWN_LEVEL[player.league];
  const id = option.id;
  player.lastDemote = id;
  if (id === "refresh") {
    ctx.down = { plan: "refresh" };
    return [`${player.name}, 리프레시 차원 엔트리 말소… 열흘 뒤 복귀 예정`];
  }
  if (id === "plead") {
    const view = managerView(player, { id: "stay", side: "any", extra: () => 0 }).reduce((s, x) => s + x.v, 0); // clubhouse.js
    const ok = Math.random() < clamp(0.3 + view * 0.06, 0.1, 0.7);
    if (ok) {
      player.lastDemote = "saved";
      ctx.partMod = (ctx.partMod || 0) + 1; // 감독이 믿어 준 만큼
      return [`${player.name}, 감독실 면담 뒤 1군 잔류… "한 번 더 믿어 보겠다"`];
    }
    ctx.down = { plan: "pleadFail", ...down };
    player.nextMod = (player.nextMod || 0) - 1;
    return [`${player.name}, 감독 면담에도 ${down.name}행… 분위기 싸늘`];
  }
  ctx.down = { plan: "accept", ...down };
  return [`${player.name}, ${down.name}행 통보… "다시 올라오겠다"`];
}

// 후반기 시작 (flow.js beforeHalf): 2군에서 며칠 있었는지 정하고 2군 기록 만듦
function downHalf(player, ctx) {
  const d = ctx.down;
  if (!d) return 0;
  const r = ctx.report;
  if (d.plan === "refresh") {
    ctx.partMod = (ctx.partMod || 0) + 1;
    r.downDays = 10;
    r.events.push("리프레시 말소");
    r.news.push(`${player.name}, 열흘 쉬고 1군 복귀… "몸이 가벼워졌다"`);
    return 10;
  }
  const mod = ctx.mod + (ctx.partMod || 0);
  const first = simAtLevel(player, d.key, d.level, 30, mod); // 내려가서 첫 한 달
  const q = perfScore(first, d.key) + (d.plan === "accept" ? 0.3 : 0);
  let days = q >= 1 ? randomInt(10, 20) : q >= 0 ? randomInt(25, 45) : HALF_DAYS;
  if (d.plan === "pleadFail") days += 10;
  if (days >= HALF_DAYS && ["KBO", "MLB"].includes(player.league) && Math.random() < 0.5) days = SEPT_DAY; // 9월 확대 엔트리
  days = Math.min(days, HALF_DAYS);
  const line = simAtLevel(player, d.key, d.level, days, mod);
  r.minorLine = { name: d.name, league: d.key, up: false, days, ...line };
  r.downDays = days;
  r.events.push(`${d.name} ${days}일`);
  if (days >= HALF_DAYS) {
    r.noPostseason = true;
    r.news.push(`${player.name}, 후반기 내내 ${d.name}에서… ${d.name} ${lineText(line)}`);
  } else {
    r.news.push(`${player.name}, ${days}일 만에 ${d.back}${days === SEPT_DAY ? " (9월 확대 엔트리)" : ""}… ${d.name} ${lineText(line)}`);
    r.toasts.push({ icon: "🔼", text: `${days}일 만에 ${d.back}` });
  }
  return days;
}

// ---------------------------------------------
// 2. 콜업 (퓨처스·마이너 선수, 전반기 끝)
// ---------------------------------------------
function callupTeam(player) {
  if (player.league === "KBO2") return TEAMS.KBO.includes(player.team) ? player.team : null; // 상무·울산은 1군 없음
  if (player.league === "MILB") return player.mlbOrg || null;
  return null;
}

function callupCheck(player, ctx) {
  const up = UP_LEVEL[player.league];
  const team = callupTeam(player);
  if (!up || !team || ctx.up || (ctx.inj && ctx.inj.left > 0)) return false;
  const ovr = getOvrs(player).best;
  const lv = LEAGUES[up.key].level;
  const q = perfScore(ctx.report, player.league);
  let chance = 0;
  if (ovr >= lv - 4) chance = 0.45 + q * 0.1;
  else if (ovr >= lv - 9 && q >= 1) chance = 0.2 + q * 0.12;
  if (Math.random() >= clamp(chance, 0, 0.8)) return false;
  const wait = randomInt(0, 20); // 후반기 며칠 뒤 올라가는지
  ctx.up = { key: up.key, name: up.name, team, wait };
  const r = ctx.report;
  const mlb = up.key === "MLB";
  const first = mlb ? !player.mlbDebutYear : !player.history.some((h) => h.league === "KBO" || (h.minor && h.minor.up));
  if (mlb && first) player.mlbDebutYear = r.year;
  r.news.push(`[콜업] ${player.name}, ${team} ${mlb ? "26인 로스터" : "1군 엔트리"} 등록${first ? "… 데뷔 기회" : ""}`);
  r.bigMoments = r.bigMoments || [];
  r.bigMoments.push({
    tone: "gold",
    kicker: mlb ? "THE SHOW" : "1군 콜업",
    title: mlb ? "⚾ 메이저리그 콜업!" : "📞 1군에서 전화가 왔어요",
    lines: [
      `${team} ${mlb ? "26인 로스터" : "1군 엔트리"} 합류`,
      `${LEAGUES[player.league].name} 전반기 ${lineText(r) || ""}`,
      first ? "생애 첫 1군 무대" : "다시 1군으로",
    ],
  });
  return true;
}

// 후반기 (flow.js beforeHalf): 콜업이면 기다린 날만 원래 리그에서, 나머지는 위에서
function upHalf(player, ctx) {
  const u = ctx.up;
  if (!u) return 0;
  const r = ctx.report;
  const days = HALF_DAYS - u.wait;
  const line = simAtLevel(player, u.key, null, days, ctx.mod + (ctx.partMod || 0));
  r.minorLine = { name: u.name, league: u.key, team: u.team, up: true, days, ...line };
  r.events.push(`${u.name} 콜업 ${days}일`);
  const q = perfScore(line, u.key);
  r.news.push(
    q >= 0.5
      ? `${player.name}, 콜업 뒤 ${lineText(line)}… "이제 내려갈 일 없다"`
      : q >= -0.5
        ? `${player.name}, 1군 적응 중… ${lineText(line)}`
        : `${player.name}, 1군 벽 실감… ${lineText(line)}`,
  );
  return days; // 원래 리그에선 이만큼 빠짐
}

// 시즌 끝: 콜업 가서 버텼으면 다음 시즌은 위에서 (career.js moveCareer, world.js milbTick)
function callupStuck(player, report) {
  const m = report.minorLine;
  if (!m || !m.up) return false;
  const ovr = getOvrs(player).best;
  return perfScore(m, m.league) >= -0.4 && ovr >= LEAGUES[m.league].level - 9;
}

// 퓨처스 선수 콜업 일수 → 1군 등록일수 통장 (rules.js countKboService)
function bankCallupDays(player, report) {
  const days = report.minorLine.days;
  player.kboDaysBank = (player.kboDaysBank || 0) + days;
  report.events.push(`1군 등록 ${days}일`);
  if (player.kboDaysBank >= FA_DAYS) {
    player.kboDaysBank -= FA_DAYS;
    player.kboService = (player.kboService || 0) + 1;
    report.events.push("등록일수 합산 1시즌 인정");
    report.specials.push({ key: "serviceMerge" });
  }
}

// 시즌 결과·진행 화면에 2군/콜업 기록
function minorLineHtml(report) {
  const m = report.minorLine;
  if (!m) return "";
  let html = `<h4>${m.up ? "🔼" : "🔽"} ${m.name} 기록 <small>${m.up ? `${m.team} · ` : ""}${m.days}일${m.up ? "" : " · 통산 1군 기록엔 안 들어감"}</small></h4>`;
  if (m.bat && m.bat.G) html += batRecordHtml(m.bat);
  if (m.pit && m.pit.G) html += pitRecordHtml(m.pit);
  return html;
}

Object.assign(MAIL_SENDERS, {
  demote: { from: "감독실", icon: "📉", subject: "엔트리 변경 통보" },
});

Object.assign(FAN, {
  demoteAccept: ["내려가서 감 찾아와라", "2군 다녀오면 좋아지는 선수 많음", "이 악물고 올라와라", "솔직히 내려갈 만했다"],
  demotePlead: ["감독한테 개기냐 ㅋㅋ", "간절함은 인정", "자존심 상하겠지 근데 성적이 말해줌", "분위기 싸해졌네"],
  demoteSaved: ["감독이 한 번 더 믿어 줬네", "이번에 못하면 진짜 끝이다", "기회 줬으면 보답해라"],
  demoteRefresh: ["베테랑은 쉬어 가야지", "열흘 쉬고 돌아와라", "체력 관리 차원 ㅇㅈ"],
});

function demotePool(player) {
  return { accept: FAN.demoteAccept, plead: FAN.demotePlead, saved: FAN.demoteSaved, refresh: FAN.demoteRefresh }[player.lastDemote];
}

ACHIEVEMENTS.push(
  {
    id: "bounceBack",
    group: "커리어",
    name: "엘리베이터 탈출",
    desc: "2군 다녀온 시즌에 1군 WAR 2 이상",
    check: (p) => p.history.some((h) => h.minor && !h.minor.up && h.WAR >= 2),
  },
  { id: "midCallup", group: "커리어", name: "전화 한 통", desc: "시즌 중 1군 콜업", check: (p) => p.history.some((h) => h.minor && h.minor.up) },
);
