// =============================================
// clubhouse.js : 라커룸 그룹 + 감독이 종합적으로 보는 점수
// - 그룹 3개: 베테랑파 / 젊은 피 / 외국인 선수 (해외 리그면 내가 외국인 쪽)
// - 그룹마다 나를 보는 시선 0~100, 평균이 '라커룸 입지'
// - 전반기 끝에 그룹끼리 부딪히는 일 (lockerSide 선택지)
// - 입지 높으면 주장 투표, 사기 ↑ / 한 그룹이라도 등 돌리면 사기 ↓
// - managerView: 감독이 면담 때 보는 것 전부 (실력·성적·캠프·라커룸·팬·신뢰·팀 사정)
// =============================================

const GROUP_NAMES = {
  KBO: { vet: "베테랑파", young: "젊은 피", foreign: "외국인 선수들" },
  NPB: { vet: "베테랑 그룹", young: "젊은 선수들", foreign: "외국인 선수 모임" },
  MLB: { vet: "클럽하우스 리더들", young: "유망주 그룹", foreign: "아시아·라틴 선수 모임" },
};

function groupNames(player) {
  if (player.league === "NPB") return GROUP_NAMES.NPB;
  if (player.league === "MLB" || player.league === "MILB") return GROUP_NAMES.MLB;
  return GROUP_NAMES.KBO;
}

const abroad = (player) => ["NPB", "MLB", "MILB"].includes(player.league);

// 팀 바뀌면 새로 (locker.js lockerSetup 이랑 같은 때)
function initGroups(player) {
  if (isAmateur(player.league) || player.league === "SOCIAL") return null;
  const g = player.groups;
  if (g && g.team === player.team) return g;
  const foreignLeader = fakeName("MLB"); // 외국인 그룹 리더는 영어 이름
  player.groups = {
    team: player.team,
    vet: 40 + (player.age >= 30 ? 12 : 0) + (isFranchiseHere(player) ? 15 : 0),
    young: 40 + (player.age <= 26 ? 12 : player.age >= 34 ? -6 : 0),
    foreign: abroad(player) ? 55 : 35 + (player.history.some((h) => ["NPB", "MLB", "MILB"].includes(h.league)) ? 15 : 0),
    leaders: {
      vet: (mateOf(player, "mentor") || {}).name || fakeName(player.league === "KBO2" ? "KBO" : player.league),
      young: (mateOf(player, "mentee") || mateOf(player, "friend") || {}).name || fakeName(player.league === "KBO2" ? "KBO" : player.league),
      foreign: foreignLeader,
    },
    year: gameYear(player),
  };
  return player.groups;
}

function groupUp(player, id, d) {
  const g = player.groups;
  if (g) g[id] = clamp(Math.round(g[id] + d), 0, 100);
}

// 라커룸 입지 0~100 (그룹 평균 + 주장·연차)
function lockerStanding(player) {
  const g = player.groups;
  if (!g || g.team !== player.team) return 50;
  let s = (g.vet + g.young + g.foreign * 0.6) / 2.6;
  if (player.captainTeam === player.team) s += 8;
  s += clamp(teamTenure(player, player.team).seasons * 2, 0, 10);
  return clamp(Math.round(s), 0, 100);
}

function standingLabel(v) {
  if (v >= 75) return "라커룸의 중심";
  if (v >= 60) return "다들 인정함";
  if (v >= 40) return "자리 잡는 중";
  if (v >= 25) return "아직 겉돎";
  return "고립됨";
}

// 시즌 끝: 성적·나이 따라 시선이 바뀌고 사기에 반영 (afterSeason)
function groupSeason(player, report) {
  const g = initGroups(player);
  if (!g || report.team !== player.team) return;
  if (report.WAR >= 4) {
    groupUp(player, "vet", 4);
    groupUp(player, "young", 6);
  } else if (report.WAR < 0.5) groupUp(player, "vet", -3);
  if (player.age >= 31) groupUp(player, "young", player.coachRep ? 3 : -2); // 후배 챙기면 젊은 피가 따름
  for (const k of ["vet", "young", "foreign"]) g[k] = Math.round(g[k] * 0.9 + 50 * 0.1); // 시간 지나면 보통으로
  const low = ["vet", "young", "foreign"].filter((k) => g[k] < 20);
  if (low.length) {
    moraleUp(player, -1);
    report.news.push(`${report.team} 라커룸 미묘한 기류… ${player.name}, ${low.map((k) => groupNames(player)[k]).join("·")}과 거리감`);
  } else if (g.vet >= 60 && g.young >= 60) moraleUp(player, 1);
  // 주장 투표: 입지 높고 고참이면 선수단이 뽑아 줌
  const st = lockerStanding(player);
  if (st >= 72 && player.age >= 29 && player.captainTeam !== player.team && teamTenure(player, player.team).seasons >= 2 && Math.random() < 0.6) {
    player.captainTeam = player.team;
    changeFame(player, 3);
    report.news.push(`${report.team} 선수단 투표로 ${player.name} 새 주장 선임… "라커룸이 먼저 원했다"`);
    report.toasts = report.toasts || [];
    report.toasts.push({ icon: "©️", text: "선수단 투표로 주장 선임!" });
  }
}

