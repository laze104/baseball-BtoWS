// =============================================
// phases.js : 프로 시즌 4구간
// 스프링캠프+연습경기 → 전반기 → (트레이드 마감) → 후반기 → 가을야구·시즌 마무리
// 진행 중인 시즌은 player.cur 에 저장 (startSeason 이 만든 ctx), 단계는 player.phase
// 캠프에서 시즌 목표 3개, 구단 기대치, 데이터팀 예상 성적
// 아마추어·군 복무·독립리그는 예전처럼 한 번에 진행 (runSeason)
// =============================================

const PHASE_LEAGUES = ["KBO", "KBO2", "SANGMU", "NPB", "MLB", "MILB"];
const DEADLINE_LEAGUES = ["KBO", "NPB", "MLB"];

function usesPhases(player) {
  return !!player.cur || (PHASE_LEAGUES.includes(player.league) && !player.retired && !player.banned);
}

// 시즌 버튼 글자
function phaseButtonText(player) {
  if (!usesPhases(player)) return "시즌 진행";
  if (!player.cur) return "🌴 스프링캠프 시작";
  if (player.phase === "camp") return "⚾ 전반기 진행";
  if (player.phase === "half1") return "⚾ 후반기 진행";
  const s = player.cur.report.standing;
  return s && s.seed ? `🍂 ${s.psLabel || "포스트시즌"} 시작` : "🍂 시즌 마무리";
}

// ---------------------------------------------
// 1. 스프링캠프 프로그램
// ---------------------------------------------
const CAMP_PROGRAMS = [
  { id: "pitch", side: "pit", icon: "🎯", label: "새 구종 연마", detail: "투수코치와 새 구종 하나 · 손에 붙으면 무기, 안 붙으면 캠프만 날림" },
  { id: "form", side: "bat", icon: "🔧", label: "타격폼 개조 (장타)", detail: "발사각 높이는 폼 · 성공하면 파워 +3, 적응 실패하면 전반기 고생" },
  { id: "contact", side: "bat", icon: "🪡", label: "정교함 다듬기", detail: "짧게 치는 스윙 · 컨택·선구 +1, 파워가 조금 빠질 수 있음" },
  { id: "battle", side: "any", icon: "🔥", label: "주전 경쟁 올인", detail: "연습경기 많이 나감 · 잘하면 감독 눈도장, 못하면 오히려 밀림" },
  { id: "body", side: "any", icon: "💪", label: "몸 만들기", detail: "웨이트·러닝 위주 · 부상 위험 크게 ↓, 체력 쪽 +1" },
  { id: "weak", side: "any", icon: "📊", label: "약점 보완 (분석실)", detail: "분석실에서 찾은 가장 약한 코스·구종 집중 훈련" },
  { id: "mental", side: "any", icon: "🧘", label: "멘탈 트레이닝", detail: "멘탈 코치와 루틴 만들기 · 멘탈·클러치 +1, 슬럼프 덜 옴" },
];

function campPrograms(player) {
  return CAMP_PROGRAMS.filter((c) => c.side === "any" || (c.side === "pit" ? player.type !== "batter" : player.type !== "pitcher"));
}

function statUp(player, key, d) {
  if (player.stats[key] === undefined) return false;
  player.stats[key] = clamp(player.stats[key] + d, 1, 99);
  return true;
}

