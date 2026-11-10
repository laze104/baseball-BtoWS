// =============================================
// era.js : 시대 변화 + 신생구단
// 1. 10년마다(연도 끝자리 9 시즌 끝) 70% 확률로 KBO 리그 환경이 바뀜
//    탱탱볼 / 저반발 / ABS 존 조정 / 피치클록 강화 / 외국인 쿼터 확대 / 원상 복구
// 2. KBO 2팀, NPB 2팀까지 순서대로 창단 (해마다 작은 확률, 안 생길 수도 있음)
//    신생구단은 팬덤 1, 처음 3시즌은 약함. KBO 창단 땐 특별지명으로 내가 옮겨 갈 수도
// 상태는 player.world 에 저장하고, 불러올 때 applyWorldState 로 다시 적용
// =============================================

// 바뀌기 전 원본 (불러올 때마다 여기서 다시 시작)
const ERA_BASE_ENV = JSON.parse(JSON.stringify(LEAGUE_ENV));
const BASE_TEAM_LISTS = { KBO: [...TEAMS.KBO], KBO2: [...TEAMS.KBO2], NPB: [...TEAMS.NPB] };
const BASE_GROUP_TEAMS = { KBO2: LEAGUE_GROUPS.KBO2.map((g) => [...g.teams]), NPB: LEAGUE_GROUPS.NPB.map((g) => [...g.teams]) };

// hit·hr·k·bb 는 곱하기, ops·era 는 더하기 (WAR 기준선이 같이 움직여야 해서 시뮬로 맞춤)
const ERAS = {
  bouncy: { name: "탱탱볼 시대", icon: "🎾", desc: "공인구 반발계수 상향", env: { hr: 1.28, hit: 1.03, ops: 0.04, era: 0.75 } },
  deadball: { name: "저반발 시대", icon: "🪨", desc: "공인구 반발계수 하향", env: { hr: 0.76, hit: 0.98, ops: -0.035, era: -0.44 } },
  abs: { name: "ABS 존 조정", icon: "🤖", desc: "자동 볼 판정 존 넓힘", env: { k: 1.07, bb: 0.9, ops: -0.015, era: -0.15 } },
  clock: { name: "피치클록 강화", icon: "⏱️", desc: "투구 간격 단축", env: { hit: 1.02, bb: 1.04, ops: 0.009, era: 0.3 } },
  foreign: { name: "외국인 쿼터 확대", icon: "🌏", desc: "외국인 선수 4명 등록", env: { k: 1.04, hit: 0.99, ops: -0.016, era: -0.11 } },
  normal: { name: "원상 복구", icon: "⚖️", desc: "규정 원래대로", env: {} },
};
const ERA_LEAGUES = ["KBO", "KBO2", "SANGMU"];

const EXPANSION_POOL = {
  KBO: ["울산 돌핀스", "전주 비전스", "청주 블레이즈", "제주 오션스", "포항 스틸웨이브"],
  NPB: ["시즈오카 샤크스", "오키나와 블루윙스", "마쓰야마 오렌지스", "가고시마 볼케이노스"],
};

function initWorldState(player) {
  if (!player.world) player.world = { eras: [], expansions: [] };
}

// 원본으로 되돌리고 저장된 상태 다시 적용 (initCareer 에서 부름)
function applyWorldState(player) {
  initWorldState(player);
  for (const lg of Object.keys(ERA_BASE_ENV)) Object.assign(LEAGUE_ENV[lg], ERA_BASE_ENV[lg]);
  for (const lg of Object.keys(BASE_TEAM_LISTS)) TEAMS[lg].splice(0, TEAMS[lg].length, ...BASE_TEAM_LISTS[lg]);
  for (const lg of Object.keys(BASE_GROUP_TEAMS)) LEAGUE_GROUPS[lg].forEach((g, i) => g.teams.splice(0, g.teams.length, ...BASE_GROUP_TEAMS[lg][i]));
  for (const e of player.world.expansions) addTeamToWorld(e);
  const cur = currentEra(player);
  if (cur) applyEraEnv(cur.id);
}