// ---------------------------------------------
// 전반기 끝: 그룹끼리 부딪히는 일 (phases.js playFirstHalf)
// a / b 편 들기, 또는 중재 (입지 50 넘어야 먹힘)
// ---------------------------------------------
const SIDE_EVENTS = [
  {
    id: "dinner",
    a: "vet",
    b: "young",
    text: (n, L) =>
      `👕 원정 숙소. ${n.vet} 쪽 ${L.vet} 선배가 "오늘 다 같이 밥 먹자"고 했는데, ${n.young}은 이미 자기들끼리 게임 내기를 잡아 놨대요. 어디로 갈까요?`,
    la: "선배들 밥자리로",
    lb: "후배들 게임 내기로",
  },
  {
    id: "zone",
    a: "foreign",
    b: "vet",
    text: (n, L, p) =>
      `👕 외국인 ${p.type === "pitcher" ? "타자" : "투수"} ${L.foreign}${josaOf(L.foreign, "이")} 스트라이크존 판정에 폭발해서 라커룸 물건을 걷어찼어요. 고참들은 "팀 분위기 흐린다"고 수군대요.`,
    la: "외국인 동료 따로 불러서 들어 준다",
    lb: "고참들 편에서 한마디 한다",
  },
  {
    id: "rule",
    a: "young",
    b: "vet",
    text: (n, L) => `👕 ${n.young}이 단체 카톡방에 "고참 심부름 문화 좀 없애 달라"고 올렸어요. 누가 총대 메 줬으면 하는 분위기예요.`,
    la: "후배들 대신 코칭스태프에 말한다",
    lb: '"그것도 다 배우는 거다" 넘긴다',
  },
  {
    id: "video",
    a: "young",
    b: "vet",
    text: (n, L) => `👕 구단 유튜브 팀이 '라커룸 몰래카메라' 찍자고 해요. ${n.young}은 신났고, ${L.vet} 선배는 "야구장에서 무슨 예능이냐"며 싫은 티를 내요.`,
    la: "몰카 주인공 맡는다",
    lb: "선배 말대로 빠진다",
  },
  {
    id: "birthday",
    a: "foreign",
    b: "vet",
    text: (n, L) => `👕 ${L.foreign} 생일인데 고향 음식 파티를 연대요. 하필 같은 날 ${L.vet} 선배가 고참 회식을 잡았어요.`,
    la: "생일 파티 간다",
    lb: "고참 회식 간다",
  },
  {
    id: "slump",
    a: "vet",
    b: "young",
    text: (n, L) => `👕 팀이 6연패. ${L.vet} 선배가 "어린 애들이 집중을 안 한다"고 미팅에서 말했고, ${n.young}은 잔뜩 위축됐어요.`,
    la: "선배 말에 힘 실어 준다",
    lb: "후배들 따로 챙긴다",
  },
];

function maybeLockerSide(player, ctx) {
  const g = initGroups(player);
  if (!g || !DEADLINE_LEAGUES.concat(["KBO2", "MILB"]).includes(player.league) || Math.random() >= 0.35) return;
  if ([player.pendingChoice, ...player.choiceQueue].filter(Boolean).length >= 3) return;
  const names = groupNames(player);
  const ev = pick(SIDE_EVENTS);
  pushChoice(player, {
    key: "lockerSide",
    ev: ev.id,
    a: ev.a,
    b: ev.b,
    mailFrom: "라커룸",
    mailSubject: "올스타 휴식기, 라커룸 분위기가 좀…",
    text: ev.text(names, g.leaders, player),
    options: [
      { id: "a", label: ev.la, detail: `${names[ev.a]} ↑ · ${names[ev.b]} ↓` },
      { id: "b", label: ev.lb, detail: `${names[ev.b]} ↑ · ${names[ev.a]} ↓` },
      { id: "mid", label: "양쪽 다 챙겨 본다 (중재)", detail: `라커룸 입지 ${lockerStanding(player)} · 50 넘으면 둘 다 ↑, 아니면 둘 다 ↓` },
    ],
  });
}

function resolveLockerSide(player, choice, option) {
  const names = groupNames(player);
  const news = [];
  const ctx = player.cur;
  if (option.id === "mid") {
    const ok = lockerStanding(player) >= 50 || Math.random() < 0.25;
    groupUp(player, choice.a, ok ? 5 : -4);
    groupUp(player, choice.b, ok ? 5 : -4);
    if (ok) {
      moraleUp(player, 1);
      news.push(`${player.team} 라커룸, ${player.name}${josaOf(player.name, "이")} 나서서 정리… "형이 말하니까 다 듣더라"`);
    } else news.push(`${player.name}, 양쪽 다 챙기려다 이도 저도 아닌 상황`);
    return news;
  }
  const win = option.id === "a" ? choice.a : choice.b;
  const lose = option.id === "a" ? choice.b : choice.a;
  groupUp(player, win, 12);
  groupUp(player, lose, -8);
  if (win === "young" && choice.ev === "video") changeFame(player, 3);
  if (ctx && player.groups[lose] < 20) ctx.partMod = (ctx.partMod || 0) - 1; // 한쪽이 완전히 등 돌리면 후반기 영향
  news.push(`${player.name}, ${names[win]} 쪽에 섰다… ${names[lose]}은 서운한 눈치`);
  return news;
}