// 캠프 프로그램 결과: 능력치 바뀌고 시즌 컨디션·부상·슬럼프 보정
function runCampProgram(player, id) {
  const lv = LEAGUES[player.league].level;
  const s = player.stats;
  const out = { lines: [], campMod: 0, injuryMul: 1, slumpMul: 1, battle: false };
  if (id === "pitch") {
    initArsenal(player);
    const list = player.arsenal || ["포심"];
    const cand = Object.keys(PITCH_KINDS).filter((p) => !list.includes(p));
    const pitch = cand.length ? pick(cand) : null;
    const chance = clamp(0.45 + ((s.breaking || 50) - lv) / 50 + (player.age <= 29 ? 0.1 : -0.05), 0.2, 0.85);
    if (pitch && Math.random() < chance) {
      player.arsenal = [...list, pitch];
      statUp(player, "breaking", 2);
      statUp(player, "stuff", 1);
      player.learnedPitches = (player.learnedPitches || 0) + 1;
      out.lines.push(`🎯 신무기 ${pitch} 완성! 불펜 피칭에서 코치가 "이거 된다"고 했어요 (변화 +2, 구위 +1)`);
      out.pitch = pitch;
    } else {
      statUp(player, "breaking", 1);
      out.campMod -= 1;
      out.lines.push(`🎯 ${pitch || "새 구종"}은 아직 손에 안 붙었어요. 실전에선 봉인 (변화 +1, 전반기 컨디션 -1)`);
    }
  } else if (id === "form") {
    const chance = clamp(0.55 + ((s.contact || 50) - lv) / 60, 0.3, 0.85);
    if (Math.random() < chance) {
      statUp(player, "power", 3);
      statUp(player, "contact", -1);
      out.lines.push("🔧 새 폼이 몸에 붙었어요. 타구가 확실히 떠요 (파워 +3, 컨택 -1)");
    } else {
      statUp(player, "power", 1);
      statUp(player, "contact", -2);
      out.campMod -= 1;
      out.lines.push("🔧 폼이 아직 어색해요. 타이밍이 자꾸 늦어요 (파워 +1, 컨택 -2, 전반기 컨디션 -1)");
    }
  } else if (id === "contact") {
    statUp(player, "contact", 1);
    statUp(player, "eye", 1);
    const lost = Math.random() < 0.5 && statUp(player, "power", -1);
    out.lines.push(`🪡 배트를 짧게 쥐었어요 (컨택 +1, 선구 +1${lost ? ", 파워 -1" : ""})`);
  } else if (id === "battle") {
    out.battle = true;
    out.lines.push("🔥 연습경기마다 선발 출장. 감독이 매일 지켜봐요");
  } else if (id === "body") {
    out.injuryMul = 0.6;
    if (!statUp(player, "stamina", 1)) statUp(player, "speed", 1);
    out.lines.push(`💪 몸무게 관리 성공. 트레이너가 "올해 몸 제일 좋다"고 했어요 (부상 위험 ↓, ${player.stats.stamina !== undefined ? "체력" : "주루"} +1)`);
  } else if (id === "weak") {
    out.lines.push(analysisTrain(player)); // analysis.js
  } else if (id === "mental") {
    if (!statUp(player, "mental", 1)) statUp(player, "clutch", 1);
    if (player.type === "twoway") statUp(player, "clutch", 1);
    out.slumpMul = 0.4;
    out.lines.push("🧘 타석·마운드 들어가기 전 루틴을 만들었어요 (멘탈 +1, 슬럼프 확률 ↓)");
  }
  return out;
}

// 연습경기·시범경기: 기록엔 안 남지만 감독이 봄
function exhibition(player, campMod, battle) {
  const lv = LEAGUES[player.league].level;
  const env = LEAGUE_ENV[player.league];
  const ovrs = getOvrs(player);
  const res = { games: battle ? 16 : 10 };
  let score = 0;
  if (ovrs.bat !== null) {
    const b = simBattingSeason(player.stats, lv, res.games, battle ? 4 : 3, campMod, player.position.split(" 겸 ").pop(), env);
    res.bat = b;
    score += ((b.OPS - (env ? env.ops : 0.72)) / 0.1) * (b.PA >= 25 ? 1 : 0.5);
  }
  if (ovrs.pit !== null) {
    const starter = player.position.startsWith("선발");
    const p = simPitchingSeason(player.stats, lv, starter ? "starter" : "setup", starter ? (battle ? 5 : 3) : battle ? 9 : 6, campMod, env);
    res.pit = p;
    score += ((env ? env.era : 4.4) - p.ERA) / 1.2;
  }
  res.score = clamp(round(score * (battle ? 1.5 : 1), 1), -4, 4);
  return res;
}

function exhibitionLine(ex) {
  const parts = [];
  if (ex.bat) parts.push(`타율 ${fmtRate(ex.bat.AVG)} ${ex.bat.HR}홈런 OPS ${fmtRate(ex.bat.OPS)}`);
  if (ex.pit) parts.push(`${fmtInnings(ex.pit.outs)}이닝 평균자책 ${ex.pit.ERA.toFixed(2)} 탈삼진 ${ex.pit.K}`);
  return `연습경기 ${ex.games}경기 · ${parts.join(" / ")}`;
}

// ---------------------------------------------
// 2. 데이터팀 예상 성적 + 시즌 목표
// ---------------------------------------------
function projection(player) {
  const lv = LEAGUES[player.league].level;
  const env = LEAGUE_ENV[player.league];
  const ovrs = getOvrs(player);
  const out = {};
  if (ovrs.bat !== null) {
    const plan = batterPlan(player, ovrs.bat);
    out.bat = steadyBattingSeason(player.stats, lv, plan.games, plan.pa, 0, player.position.split(" 겸 ").pop(), env);
    out.bat.role = plan.label;
    out.batGames = plan.games;
  }
  if (ovrs.pit !== null) {
    const plan = pitcherPlan(player, ovrs.pit);
    out.pit = steadyPitchingSeason(player.stats, lv, plan.role, plan.games, 0, env);
    out.pit.role = plan.label;
    out.pitRole = plan.role;
  }
  out.WAR = round((out.bat ? out.bat.WAR : 0) + (out.pit ? out.pit.WAR : 0), 1);
  return out;
}

