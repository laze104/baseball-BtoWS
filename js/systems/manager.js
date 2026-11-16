// =============================================
// manager.js : 감독 면담과 감독 교체
// 감독 이름·스타일 데이터는 data/managers.js
// =============================================

// ---------------------------------------------
// 1. 감독 면담: 비시즌마다 1번, 원하는 역할을 말해볼 수 있음
// ---------------------------------------------

// 감독은 실력(OVR), 최근 성적, 팀 내 입지(프랜차이즈·인기)를 보고 판단함
// 결과: 수락 / 캠프 경쟁 후 결정 / 거절 (확정은 아님)
const MEETING_WISHES = [
  // side: 투수(pit)·타자(bat) / need: 감독이 OK하려면 필요한 점수 / ok: 요청할 수 있는 상황
  {
    id: "starter",
    short: "선발 전환",
    side: "pit",
    label: "선발로 뛰고 싶어요",
    need: 1,
    extra: (p) => (p.stats.stamina - LEAGUES[p.league].level) / 4,
    ok: (p) => p.position === "불펜",
    hint: "체력이 중요해요",
  },
  {
    id: "bullpen",
    short: "불펜 전환",
    side: "pit",
    label: "불펜으로 가고 싶어요",
    need: -6,
    extra: () => 0,
    ok: (p) => p.position === "선발",
    hint: "대부분 받아줘요",
  },
  {
    id: "closer",
    short: "마무리",
    side: "pit",
    label: "마무리를 맡고 싶어요",
    need: 4,
    extra: (p) => (p.stats.mental - LEAGUES[p.league].level) / 4,
    ok: (p) => p.position.startsWith("불펜") && p.role !== "closer",
    hint: "멘탈·구위가 중요해요",
  },
  {
    id: "regular",
    short: "주전 보장",
    side: "bat",
    label: "주전으로 써 주세요",
    need: -1,
    extra: () => 0,
    ok: (p) => !p.starterPromise,
    hint: "실력이 리그 수준 근처면 가능",
  },
  {
    id: "leadoff",
    short: "1번 타자",
    side: "bat",
    label: "1번 타자를 하고 싶어요",
    need: 1,
    extra: (p) => ((p.stats.speed + p.stats.eye) / 2 - LEAGUES[p.league].level) / 4,
    ok: (p) => p.lineup !== "leadoff",
    hint: "주루·선구가 중요해요 (타석 +)",
  },
  {
    id: "pinch",
    short: "대타 요원",
    side: "bat",
    label: "대타로라도 써 주세요",
    need: -9,
    extra: (p) => (p.stats.clutch - LEAGUES[p.league].level) / 4,
    ok: (p) => p.lineup !== "pinch" && !p.starterPromise,
    hint: "벤치 선수용 · 경기 수 늘어요 (클러치가 중요)",
  },
  {
    id: "cleanup",
    short: "4번 타자",
    side: "bat",
    label: "4번 타자를 하고 싶어요",
    need: 4,
    extra: (p) => (p.stats.power - LEAGUES[p.league].level) / 3,
    ok: (p) => p.lineup !== "cleanup",
    hint: "파워가 중요해요 (타점 기회 +)",
  },
  // 요청 말고 '말'만 하는 면담 (special: 결과를 직접 정함)
  {
    id: "resolve",
    short: "각오 전하기",
    side: "any",
    label: "올 시즌 잘하겠습니다, 믿어 주세요",
    special: true,
    ok: () => true,
    hint: "부탁 없이 각오만 · 감독 신뢰 +1, 다음 시즌 컨디션 +",
  },
  {
    id: "captain",
    short: "주장",
    side: "any",
    label: "주장을 맡고 싶어요",
    need: 0,
    extra: (p) => (p.fame || 0) / 25 + (p.age >= 30 ? 1 : 0),
    ok: (p) => p.age >= 27 && p.captainTeam !== p.team,
    hint: "나이·인기·팀 내 입지가 중요해요 · 팬 여론 +",
  },
  {
    id: "rest",
    short: "체력 관리",
    side: "any",
    label: "체력 관리 좀 해 주세요",
    special: true,
    ok: (p) => p.age >= 32 && !p.restPlan,
    hint: "베테랑용 · 출전은 조금 줄고 부상 위험도 줄어요",
  },
  {
    id: "trade",
    short: "트레이드 요청",
    side: "any",
    label: "트레이드 시켜 주세요",
    special: true,
    ok: (p) => p.league === "KBO",
    hint: "다른 팀에서 새 출발 · 원하는 팀이 있어야 해요 (팬 여론 -)",
  },
];