// 동료 탭에 붙는 그룹 표시 (locker.js showLocker 끝)
function groupsHtml(player) {
  const g = initGroups(player);
  if (!g || g.team !== player.team) return "";
  const names = groupNames(player);
  const st = lockerStanding(player);
  let html = `<h4>라커룸 그룹 <small>입지 ${st} · ${standingLabel(st)}</small></h4><ul class="groups">`;
  for (const k of ["vet", "young", "foreign"]) {
    html += `<li><span>${names[k]}</span><small>${g.leaders[k]}</small><span class="bar" style="--v:${g[k]}"></span><b>${g[k]}</b></li>`;
  }
  return html + `</ul><p class="small">라커룸 입지는 감독 면담과 주장 투표에 들어가요. 한 그룹이라도 20 밑으로 떨어지면 사기가 떨어져요.</p>`;
}

// ---------------------------------------------
// 감독이 보는 것 (world.js managerScore 가 이걸 합침)
// 면담 결과 화면에 "감독이 본 것"으로 보여줌
// ---------------------------------------------
function managerView(player, wish) {
  const lv = LEAGUES[player.league].level;
  const ovrs = getOvrs(player);
  const ovr = wish.side === "pit" ? ovrs.pit : wish.side === "bat" ? ovrs.bat : ovrs.best;
  const m = managerOf(player);
  const style = m.style;
  const items = [];
  const add = (label, v) => {
    if (Math.abs(v) >= 0.05) items.push({ label, v: round(v, 1) });
  };
  add("실력", (ovr || 0) - lv);
  add("최근 성적", clamp(recentWar(player) - 2, -3, 3) * (style === "results" ? 1.5 : 1));
  const cs = player.campScore;
  if (cs && cs.team === player.team && cs.year >= gameYear(player) - 1) add("지난 캠프·연습경기", cs.score * 0.5);
  add("라커룸 입지", (lockerStanding(player) - 50) / 20);
  add("팬심", fanManagerBonus(player));
  if (player.trustTeam === player.team && player.managerTrust) add("감독 신뢰", player.managerTrust);
  if (isFranchiseHere(player)) add("프랜차이즈", 2);
  add("인기", clamp((player.fame || 0) / 30, -1, 1.5));
  // 팀 사정: 경쟁자 컨디션, 구단 기대치(우승이면 베테랑, 리빌딩이면 젊은 선수)
  const r = mateOf(player, "rival");
  if (r && (wish.id === "regular" || wish.id === "starter" || wish.id === "closer") && r.ovr > (ovr || 0) + 1) add(`경쟁자 ${r.name}`, -1.5);
  const ex = player.expectResult;
  if (ex && ex.team === player.team) {
    if (ex.id === "rebuild") add("리빌딩 기조", player.age <= 25 ? 1.5 : player.age >= 31 ? -1.5 : 0);
    if (ex.id === "title" || ex.id === "ps") add("윈나우 기조", player.age >= 29 ? 1 : -0.5);
    if (!ex.met) add("작년 목표 실패 (감독도 급함)", -0.5);
  }
  // 감독 스타일
  let st = 0;
  if (style === "trust" && (wish.id === "regular" || wish.id === "pinch")) st += 2;
  if (style === "run" && wish.id === "leadoff") st += 2;
  if (style === "pitch" && wish.side === "pit") st += 1.5;
  if (style === "results") st -= 1;
  if (style === "defense" && player.stats.defense !== undefined && wish.side === "bat") st += (player.stats.defense - lv) / 5;
  if (style === "youth") st += player.age <= 24 ? 2 : player.age >= 32 ? -1 : 0;
  if (style === "training") st -= 1;
  if (style === "freedom") st += player.age >= 30 ? 2 : 0;
  add("감독 스타일", st);
  add("요청 맞춤 능력치", wish.extra(player));
  return items;
}

function managerViewHtml(items) {
  const top = [...items].sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 6);
  return `<ul class="mview">${top.map((x) => `<li class="${x.v > 0 ? "plus" : "minus"}"><span>${x.label}</span><b>${x.v > 0 ? "+" : ""}${x.v}</b></li>`).join("")}</ul>`;
}

Object.assign(FAN, {
  lockerSide: ["라커룸 썰 풀렸네 ㅋㅋ", "팀 분위기 좋아야 이긴다", "누구 편 들었는지 다 보인다", "이런 거 잘하는 선수가 주장감"],
});