function projectionLine(pj) {
  const parts = [];
  if (pj.bat) parts.push(`타율 ${fmtRate(pj.bat.AVG)} ${pj.bat.HR}홈런 OPS ${fmtRate(pj.bat.OPS)}`);
  if (pj.pit)
    parts.push(
      `${pj.pit.role} ${pj.pit.W}승 ${pj.pit.SV ? `${pj.pit.SV}세이브 ` : ""}${pj.pit.HLD ? `${pj.pit.HLD}홀드 ` : ""}평균자책 ${pj.pit.ERA.toFixed(2)}`,
    );
  return `${parts.join(" / ")} · WAR ${pj.WAR}`;
}

// 목표 값 읽기 (report 기준)
const GOAL_GET = {
  HR: (r) => r.bat && r.bat.HR,
  AVG: (r) => r.bat && r.bat.AB >= 200 && r.bat.AVG,
  OPS: (r) => r.bat && r.bat.PA >= 250 && r.bat.OPS,
  SB: (r) => r.bat && r.bat.SB,
  RBI: (r) => r.bat && r.bat.RBI,
  PA: (r) => r.bat && r.bat.PA,
  W: (r) => r.pit && r.pit.W,
  ERA: (r) => r.pit && r.pit.outs >= 90 && r.pit.ERA,
  K: (r) => r.pit && r.pit.K,
  IP: (r) => r.pit && Math.floor(r.pit.outs / 3),
  SV: (r) => r.pit && r.pit.SV,
  HLD: (r) => r.pit && r.pit.HLD,
  WAR: (r) => r.WAR,
  PS: (r) => (r.standing && r.standing.seed ? 1 : 0),
  STAR: (r) => (r.awards.includes("올스타") ? 1 : 0),
};
const GOAL_FMT = { AVG: fmtRate, OPS: fmtRate, ERA: (v) => v.toFixed(2), WAR: (v) => v.toFixed(1) };

function makeGoal(key, target, low, label, kind) {
  return { key, target, low: !!low, label, kind, reward: kind === "chal" ? 4 : 2 };
}

function goalOptions(player, pj) {
  const list = [];
  const b = pj.bat;
  const p = pj.pit;
  const lg = player.league;
  const games = LEAGUES[lg].games;
  if (b && b.PA >= 150) {
    const hr = Math.max(3, Math.round(b.HR));
    list.push(makeGoal("HR", hr, false, `${hr}홈런`, "real"));
    list.push(makeGoal("HR", Math.round(hr * 1.35 + 3), false, `${Math.round(hr * 1.35 + 3)}홈런`, "chal"));
    const avg = Math.floor(b.AVG * 100) / 100;
    list.push(makeGoal("AVG", avg, false, `타율 ${fmtRate(avg)}`, "real"));
    if (b.AVG >= 0.27) list.push(makeGoal("AVG", 0.3, false, "3할 타율", "chal"));
    const ops = Math.round((b.OPS + 0.08) * 100) / 100;
    list.push(makeGoal("OPS", ops, false, `OPS ${fmtRate(ops)}`, "chal"));
    if (b.SB >= 8) list.push(makeGoal("SB", Math.round(b.SB * 1.3 + 3), false, `${Math.round(b.SB * 1.3 + 3)}도루`, "chal"));
    if (b.RBI >= 50) list.push(makeGoal("RBI", Math.round(b.RBI / 10) * 10 + 10, false, `${Math.round(b.RBI / 10) * 10 + 10}타점`, "chal"));
    if (!String(b.role).startsWith("주전")) list.push(makeGoal("PA", Math.round(games * 3.1), false, `규정타석 (${Math.round(games * 3.1)}타석)`, "chal"));
  }
  if (p && p.outs >= 30) {
    if (pj.pitRole === "starter") {
      list.push(makeGoal("W", Math.max(5, Math.round(p.W)), false, `${Math.max(5, Math.round(p.W))}승`, "real"));
      list.push(makeGoal("W", Math.max(10, Math.round(p.W) + 4), false, `${Math.max(10, Math.round(p.W) + 4)}승`, "chal"));
      list.push(makeGoal("IP", games, false, `규정이닝 (${games}이닝)`, p.outs / 3 >= games * 0.95 ? "real" : "chal"));
      list.push(makeGoal("K", Math.round(p.K / 10) * 10 + 20, false, `${Math.round(p.K / 10) * 10 + 20}탈삼진`, "chal"));
    } else if (p.SV >= 10) {
      list.push(makeGoal("SV", Math.round(p.SV), false, `${Math.round(p.SV)}세이브`, "real"));
      list.push(makeGoal("SV", Math.max(30, Math.round(p.SV) + 8), false, `${Math.max(30, Math.round(p.SV) + 8)}세이브`, "chal"));
    } else {
      list.push(makeGoal("HLD", Math.max(10, Math.round(p.HLD)), false, `${Math.max(10, Math.round(p.HLD))}홀드`, "real"));
      list.push(makeGoal("HLD", Math.max(20, Math.round(p.HLD) + 8), false, `${Math.max(20, Math.round(p.HLD) + 8)}홀드`, "chal"));
    }
    const era = Math.ceil(p.ERA * 10) / 10;
    list.push(makeGoal("ERA", era, true, `평균자책 ${era.toFixed(2)} 이하`, "real"));
    if (p.ERA > 2.2)
      list.push(
        makeGoal(
          "ERA",
          Math.max(1.8, Math.round((p.ERA - 0.8) * 10) / 10),
          true,
          `평균자책 ${Math.max(1.8, Math.round((p.ERA - 0.8) * 10) / 10).toFixed(2)} 이하`,
          "chal",
        ),
      );
  }
  const war = Math.max(1, Math.round(pj.WAR));
  list.push(makeGoal("WAR", war + 2, false, `WAR ${war + 2}`, "chal"));
  if (DEADLINE_LEAGUES.includes(lg)) {
    list.push(makeGoal("STAR", 1, false, "올스타 선정", pj.WAR >= 3.5 ? "real" : "chal"));
    list.push(makeGoal("PS", 1, false, "팀 포스트시즌 진출", "chal"));
  }
  return list;
}