function currentEra(player) {
  const list = (player.world && player.world.eras) || [];
  return list.length ? [...list].sort((a, b) => a.year - b.year)[list.length - 1] : null;
}

function applyEraEnv(id) {
  const mod = ERAS[id].env;
  for (const lg of ERA_LEAGUES) {
    const base = ERA_BASE_ENV[lg];
    const env = LEAGUE_ENV[lg];
    for (const k of ["hit", "hr", "k", "bb"]) env[k] = base[k] * (mod[k] || 1);
    env.ops = base.ops + (mod.ops || 0);
    env.era = base.era + (mod.era || 0);
  }
}

function addTeamToWorld(e) {
  if (!TEAMS[e.lg].includes(e.team)) TEAMS[e.lg].push(e.team);
  TEAM_FANDOM[e.team] = 1; // 신생구단은 팬이 적음
  if (e.lg === "KBO") {
    const g = LEAGUE_GROUPS.KBO2[e.group || 0];
    if (!g.teams.includes(e.team)) g.teams.push(e.team);
    if (!TEAMS.KBO2.includes(e.team)) TEAMS.KBO2.push(e.team);
  } else {
    const g = LEAGUE_GROUPS.NPB[e.group || 0];
    if (!g.teams.includes(e.team)) g.teams.push(e.team);
  }
}

// 신생구단은 처음 3시즌 승률 -4%p
function expansionPenalty(player, team, year) {
  const e = player.world && player.world.expansions.find((x) => x.team === team);
  return e && year - e.year <= 3 ? -0.04 : 0;
}

// ---------------------------------------------
// 시즌 끝마다
// ---------------------------------------------
function eraSeason(player, report) {
  initWorldState(player);
  const w = player.world;
  report.bigMoments = report.bigMoments || [];
  // 1. 시대 변화
  if (report.year % 10 === 9 && !w.eras.some((e) => e.year === report.year + 1) && Math.random() < 0.7) {
    const cur = currentEra(player);
    const ids = Object.keys(ERAS).filter((id) => id !== (cur ? cur.id : "normal"));
    const id = pick(ids);
    const era = ERAS[id];
    w.eras.push({ id, year: report.year + 1 });
    applyEraEnv(id);
    report.news.push(`KBO, ${report.year + 1}시즌부터 ${era.desc}… '${era.name}' 열린다`);
    report.bigMoments.push({
      tone: "good",
      kicker: `${report.year + 1}시즌부터`,
      title: `${era.icon} ${era.name}`,
      lines: [`KBO가 ${era.desc}을(를) 결정했어요.`, eraHint(id)],
    });
    if (typeof addReaction === "function") addReaction(player, report, [], FAN[`era_${id}`] || FAN.eraChange, { team: player.team });
  } else if (currentEra(player) && currentEra(player).id === "bouncy" && report.league === "KBO" && Math.random() < 0.35) {
    // 탱탱볼 논란은 계속됨
    report.comments = report.comments || [];
    for (const t of pickMany(FAN.era_bouncy, 2)) report.comments.push(makeComment(t, player, { team: player.team }, "normal"));
  }
  // 2. 창단
  for (const lg of ["KBO", "NPB"]) {
    const done = w.expansions.filter((e) => e.lg === lg);
    if (done.length >= 2) continue;
    const last = done.length ? done[done.length - 1].year : START_YEAR + 3;
    if (report.year - last < 4) continue; // 순서대로, 간격 4년 이상
    if (Math.random() >= (lg === "KBO" ? 0.025 : 0.02)) continue;
    const team = pick(EXPANSION_POOL[lg].filter((t) => !w.expansions.some((e) => e.team === t)));
    const groups = lg === "KBO" ? LEAGUE_GROUPS.KBO2 : LEAGUE_GROUPS.NPB;
    const group = groups.reduce((bi, g, i) => (g.teams.length < groups[bi].teams.length ? i : bi), 0);
    const e = { lg, team, year: report.year + 1, group };
    w.expansions.push(e);
    addTeamToWorld(e);
    if (lg === "KBO" && player.managers) {
      player.managers[team] = { name: fakeName("KBO"), style: "youth", note: "창단 감독", since: report.year + 1 };
    }
    report.news.push(`[창단] ${LEAGUES[lg].name} ${done.length + 9 + (lg === "KBO" ? 2 : 4)}번째 구단 ${team} 공식 창단… ${report.year + 1}시즌 합류`);
    report.bigMoments.push({
      tone: "good",
      kicker: `${LEAGUES[lg].name} 신생구단`,
      title: `🏟️ ${team} 창단`,
      lines: [`${report.year + 1}시즌부터 리그 합류`, "아직 팬이 적고 처음 몇 시즌은 전력이 약해요"],
    });
    if (lg === "KBO") maybeExpansionDraft(player, team, report);
  }
}