// 특별 면담: 각오·체력 관리·트레이드는 감독 점수 대신 상황으로 정함
function specialMeeting(player, wish, who) {
  const lv = LEAGUES[player.league].level;
  const ovr = getOvrs(player).best;
  if (wish.id === "resolve") {
    if (player.trustTeam !== player.team) player.managerTrust = 0;
    player.trustTeam = player.team;
    player.managerTrust = Math.min(3, (player.managerTrust || 0) + 1);
    player.nextMod = (player.nextMod || 0) + 1;
    return {
      result: "yes",
      line: `${who}이 "그 말 믿는다"며 어깨를 두드려 줬어요. (감독 신뢰 ${player.managerTrust}/3)`,
      news: `${player.name}, 감독 면담서 "올 시즌 각오 남다르다"`,
    };
  }
  if (wish.id === "rest") {
    player.restPlan = player.team;
    return { result: "yes", line: `${who}이 "관리해 주마, 대신 나갈 땐 확실히 해라"라고 했어요.`, news: `${player.name}, 베테랑 체력 안배 들어간다` };
  }
  if (wish.id === "trade") {
    if (isFranchiseHere(player))
      return {
        result: "no",
        line: `${who}이 "너는 이 팀의 얼굴이다"라며 단칼에 거절했어요.`,
        news: `${player.name}, 트레이드 요청했지만 구단 "절대 안 보낸다"`,
      };
    if (ovr < lv - 4) return { result: "no", line: "구단이 알아봤지만 원하는 팀이 없었어요.", news: `${player.name}, 트레이드 요청… 시장 반응은 싸늘` };
    const old = player.team;
    const next = pick(TEAMS.KBO.filter((t) => t !== old));
    player.team = next;
    if (player.contract) player.contract.team = next;
    changeFame(player, -4);
    player.traded = true;
    player.moveKind = "trade";
    return { result: "yes", line: `${old} → ${next} 트레이드가 성사됐어요!`, news: `[트레이드] ${player.name}, ${old}에서 ${next}로… "새 팀에서 증명하겠다"` };
  }
}

function canMeetManager(player) {
  return !player.retired && !player.cur && !isAmateur(player.league) && !isServing(player) && player.meetingSeason !== player.season; // 시즌 중엔 면담 없음
}

function meetingWishes(player) {
  return MEETING_WISHES.filter((w) => {
    if (w.side === "pit" && player.type === "batter") return false;
    if (w.side === "bat" && player.type === "pitcher") return false;
    if (player.type === "twoway" && (w.id === "starter" || w.id === "bullpen")) return false;
    if (w.id === "trade" && player.league !== "KBO") return false;
    return w.ok(player);
  });
}

// 우리 팀 감독 (KBO는 실제·역대 감독, 2군·해외 팀은 이름 없이 스타일만)
function managerOf(player) {
  if (player.league === "KBO") {
    initManagers(player);
    if (player.managers[player.team]) return player.managers[player.team];
  }
  const keys = ["trust", "run", "pitch", "results", "talk", "defense", "youth"];
  const hash = [...(player.team || "")].reduce((h, c) => h + c.charCodeAt(0), 0);
  return { name: player.league === "KBO2" ? `${player.team} 퓨처스` : player.team, style: keys[hash % keys.length], anonymous: true };
}

function managerTitle(player) {
  const m = managerOf(player);
  return `${m.legend ? "👑 " : ""}${m.name} 감독`;
}

// 감독이 보는 점수: 실력·성적·캠프·라커룸 입지·팬심·신뢰·팀 사정·스타일 (clubhouse.js managerView 합계)
function managerScore(player, wish) {
  return round(
    managerView(player, wish).reduce((sum, x) => sum + x.v, 0),
    1,
  );
}