function goalDone(goal, report) {
  const v = GOAL_GET[goal.key](report);
  if (v === null || v === undefined || v === false) return false;
  return goal.low ? v <= goal.target : v >= goal.target;
}

function goalNow(goal, report) {
  const v = GOAL_GET[goal.key](report);
  if (v === null || v === undefined || v === false) return "-";
  return GOAL_FMT[goal.key] ? GOAL_FMT[goal.key](v) : v;
}

// ---------------------------------------------
// 3. 구단 기대치
// ---------------------------------------------
const EXPECTS = {
  title: { label: "우승", desc: "프런트가 대놓고 우승을 말해요" },
  ps: { label: "포스트시즌 진출", desc: "가을야구는 기본이라는 분위기" },
  half: { label: "5할 승률", desc: "중위권 싸움, 5할이 마지노선" },
  rebuild: { label: "리빌딩", desc: "젊은 선수 키우는 해. 꼴찌만 면하면 됨" },
};

function clubExpectation(player) {
  const lg = player.league;
  const teams = TEAMS[lg];
  if (!DEADLINE_LEAGUES.includes(lg) || !teams || !teams.includes(player.team)) return null;
  const last = [...player.history].reverse().find((h) => h.team === player.team && h.league === lg && h.standing && h.standing.teams > 1);
  let pos = last ? (last.standing.rank - 1) / (last.standing.teams - 1) : 0.2 + Math.random() * 0.6; // 0 = 1위, 1 = 꼴찌
  pos = clamp(pos + gauss() * 0.12, 0, 1); // 비시즌 전력 보강·유출
  const id = pos < 0.18 ? "title" : pos < 0.45 ? "ps" : pos < 0.75 ? "half" : "rebuild";
  return { id, team: player.team, ...EXPECTS[id] };
}

function expectMet(ex, report) {
  const s = report.standing;
  if (!s) return true;
  if (ex.id === "title") return report.awards.some((a) => a.includes("시리즈 우승"));
  if (ex.id === "ps") return !!s.seed;
  if (ex.id === "half") return s.w >= s.l;
  return s.rank < s.teams;
}

// 시즌 끝: 기대치 결과 → 감독 거취·팬심 (world.js rotateManagers 가 expectResult 봄)
function judgeExpectation(player, ctx) {
  const ex = ctx.expect;
  const report = ctx.report;
  if (!ex || report.team !== ex.team) return;
  const met = expectMet(ex, report);
  player.expectResult = { team: ex.team, year: report.year, id: ex.id, label: ex.label, met };
  if (met) {
    if (ex.id !== "rebuild") {
      report.news.push(`${ex.team}, 시즌 목표 '${ex.label}' 달성… 프런트 "감독·선수단 모두 수고했다"`);
      changeTeamFans(player, ex.team, 2);
    }
  } else {
    report.news.push(`${ex.team}, '${ex.label}' 목표 실패… ${managerOf(player).anonymous ? "코칭스태프" : managerOf(player).name + " 감독"} 거취에 관심`);
    if (report.WAR < 1 && ex.id !== "rebuild") changeTeamFans(player, ex.team, -2);
  }
}

// ---------------------------------------------
// 4. 단계별 진행
// ---------------------------------------------

// 캠프 화면 열 때 한 번 만듦 (확인 누를 때 같은 목표를 씀)
function campDraft(player) {
  if (player.campDraft && player.campDraft.season === player.season && player.campDraft.team === player.team) return player.campDraft;
  const pj = projection(player);
  player.campDraft = { season: player.season, team: player.team, pj, goals: goalOptions(player, pj), expect: clubExpectation(player) };
  return player.campDraft;
}