function eraHint(id) {
  return {
    bouncy: "홈런이 쏟아지고 투수들은 울상. 기록 인플레 논란도 따라와요.",
    deadball: "홈런이 줄고 투고타저. 타자 기록 쌓기는 힘들어져요.",
    abs: "볼넷이 줄고 삼진이 늘어요. 제구 좋은 투수가 유리해요.",
    clock: "투수가 숨 돌릴 틈이 없어서 타자가 조금 유리해져요.",
    foreign: "외국인 에이스가 늘어서 국내 타자들이 고전해요.",
    normal: "몇 년 만에 원래 규정으로 돌아가요.",
  }[id];
}

// 특별지명: KBO에서 뛰는데 프랜차이즈 스타·간판이 아니면 40%
function maybeExpansionDraft(player, team, report) {
  if (player.league !== "KBO" || player.retired || isFranchiseHere(player) || player.age < 22) return;
  if (getOvrs(player).best >= LEAGUES.KBO.level + 10 || Math.random() >= 0.4) return;
  pushChoice(player, {
    key: "expansionDraft",
    team,
    text: `🏟️ 신생구단 <b>${team}</b> 특별지명 명단에 이름이 올랐어요. ${player.team} 보호선수 명단에서 빠졌대요.<br>"창단 멤버로 와 주면 주전 기회는 확실히 드립니다."`,
    options: [
      { id: "go", label: "창단 멤버로 새 출발", detail: `${team} 이적 · 주전 기회 · 팬덤은 작음` },
      { id: "stay", label: "남게 해 달라고 구단에 요청", detail: "50% 확률로 트레이드 형식으로 잔류 · 실패하면 그냥 이적" },
    ],
  });
}

function resolveExpansionDraft(player, choice, option) {
  const from = player.team;
  if (option.id === "stay" && Math.random() < 0.5) {
    return [`${player.name}, ${from} 잔류… 구단이 현금 트레이드로 다시 데려왔다`];
  }
  player.team = choice.team;
  if (player.contract) player.contract.team = choice.team;
  player.foundingMember = choice.team;
  player.starterPromise = true;
  player.restPlan = null;
  changeFame(player, option.id === "go" ? 3 : 0);
  return [`[특별지명] ${player.name}, 신생구단 ${choice.team} 창단 멤버로… "${option.id === "go" ? "새 역사 같이 쓰겠다" : "아쉽지만 받아들이겠다"}"`];
}

// 연감: 시대 연표
function eraTimelineHtml(player) {
  const w = player.world;
  if (!w || (!w.eras.length && !w.expansions.length)) return "";
  const rows = [
    ...w.eras.map((e) => ({ year: e.year, text: `${ERAS[e.id].icon} ${ERAS[e.id].name} <small>${ERAS[e.id].desc}</small>` })),
    ...w.expansions.map((e) => ({ year: e.year, text: `🏟️ ${e.team} 창단 <small>${LEAGUES[e.lg].name}</small>` })),
  ].sort((a, b) => a.year - b.year);
  return `<h4>🕰️ 시대 연표</h4><ul class="era-line">${rows.map((r) => `<li><b>${r.year}</b> ${r.text}</li>`).join("")}</ul>`;
}