// talkBonus, talk: 대화 면담 결과 (talk.js). 없으면 예전처럼
function meetManager(player, wishId, talkBonus, talk) {
  talk = talk || {};
  const wish = MEETING_WISHES.find((w) => w.id === wishId);
  player.meetingSeason = player.season;
  if (wish.special) return { wish, score: 0, ...specialMeeting(player, wish, managerTitle(player)) };
  const view = managerView(player, wish);
  const score = round(view.reduce((sum, x) => sum + x.v, 0) + (talkBonus || 0), 1);
  const m = managerOf(player);
  const campRange = (m.style === "talk" ? 4.5 : 3) + (talk.camp ? 1.5 : 0); // 캠프에서 증명하겠다고 하면 캠프 기회 더 줌
  let result;
  if (score >= wish.need) result = "yes";
  else if (score >= wish.need - campRange) result = "camp";
  else result = "no";

  const who = managerTitle(player);
  const line = {
    yes: `${who}이 요청을 받아들였어요.`,
    camp: `${who}: 스프링캠프에서 보고 결정하겠대요.`,
    no: `${who}이 아직은 이르다고 했어요.`,
  }[result];
  let news;
  if (result === "yes") {
    applyWish(player, wish.id);
    news = `${player.name}, 감독 면담 끝에 '${wish.short}' 요청 받아들여져`;
  } else if (result === "camp") {
    player.campWish = { id: wish.id, need: wish.need };
    news = `${player.name}, 감독에게 역할 변경 요청… 스프링캠프 경쟁으로 결정`;
  } else {
    if (score < wish.need - 7 || talk.threat) player.nextMod = (player.nextMod || 0) - 1; // 무리한 요구·협박은 관계가 서먹해짐
    if (talk.loyal) {
      // 거절돼도 따르겠다고 하면 신뢰 +1
      if (player.trustTeam !== player.team) player.managerTrust = 0;
      player.trustTeam = player.team;
      player.managerTrust = Math.min(3, (player.managerTrust || 0) + 1);
    }
    news = `${player.name}, 감독 면담에서 요청 거절당해`;
  }
  return { wish, result, line, news, score, view, need: wish.need };
}

function applyWish(player, id) {
  player.promiseTeam = player.team;
  if (id === "starter") {
    player.position = "선발";
    player.role = null;
  }
  if (id === "bullpen") {
    player.position = "불펜";
    player.role = null;
  }
  if (id === "closer") player.role = "closer";
  if (id === "regular") player.starterPromise = true;
  if (id === "leadoff" || id === "cleanup") {
    player.lineup = id;
    player.starterPromise = true;
  }
  if (id === "pinch") player.lineup = "pinch";
  if (id === "captain") {
    player.captainTeam = player.team;
    changeFame(player, 4);
  }
}

// 시즌 시작 때 캠프 경쟁 결과 (시즌 컨디션까지 포함해서 다시 판단)
function resolveCampWish(player, report, mod) {
  // 팀을 옮기면 예전 감독과의 약속은 없던 일이 됨
  if (player.promiseTeam && player.promiseTeam !== player.team) {
    player.starterPromise = false;
    player.lineup = null;
    player.role = null;
    player.closerOffer = false;
    player.campWish = null;
    player.promiseTeam = null;
    player.restPlan = null;
  }
  const cw = player.campWish;
  if (!cw) return;
  player.campWish = null;
  const wish = MEETING_WISHES.find((w) => w.id === cw.id);
  const score = managerScore(player, wish) + mod / 3 + randomInt(-1, 1);
  if (score >= cw.need) {
    applyWish(player, cw.id);
    report.events.push("캠프 경쟁 승리");
    report.bigMoments = report.bigMoments || [];
    report.bigMoments.push({ tone: "good", kicker: "스프링캠프 결과", title: "✅ 경쟁 승리!", lines: [`감독이 요청을 받아들였어요: ${wish.short}`] });
  } else {
    report.events.push("캠프 경쟁 패배");
  }
}

// 타순 효과: 1번 타자는 득점, 4번 타자는 타점이 많음
function lineupEffect(player, bat) {
  if (!bat) return;
  if (player.lineup === "leadoff") {
    bat.R = Math.round(bat.R * 1.15);
    bat.RBI = Math.round(bat.RBI * 0.85);
  }
  if (player.lineup === "cleanup") {
    bat.RBI = Math.round(bat.RBI * 1.15);
  }
}