function startCamp(player, focusKeys, programId, goalIdx) {
  const draft = campDraft(player);
  const camp = runCampProgram(player, programId);
  const ex = exhibition(player, camp.campMod, camp.battle);
  let campMod = camp.campMod;
  if (ex.score >= 1.5) campMod += 1;
  if (ex.score <= -1.5) campMod -= 1;
  player.campScore = { year: gameYear(player), team: player.team, score: ex.score, line: exhibitionLine(ex), program: programId };
  const ctx = startSeason(player, focusKeys, { campMod, injuryMul: camp.injuryMul, slumpMul: camp.slumpMul, phased: true });
  initGroups(player); // 라커룸 그룹 (clubhouse.js)
  ctx.camp = { program: programId, lines: camp.lines, ex: { games: ex.games, line: exhibitionLine(ex), score: ex.score } };
  ctx.goals = goalIdx.map((i) => draft.goals[i]).filter(Boolean);
  ctx.expect = draft.expect;
  ctx.pj = { line: projectionLine(draft.pj), WAR: draft.pj.WAR };
  ctx.monthsData = [];
  player.cur = ctx;
  player.phase = "camp";
  player.campDraft = null;
  const r = ctx.report;
  r.events.push(`캠프: ${CAMP_PROGRAMS.find((c) => c.id === programId).label}`);
  if (ex.score >= 2) r.news.push(`${player.name}, 시범경기 맹타… "올해 일 낸다" 감독 미소`);
  else if (ex.score <= -2) r.news.push(`${player.name}, 시범경기 부진… 개막 엔트리 경쟁 빨간불`);
  return ctx;
}

function playFirstHalf(player) {
  const ctx = player.cur;
  beforeHalf(player, ctx, 0); // 부상 (flow.js)
  playPart(player, ctx, 0, 0.5);
  const part = ctx.parts[ctx.parts.length - 1];
  afterHalf(player, ctx, 0, part); // 연속 기록
  ctx.half1 = halfStanding(player, ctx.report); // world.js
  monthsFromPart(player, ctx, part, 0);
  checkMonthlyMvp(player, ctx, 0);
  deadlineEvent(player, ctx);
  checkRolePromise(player, ctx); // 계약 때 약속한 역할 (contract.js)
  maybeLockerSide(player, ctx); // 라커룸 그룹 (clubhouse.js)
  halfBreak(player, ctx, 0); // 재활·2군·슬럼프·연장 계약·징크스 (flow.js)
  player.phase = "half1";
  return ctx;
}

function playSecondHalf(player) {
  const ctx = player.cur;
  ctx.partMod = (ctx.partMod || 0) + clamp(Math.round((player.morale || 0) / 5), -1, 1);
  beforeHalf(player, ctx, 1); // 부상·2군·콜업 (flow.js)
  playPart(player, ctx, 0.5, 1);
  const part = ctx.parts[ctx.parts.length - 1];
  afterHalf(player, ctx, 1, part);
  monthsFromPart(player, ctx, part, 1);
  checkMonthlyMvp(player, ctx, 1);
  ctx.report.monthsData = ctx.monthsData;
  teamStanding(player, ctx.report); // 최종 순위 미리 (가을야구 가는지 버튼에 보여줌)
  ctx.standingDone = true;
  halfBreak(player, ctx, 1); // 가을야구 앞두고 부상
  player.phase = "half2";
  return ctx;
}

function finishPhased(player) {
  const ctx = player.cur;
  player.cur = null;
  player.phase = null;
  seasonDays(player, ctx); // 부상·2군 날짜 → 1군 등록일수 (injury.js)
  const report = finishSeason(player, ctx);
  const last = player.history[player.history.length - 1];
  if (last && report.minorLine) last.minor = report.minorLine; // 2군·콜업 기록 (roster.js)
  report.camp = ctx.camp;
  report.goals = (ctx.goals || []).map((g) => ({ ...g, done: goalDone(g, report), now: goalNow(g, report) }));
  report.expect = ctx.expect;
  report.half1 = ctx.half1 && { rank: ctx.half1.rank, teams: ctx.half1.teams, w: ctx.half1.w, l: ctx.half1.l };
  report.monthlyMvp = ctx.monthlyMvp || [];
  rewardGoals(player, report);
  judgeExpectation(player, ctx);
  makeRace(player, report); // charts.js
  return report;
}

function rewardGoals(player, report) {
  if (!report.goals.length) return;
  let fame = 0;
  for (const g of report.goals) if (g.done) fame += g.reward;
  const n = report.goals.filter((g) => g.done).length;
  if (fame) changeFame(player, fame);
  if (n) changeTeamFans(player, report.team, n);
  player.goalsDone = (player.goalsDone || 0) + n;
  if (n === report.goals.length && n >= 3) {
    player.goalsPerfect = (player.goalsPerfect || 0) + 1;
    player.nextMod = (player.nextMod || 0) + 1;
    report.news.push(`${player.name}, 캠프 때 세운 목표 ${n}개 전부 달성… "말한 건 지킨다"`);
  }
  report.toasts = report.toasts || [];
  for (const g of report.goals) report.toasts.push({ icon: g.done ? "🎯" : "➖", text: `시즌 목표 ${g.label} ${g.done ? "달성!" : `실패 (${g.now})`}` });
}