// 감독이 먼저 찾아옴: 필승조로 압도적이면 "내년엔 네가 뒷문 맡아라"
function maybeCloserOffer(player, report) {
  const p = report.pit;
  if (!p || !p.role || p.role !== "필승조" || player.role === "closer" || isAmateur(player.league)) return false;
  if (!(p.ERA <= 2.6 && p.WAR >= 2.5 && p.HLD >= 15)) return false;
  pushChoice(player, {
    key: "closerOffer",
    text: `🗣️ ${managerTitle(player)}이 불렀어요. "평균자책 ${p.ERA.toFixed(2)}, 홀드 ${p.HLD}개. 내년엔 네가 뒷문 맡아라."`,
    options: [
      { id: "accept", label: "마무리 맡겠습니다", detail: "다음 시즌 마무리 (세이브 기회)" },
      { id: "stay", label: "지금 자리가 편합니다", detail: "필승조 그대로" },
    ],
  });
  return true;
}

function resolveCloserOffer(player, choice, option) {
  if (option.id === "accept") {
    player.role = "closer";
    player.closerOffer = true;
    player.closerPromoted = true; // 업적용
    player.promiseTeam = player.team;
    return [`${player.name}, 새 시즌 마무리 낙점… "9회는 내가 책임진다"`];
  }
  return [`${player.name}, 마무리 제안 고사… "지금 자리에서 팀을 돕겠다"`];
}

// 감독이 먼저 찾아옴: 벤치 타자에게 "대타로 쓸 테니 대타 훈련해라"
function maybeManagerTalk(player, report) {
  if (maybeCloserOffer(player, report)) return;
  if (player.retired || isAmateur(player.league) || isServing(player) || player.type !== "batter") return;
  if (!report.bat || !report.bat.role || !report.bat.role.startsWith("백업") || player.lineup === "pinch") return;
  const pending = [player.pendingChoice, ...player.choiceQueue].filter(Boolean);
  if (pending.some((c) => ["forcedRetire", "fa", "military"].includes(c.key))) return;
  if (Math.random() > 0.5) return;
  const who = managerTitle(player);
  pushChoice(player, {
    key: "managerTalk",
    text: `🗣️ ${who}이 불렀어요. "내년엔 너를 대타 요원으로 쓸 생각이다. 비시즌에 대타 감각 좀 만들어 와라."`,
    options: [
      { id: "accept", label: "알겠습니다, 대타 훈련하겠습니다", detail: "대타 요원 (출전 경기 늘어남) · 클러치 +2, 컨택 +1" },
      { id: "compete", label: "주전 경쟁 해보고 싶습니다", detail: "스프링캠프에서 주전 경쟁 (못 이기면 백업)" },
    ],
  });
}

function resolveManagerTalk(player, choice, option) {
  if (option.id === "accept") {
    player.lineup = "pinch";
    player.promiseTeam = player.team;
    for (const [k, v] of [
      ["clutch", 2],
      ["contact", 1],
    ])
      player.stats[k] = clamp(player.stats[k] + v, 1, 99);
    return [`${player.name}, 비시즌 대타 특훈… "한 타석에 모든 걸 건다"`];
  }
  player.campWish = { id: "regular", need: -1 };
  player.promiseTeam = player.team;
  return [`${player.name}, "주전 경쟁 피하지 않겠다"… 스프링캠프 정면 승부`];
}

// ---------------------------------------------
// 2. 감독 교체: 성적이 나쁘거나 계약이 끝나면 감독이 바뀜
// ---------------------------------------------

// 역대 감독(👑 레전드 포함)과 새 얼굴, 은퇴한 라이벌까지 후보가 됨
function initManagers(player) {
  if (player.managers) return;
  player.managers = {};
  const now = gameYear(player);
  for (const [team, m] of Object.entries(MANAGERS)) {
    // 예전 버전 저장 파일로 이어 하면 지금 해 기준으로 부임 연도를 맞춤
    const since = now > START_YEAR + 3 ? now - randomInt(0, 3) : MANAGER_SINCE[team] || START_YEAR;
    player.managers[team] = { ...m, note: "", since };
  }
  player.managerPool = {}; // 한 번이라도 감독을 했던 사람 (다시 돌아올 수 있음)
  player.managerRest = {}; // 경질된 감독은 2년 쉼
  player.myManagers = []; // 내가 함께한 KBO 감독
}