// ---------------------------------------------
// 5. 월별 기록 (전반기 4~6월, 후반기 7~9월)
// ---------------------------------------------
// 합계를 가중치대로 나눔 (합은 그대로)
function splitCount(total, weights) {
  const sum = weights.reduce((s, x) => s + x, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((s, x) => s + x, 0);
  const order = raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0; k++, left--) out[order[k % order.length][1]]++;
  return out;
}

function monthsFromPart(player, ctx, part, half) {
  const all = monthsOf(player.league) || [4, 5, 6, 7, 8, 9];
  const cut = Math.ceil(all.length / 2);
  const months = half === 0 ? all.slice(0, cut) : all.slice(cut);
  const trait = player.hidden && player.hidden.season ? SEASON_TRAITS[player.hidden.season] : null;
  const hot = (m) => trait && (trait.months.includes(m) || (m === 4 && trait.months.includes(3)));
  const w = months.map((m) => clamp(1 + gauss() * 0.12 + (trait ? (hot(m) ? 0.22 : -0.06) : 0), 0.55, 1.6));
  const mean = w.reduce((s, x) => s + x, 0) / w.length;
  const even = months.map(() => 1);
  const b = part.bat;
  const p = part.pit;
  const bPA = b ? splitCount(b.PA, even) : null;
  const bAB = b ? splitCount(b.AB, even) : null;
  const bH = b ? splitCount(b.H, w) : null;
  const bHR = b
    ? splitCount(
        b.HR,
        w.map((x) => x * x),
      )
    : null;
  const pOuts = p ? splitCount(p.outs, even) : null;
  const pER = p
    ? splitCount(
        p.ER || 0,
        w.map((x) => 1 / (x * x)),
      )
    : null;
  const pK = p ? splitCount(p.K, w) : null;
  months.forEach((m, i) => {
    const d = { m, f: w[i] / mean };
    if (b) {
      d.PA = bPA[i];
      d.HR = bHR[i];
      d.AVG = bAB[i] ? bH[i] / bAB[i] : 0;
      d.OPS = b.OPS * (w[i] / mean);
    }
    if (p) {
      d.outs = pOuts[i];
      d.K = pK[i];
      d.ERA = pOuts[i] ? (pER[i] * 27) / pOuts[i] : 0;
    }
    ctx.monthsData.push(d);
  });
}

// 월간 MVP (KBO·NPB) / 이달의 선수 (MLB): 그달 압도적이면 70% 정도 (다른 후보도 있으니)
function checkMonthlyMvp(player, ctx, half) {
  if (!DEADLINE_LEAGUES.includes(player.league)) return;
  const line = AWARD_LINE[player.league];
  const name = player.league === "MLB" ? "이달의 선수" : "월간 MVP";
  ctx.monthlyMvp = ctx.monthlyMvp || [];
  const all = ctx.monthsData;
  const cut = Math.ceil((monthsOf(player.league) || [4, 5, 6, 7, 8, 9]).length / 2);
  const list = half === 0 ? all.slice(0, cut) : all.slice(cut);
  for (const d of list) {
    // 한 달에 리그 전체에서 한 명 (MLB는 리그별 타자·투수 한 명씩) → 압도적이어도 3분의 1 정도
    let chance = 0;
    if (d.PA >= 60 && d.OPS >= line.ops + 0.12) chance = 0.32;
    else if (d.PA >= 60 && d.OPS >= line.ops + 0.03) chance = 0.1;
    if (d.outs >= 75 && d.ERA <= line.era - 1) chance = Math.max(chance, 0.3);
    else if (d.outs >= 60 && d.ERA <= line.era - 0.3) chance = Math.max(chance, 0.08);
    if (player.league === "MLB") chance *= 1.3;
    if (ctx.monthlyMvp.length >= 2) chance *= 0.4;
    if (!chance || Math.random() >= chance) continue;
    ctx.monthlyMvp.push(d.m);
    player.monthlyMvp = (player.monthlyMvp || 0) + 1;
    const stat = d.OPS && d.PA >= 60 ? `OPS ${fmtRate(d.OPS)} ${d.HR}홈런` : `평균자책 ${d.ERA.toFixed(2)} ${d.K}탈삼진`;
    ctx.report.news.push(`${player.name}, ${d.m}월 ${name} 선정… ${stat}`);
    ctx.report.toasts = ctx.report.toasts || [];
    ctx.report.toasts.push({ icon: "🗓️", text: `${d.m}월 ${name}!` });
  }
}

// ---------------------------------------------
// 6. 트레이드 마감일 (전반기 끝)
// ---------------------------------------------
function contractYearsLeft(player) {
  const c = player.contract;
  if (player.league === "KBO") return c && c.isFA ? c.years : seasonsToFa(player);
  return c ? c.years : 1;
}

function deadlineEvent(player, ctx) {
  if (!DEADLINE_LEAGUES.includes(player.league) || !ctx.half1) return;
  const h = ctx.half1;
  const seller = h.rank > h.teams * 0.6;
  const buyer = h.rank <= Math.ceil(h.teams * 0.3);
  const pace = ctx.report.WAR * 2;
  const expiring = contractYearsLeft(player) <= 1;
  const bench = !!(ctx.report.bat && !String(ctx.report.bat.role).includes("주전")) && !ctx.report.pit;
  let chance = 0.08;
  if (seller && expiring && pace >= 2.5)
    chance = 0.55; // 팔 팀의 FA 앞둔 주축 = 1순위 매물
  else if (seller && pace >= 3.5) chance = 0.3;
  else if (bench) chance = 0.22;
  if (isFranchiseHere(player)) chance *= 0.3;
  chance *= fanTradeMul(player);
  if (player.age < 21) chance = 0;
  if (Math.random() >= chance) {
    if (buyer) ctx.report.news.push(`${player.team}, 트레이드 마감 앞두고 우승 청부사 영입… 후반기 대권 도전`);
    return;
  }
  const noTrade = hasClause(player, "noTrade"); // contract.js
  const options = [];
  options.push({ id: "stay", label: "남고 싶다고 공개적으로 말한다", detail: "팀 팬심 ↑ · 트레이드 확률 크게 ↓ (0은 아님)" });
  if (seller) options.push({ id: "contender", label: "우승 노리는 팀으로 보내 달라", detail: "상위권 팀으로 · 원소속 팬심 ↓ · 우승 반지 기회" });
  options.push({ id: "quiet", label: "구단 결정에 맡긴다", detail: "말 없이 훈련만" });
  if (noTrade) options.push({ id: "veto", label: "트레이드 거부권을 쓴다", detail: "계약서 조항 · 무조건 잔류, 구단과 사이 조금 서먹" });
  const who = seller ? "우승을 노리는 팀들" : "몇몇 구단";
  pushChoice(player, {
    key: "deadline",
    mailFrom: player.agent ? `${player.agent.name}` : "구단 운영팀",
    mailSubject: "[트레이드 마감 D-1] 이적설 보도",
    text: `📦 트레이드 마감이 내일이에요. ${player.team}(전반기 ${h.rank}위)이 ${who}과 ${player.name} 카드를 놓고 얘기 중이라는 보도가 나왔어요.${expiring ? " 계약이 곧 끝나는 게 컸대요." : ""} 어떻게 할까요?`,
    seller,
    options,
  });
}

function resolveDeadline(player, choice, option) {
  const ctx = player.cur;
  const report = ctx ? ctx.report : player.lastReport;
  const news = [];
  const odds = { stay: 0.25, contender: 0.85, quiet: 0.6, veto: 0 }[option.id];
  if (option.id === "stay") changeTeamFans(player, player.team, 6);
  if (option.id === "contender") changeTeamFans(player, player.team, -6);
  player.lastDeadline = "stay";
  if (option.id === "veto") {
    player.nextMod = (player.nextMod || 0) - 1;
    news.push(`${player.name}, 트레이드 거부권 행사… "${player.team}에 남겠다"`);
    return news;
  }
  if (Math.random() >= odds) {
    news.push(
      option.id === "stay" ? `${player.name} "여기 남고 싶다"… 트레이드 마감 지나 잔류 확정` : `트레이드 마감 종료… ${player.name}, ${player.team} 잔류`,
    );
    if (ctx && option.id === "stay") ctx.partMod = (ctx.partMod || 0) + 1; // 남아서 더 힘냄
    return news;
  }
  const top = ((ctx && ctx.report.half1Table) || [])
    .filter((t) => t.team !== player.team)
    .sort((a, b) => b.w - a.w)
    .slice(0, 3)
    .map((t) => t.team);
  const to = choice.seller && top.length ? pick(top) : null;
  const from = player.team;
  const res = doTrade(player, report, "mid", to); // extra.js
  player.lastDeadline = "go";
  report.team = res.to;
  report.tradedFrom = from;
  report.events.push("트레이드 마감 이적");
  if (ctx) ctx.partMod = (ctx.partMod || 0) + (option.id === "contender" ? 1 : -1); // 새 팀 적응
  news.push(`[트레이드] ${player.name}, 마감 직전 ${from} → ${res.to}${choice.seller ? "… 우승 경쟁 팀 합류" : ""}`);
  return news;
}