function managerCandidates(player, year) {
  const busy = new Set(Object.values(player.managers).map((m) => m.name));
  const rest = player.managerRest;
  const ok = (name) => !busy.has(name) && !(rest[name] > year);
  const age = year - START_YEAR; // 게임이 흘러갈수록 옛 감독은 줄고 새 얼굴이 늘어남
  const list = [];
  const young = (m) => !m.born || year + 1 - m.born <= 68; // 다음 시즌 나이 기준
  for (const m of PAST_MANAGERS) {
    if (!ok(m.name) || (m.until ? year > m.until : !young(m))) continue;
    list.push({ m, w: m.legend ? Math.max(0.15, 1 - age * 0.06) : Math.max(0.2, 1.5 - age * 0.08) });
  }
  for (const m of Object.values(player.managerPool)) {
    if (ok(m.name) && young(m) && !PAST_MANAGERS.some((x) => x.name === m.name)) list.push({ m, w: Math.max(0.3, 1.2 - (year - (m.left || year)) * 0.1) });
  }
  for (const name of NEW_MANAGER_NAMES) {
    if (ok(name) && !player.managerPool[name]) {
      list.push({ m: { name, born: year - randomInt(43, 52), style: pick(Object.keys(MANAGER_STYLES)), note: "코치 출신 신임 감독" }, w: 0.8 + age * 0.2 });
    }
  }
  list.push(...pastPlayerManagers(player, year, ok)); // 예전에 키운 선수 (living.js)
  const r = player.rival;
  if (r && r.retired && ok(r.name) && player.age >= 38) {
    // 라이벌은 나랑 동갑
    list.push({
      m: {
        name: r.name,
        born: year - player.age,
        style: r.type === "pitcher" ? "pitch" : pick(["trust", "talk", "run"]),
        note: "내 라이벌 · 은퇴 후 지도자로",
      },
      w: 4,
    });
  }
  return list;
}

function weightedPick(list) {
  let roll = Math.random() * list.reduce((t, x) => t + x.w, 0);
  for (const x of list) if ((roll -= x.w) <= 0) return x.m;
  return list[list.length - 1].m;
}

// 감독 스타일이 내 시즌에 주는 효과 (지옥 훈련, 자율 야구)
function managerSeasonEffect(player, report) {
  if (report.league !== "KBO" || !player.managers || !player.managers[report.team]) return;
  const m = player.managers[report.team];
  if (!player.myManagers.includes(m.name)) player.myManagers.push(m.name);
  if (m.style === "training") {
    const keys = Object.keys(player.stats);
    const k = pick(keys);
    player.stats[k] = clamp(player.stats[k] + 1, 1, 99);
    report.events.push("지옥 훈련");
    report.news.push(`${player.name}, ${m.name} 감독의 지옥 훈련 버텨냈다… "펑고 1000개는 기본"`);
  }
  if (m.style === "freedom" && player.age >= 31) player.nextMod = (player.nextMod || 0) + 1;
}