// 진행 중 시즌 화면 (시즌 결과 탭 맨 위)
function phaseProgressHtml(player) {
  const ctx = player.cur;
  if (!ctx) return "";
  const r = ctx.report;
  const stage = { camp: "스프링캠프 끝 · 개막 대기", half1: "전반기 끝 · 올스타 휴식기", half2: "정규시즌 끝" }[player.phase] || "";
  let html = `<div class="phase-box"><h3>${r.year}년 시즌 진행 중 <small>${stage}</small></h3>${phaseStepsHtml(player.phase)}`;
  if (ctx.expect) html += `<p class="expect">🏢 구단 목표: <b>${ctx.expect.label}</b> <small>${ctx.expect.desc}</small></p>`;
  if (ctx.camp) {
    html += `<h4>스프링캠프</h4><ul class="camp-lines">${ctx.camp.lines.map((l) => `<li>${l}</li>`).join("")}<li>⚾ ${ctx.camp.ex.line}</li></ul>`;
    html += `<p class="small">데이터팀 예상: ${ctx.pj.line}</p>`;
  }
  if (ctx.half1) {
    const h = ctx.half1;
    html += `<h4>전반기 <small>${h.group ? h.group + " " : ""}${h.rank}위 / ${h.teams}팀 · ${h.w}승 ${h.l}패</small></h4>`;
  }
  html += injuryStatusHtml(ctx); // injury.js
  if (r.bat && r.bat.G) html += `<h4>내 기록 <small>${r.bat.role}</small></h4>` + batRecordHtml(r.bat);
  if (r.pit && r.pit.G) html += `<h4>내 기록 <small>${r.pit.role}</small></h4>` + pitRecordHtml(r.pit);
  html += minorLineHtml(r); // 2군·콜업 기록 (roster.js)
  if (player.phase === "half2" && r.standing) {
    const s = r.standing;
    html += `<p class="standing">최종 <b>${s.rank}위</b> / ${s.teams}팀 · ${s.w}승 ${s.l}패 ${s.seed ? `<span class="ps">${s.psLabel} 진출</span>` : `<span class="ps out">${s.psLabel || "포스트시즌"} 탈락</span>`}</p>`;
  }
  if (ctx.monthsData && ctx.monthsData.length) html += paceChartHtml(player, ctx); // charts.js
  if (ctx.monthlyMvp && ctx.monthlyMvp.length)
    html += `<p class="chips awards">${ctx.monthlyMvp.map((m) => `<span>🗓️ ${m}월 ${player.league === "MLB" ? "이달의 선수" : "월간 MVP"}</span>`).join("")}</p>`;
  if (ctx.goals && ctx.goals.length) {
    html += `<h4>시즌 목표</h4><ul class="goals">${ctx.goals
      .map(
        (g) =>
          `<li class="${goalDone(g, r) ? "done" : ""}"><b>${g.label}</b><span>지금 ${goalNow(g, r)}</span>${g.kind === "chal" ? "<em>도전</em>" : ""}</li>`,
      )
      .join("")}</ul>`;
  }
  if (r.news.length) html += `<div class="news">${r.news.map((n) => `<p>📰 ${n}</p>`).join("")}</div>`;
  html += `<button onclick="setTab('train')">다음: ${phaseButtonText(player)}</button></div>`;
  return html;
}

function phaseStepsHtml(phase) {
  const steps = ["스프링캠프", "전반기", "후반기", "가을야구"];
  const done = { camp: 1, half1: 2, half2: 3 }[phase] || 0;
  return `<ol class="phase-steps">${steps.map((s, i) => `<li class="${i < done ? "done" : i === done ? "now" : ""}">${s}</li>`).join("")}</ol>`;
}

// 시즌 결과 탭: 끝난 시즌의 캠프·목표 요약
function seasonGoalsHtml(report) {
  if (!report.goals || !report.goals.length) return "";
  let html = `<h4>시즌 목표 <small>${report.goals.filter((g) => g.done).length}/${report.goals.length} 달성</small></h4><ul class="goals">`;
  html += report.goals.map((g) => `<li class="${g.done ? "done" : "fail"}"><b>${g.label}</b><span>${g.done ? "달성" : "실패"} (${g.now})</span></li>`).join("");
  html += "</ul>";
  if (report.expect) {
    const met = expectMet(report.expect, report);
    html += `<p class="expect">🏢 구단 목표 '${report.expect.label}' ${met ? "✅ 달성" : "❌ 실패"}</p>`;
  }
  return html;
}

ACHIEVEMENTS.push(
  { id: "goals3", group: "커리어", name: "말한 건 지킨다", desc: "캠프 때 세운 시즌 목표 3개 전부 달성", check: (p) => (p.goalsPerfect || 0) >= 1 },
  { id: "monthlyMvp", group: "수상", name: "이달의 주인공", desc: "월간 MVP (MLB는 이달의 선수)", check: (p) => (p.monthlyMvp || 0) >= 1 },
  { id: "monthlyMvp5", group: "수상", name: "달력 수집가", desc: "월간 MVP 5번", check: (p) => (p.monthlyMvp || 0) >= 5 },
);

Object.assign(FAN, {
  deadlineStay: ["남는다 ㅠㅠ 이게 프랜차이즈지", "의리 미쳤다", "구단은 이 선수 놓치지 마라", "연장계약 가자 제발"],
  deadlineGo: ["결국 가네… 잘 가라", "우승 반지 끼고 와라", "구단 일 좀 해라 이걸 보내냐", "후반기 상대팀으로 만나겠네"],
});