function rotateManagers(player, report) {
  initManagers(player);
  managerSeasonEffect(player, report);
  const year = report.year;
  const myLastTeam = report.league === "KBO" ? report.team : null;
  const changes = [];
  // 다른 팀 순위: 내가 KBO에 있으면 실제 순위표, 아니면 대충 랜덤
  const table = report.league === "KBO" && report.standing ? report.standing.table : null;
  const shuffled = shuffle(Object.keys(player.managers));
  const rankOf = (team) => (table ? table.findIndex((t) => t.team === team) + 1 : shuffled.indexOf(team) + 1);
  for (const team of shuffled) {
    const old = player.managers[team];
    if (!old.contractEnd) old.contractEnd = Math.max(year, old.since + randomInt(1, 2)); // 예전 저장 파일: 계약 기간 채워 넣기
    const past = PAST_MANAGERS.find((x) => x.name === old.name);
    const rank = rankOf(team);
    const ps = rank <= 5;
    let reason = null;
    if ((past && past.until && year >= past.until) || (!(past && past.until) && old.born && year + 1 - old.born > 72)) {
      reason = "지휘봉 내려놓음"; // 나이
    } else if (year >= old.contractEnd) {
      // 계약 마지막 해: 가을야구 가면 대부분 재계약, 꼴찌권이면 대부분 교체
      const renew = rank === 1 ? 0.95 : ps ? 0.85 : rank <= 7 ? 0.5 : 0.15;
      if (Math.random() < renew) {
        old.contractEnd = year + randomInt(2, 3);
        if (team === myLastTeam && ps) report.news.push(`${team}, ${old.name} 감독과 재계약… "${rank === 1 ? "왕조를 이어간다" : "다음엔 더 높은 곳으로"}"`);
        continue;
      }
      reason = rank >= 8 ? "재계약 불발 (성적 부진)" : "계약 만료";
    } else if (rank >= 9 && Math.random() < 0.15) {
      reason = "성적 부진으로 경질"; // 계약 기간 중 경질은 드묾
    } else {
      continue;
    }
    if (reason !== "지휘봉 내려놓음" && changes.length >= 3) continue; // 한 겨울에 너무 많이 바뀌지 않게

    const cands = managerCandidates(player, year);
    if (!cands.length) continue;
    const next = { ...weightedPick(cands) };
    delete next.left;
    next.since = year + 1;
    next.contractEnd = year + randomInt(2, 3); // 보통 2~3년 계약
    player.managers[team] = next;
    player.managerPool[old.name] = { ...old, left: year };
    player.managerPool[next.name] = { ...next };
    player.managerRest[old.name] = year + 2;
    changes.push({ team, old, next, reason });
  }

  for (const c of changes) {
    if (player.rival && c.next.name === player.rival.name) {
      report.news.push(`라이벌 ${c.next.name}, ${c.team} 감독으로 돌아왔다… "${player.name}? 이제 적장으로 만나죠"`);
      continue;
    }
    report.news.push(
      c.next.legend
        ? `'레전드' ${c.next.name} 감독, ${c.team} 지휘봉 잡는다… ${c.old.name} 감독은 ${c.reason}`
        : `${c.team}, 새 사령탑에 ${c.next.name} 선임… ${c.old.name} 감독 ${c.reason}`,
    );
  }

  // 다음 시즌 내 팀 감독이 바뀌면: 예전 약속은 없던 일, 면담도 새로
  const mine = player.league === "KBO" && changes.find((c) => c.team === player.team);
  if (mine) {
    player.starterPromise = false;
    player.lineup = null;
    if (player.role === "closer") player.role = null;
    player.campWish = null;
    player.meetingSeason = null;
    player.managerTrust = 0;
    player.closerOffer = false;
    const st = MANAGER_STYLES[mine.next.style];
    report.bigMoments = report.bigMoments || [];
    report.bigMoments.push({
      tone: mine.next.legend ? "gold" : "good",
      kicker: `${player.team} 감독 교체`,
      title: `${mine.next.legend ? "👑 " : ""}새 감독 ${mine.next.name}`,
      lines: [
        `${mine.old.name} 감독 ${mine.reason}`,
        mine.next.note ? mine.next.note : "새 얼굴의 지휘봉",
        `스타일: ${st.name}`,
        "예전 감독과의 약속은 없던 일이 됐어요. 면담으로 다시 어필해 보세요",
      ],
    });
  }
}

// KBO 10개 구단 감독 현황표 (감독 면담 패널 안)
function managerBoardHtml(player, year) {
  initManagers(player);
  const rows = Object.entries(player.managers)
    .map(
      ([team, m]) =>
        `<tr${team === player.team ? ' class="mine"' : ""}><td>${team}</td><td>${m.legend ? "👑 " : ""}${m.name}</td><td>${MANAGER_STYLES[m.style].name}</td><td>${Math.max(1, year - m.since + 1)}년째</td></tr>`,
    )
    .join("");
  return `<details class="mgr-board"><summary>KBO 감독 현황</summary><table class="standings"><tr><th>팀</th><th>감독</th><th>스타일</th><th>재임</th></tr>${rows}</table></details>`;
}
