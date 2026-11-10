// =============================================
// locker.js : 팀 동료와 라커룸
// 프로 팀에 들어가면 동료 3~4명이 생김: 선배(멘토) / 동기(친구) / 라이벌 / 후배(멘티)
// bond(친밀도 0~100), morale(사기 -10~10)
// 사기 높으면 컨디션 +1, 낮으면 -1 / 멘토랑 친하면 성장 조금 더 / 후배 키우면 지도자 평판
// =============================================

const MATE_REL = {
  mentor: { icon: "🧑‍🏫", name: "멘토" },
  friend: { icon: "🤝", name: "절친" },
  rival: { icon: "⚔️", name: "주전 경쟁" },
  mentee: { icon: "🐣", name: "아끼는 후배" },
};

function makeMate(player, rel) {
  const lg = player.league === "KBO2" ? "KBO" : player.league;
  const age =
    rel === "mentor"
      ? player.age + randomInt(5, 9)
      : rel === "mentee"
        ? player.age - randomInt(4, 8)
        : rel === "friend"
          ? player.age
          : player.age + randomInt(-2, 3);
  const pos = player.type === "pitcher" ? pick(["선발", "불펜"]) : pick(POSITIONS.batter);
  const level = LEAGUES[player.league] ? LEAGUES[player.league].level : 55;
  return {
    name: fakeName(lg),
    rel,
    age,
    team: player.team,
    pos: rel === "rival" ? player.position.split(" 겸 ").pop() : pos,
    role: age > player.age ? "선배" : age < player.age ? "후배" : "동기",
    bond: rel === "rival" ? 20 : randomInt(35, 55),
    ovr: rel === "rival" ? getOvrs(player).best + randomInt(-3, 3) : level + randomInt(-6, 8),
  };
}

// 팀이 바뀌면 새 동료. 예전 동료는 '옛 동료'로 (최대 6명)
function lockerSetup(player) {
  if (isAmateur(player.league) || player.league === "SOCIAL" || player.retired) return null;
  if (player.matesTeam === player.team && player.mates) return null;
  const old = (player.mates || []).filter((m) => m.bond >= 60);
  player.oldMates = [...old.map((m) => ({ name: m.name, team: m.team, rel: m.rel })), ...(player.oldMates || [])].slice(0, 6);
  const rels = [player.age <= 29 ? "mentor" : "mentee", "friend", "rival"];
  if (player.age >= 27 && player.age <= 31) rels.push(Math.random() < 0.5 ? "mentor" : "mentee");
  player.mates = rels.map((r) => makeMate(player, r));
  player.matesTeam = player.team;
  if (player.morale === undefined) player.morale = 0;
  else player.morale = Math.round(player.morale / 2); // 새 팀이면 사기 반쯤 리셋
  return player.mates;
}

const mateOf = (player, rel) => (player.mates || []).find((m) => m.rel === rel);

function bump(player, m, d) {
  if (m) m.bond = clamp(m.bond + d, 0, 100);
}
function moraleUp(player, d) {
  player.morale = clamp((player.morale || 0) + d, -10, 10);
}

// 시즌 시작 전 컨디션: 사기
function lockerMod(player, report) {
  const m = player.morale || 0;
  if (m >= 5) {
    report.events.push("라커룸 분위기 최고");
    return 1;
  }
  if (m <= -5) {
    report.events.push("라커룸 겉돎");
    return -1;
  }
  return 0;
}

// 멘토랑 친하면 성장 +0.4 (growPlayer 보너스)
function lockerGrowBonus(player) {
  const m = mateOf(player, "mentor");
  return m && m.bond >= 60 ? 0.4 : 0;
}

// 시즌 끝: 라이벌 비교, 후배 성장, 동료들 나이 먹음
function lockerSeason(player, report) {
  if (!player.mates || player.matesTeam !== report.team) return;
  player.morale = Math.trunc((player.morale || 0) * 0.6); // 사기는 시간이 지나면 보통으로 돌아옴
  const my = getOvrs(player).best;
  const r = mateOf(player, "rival");
  if (r) {
    r.ovr += r.age <= 28 ? randomInt(0, 2) : r.age <= 32 ? randomInt(-1, 1) : randomInt(-3, 0);
    if (r.ovr > my + 2) {
      moraleUp(player, -1);
      if (Math.random() < 0.5) report.news.push(`${report.team} ${r.pos} 주전 경쟁, ${r.name} 쪽으로 기우나`);
    } else if (my > r.ovr + 4) {
      moraleUp(player, 1);
      r.bond = clamp(r.bond + 5, 0, 100); // 인정하면 사이가 풀림
    }
  }
  const mt = mateOf(player, "mentee");
  if (mt) {
    mt.ovr += randomInt(0, 2);
    if (mt.bond >= 60) {
      player.coachRep = (player.coachRep || 0) + 1;
      if (player.coachRep === 3) report.news.push(`${report.team} 후배들 "${player.name} 선배 덕분에 컸다"… 라커룸 리더로 자리매김`);
    }
  }
  for (const m of player.mates) {
    m.age++;
    if (m.rel !== "rival") m.bond = clamp(m.bond - 2, 0, 100); // 신경 안 쓰면 조금씩 멀어짐
  }
  // 성적 따라 사기
  if (report.WAR >= 4) moraleUp(player, 1);
  if (report.standing && report.standing.rank === 1) moraleUp(player, 1);
  if (report.WAR < 0) moraleUp(player, -1);
  // 멘토 은퇴
  const men = mateOf(player, "mentor");
  if (men && men.age >= 38 && Math.random() < 0.5) {
    report.news.push(`${men.name} 은퇴… "${player.name}${josaOf(player.name, "은")} 이제 혼자서도 잘할 거다"`);
    player.mates = player.mates.filter((x) => x !== men);
    player.oldMates = [{ name: men.name, team: men.team, rel: "mentor" }, ...(player.oldMates || [])].slice(0, 6);
    if (!mateOf(player, "mentee") && player.age >= 27) player.mates.push(makeMate(player, "mentee")); // 이제 내가 챙길 차례
  }
}

// 라커룸 작은 사건 (시즌마다 35%)
const LOCKER_EVENTS = [
  {
    id: "dinner",
    rel: "mentor",
    text: (m, p) => `👕 ${m.name} 선배가 라커룸에서 불렀어요. "${p.name}, 오늘 고기 먹으러 가자. 할 얘기도 좀 있고."`,
    options: [
      { id: "go", label: "따라간다", detail: "멘토 친밀도 ↑ · 사기 ↑" },
      { id: "no", label: "개인 훈련 있다고 빠진다", detail: "친밀도 ↓ · 능력치 하나 +1" },
    ],
  },
  {
    id: "slump",
    rel: "friend",
    text: (m) => `👕 동기 ${m.name}${josaOf(m.name, "이")} 2군 통보받고 라커룸 구석에 앉아 있어요.`,
    options: [
      { id: "go", label: "옆에 앉아 위로한다", detail: "절친 친밀도 크게 ↑ · 사기 ↑" },
      { id: "no", label: "괜히 건드리지 않는다", detail: "친밀도 ↓" },
    ],
  },
  {
    id: "provoke",
    rel: "rival",
    text: (m) => `👕 주전 경쟁자 ${m.name}${josaOf(m.name, "이")} 인터뷰에서 "올해 주전은 저죠. 자신 있습니다"라고 했대요.`,
    options: [
      { id: "go", label: '"그라운드에서 보여 주겠다" 맞받아친다', detail: "인기 ↑ · 다음 시즌 각오 +1 · 라이벌과 사이 ↓" },
      { id: "no", label: "웃고 넘긴다", detail: "사기 ↑ · 라이벌과 사이 ↑" },
    ],
  },
  {
    id: "teach",
    rel: "mentee",
    text: (m) => `👕 후배 ${m.name}${josaOf(m.name, "이")} 쭈뼛거리며 다가왔어요. "선배님… 저 폼 좀 봐 주실 수 있어요?"`,
    options: [
      { id: "go", label: "엑스트라 훈련 같이 한다", detail: "후배 친밀도 크게 ↑ · 지도자 평판" },
      { id: "no", label: '"코치님한테 물어봐"', detail: "친밀도 ↓" },
    ],
  },
  {
    id: "meeting",
    rel: null,
    text: (m, p) => `👕 팀이 연패 중이에요. 라커룸이 축 처졌어요. ${p.age >= 28 ? "고참으로서" : "막내급이지만"} 한마디 할까요?`,
    options: [
      { id: "go", label: "선수단 미팅 소집한다", detail: "사기 ↑ · 다음 시즌 팀 승률 조금 ↑" },
      { id: "no", label: "내 할 일만 한다", detail: "변화 없음" },
    ],
  },
];

function maybeLockerEvent(player, report) {
  if (!player.mates || player.matesTeam !== player.team || player.retired || Math.random() >= 0.35) return;
  if ([player.pendingChoice, ...player.choiceQueue].filter(Boolean).length >= 3) return; // 선택지 너무 많으면 쉼
  const list = LOCKER_EVENTS.filter((e) => !e.rel || mateOf(player, e.rel));
  const e = pick(list);
  const m = e.rel ? mateOf(player, e.rel) : null;
  pushChoice(player, { key: "locker", ev: e.id, mate: m ? m.name : "", text: e.text(m, player), options: e.options.map((o) => ({ ...o })) });
}

function resolveLocker(player, choice, option) {
  const m = (player.mates || []).find((x) => x.name === choice.mate);
  const go = option.id === "go";
  const news = [];
  switch (choice.ev) {
    case "dinner":
      if (go) {
        bump(player, m, 15);
        moraleUp(player, 2);
        news.push(`${player.name}·${m ? m.name : "선배"} 회식 포착… "야구 얘기만 3시간"`);
      } else {
        bump(player, m, -10);
        const k = pick(Object.keys(player.stats));
        player.stats[k] = clamp(player.stats[k] + 1, 1, 99);
        news.push(`${player.name}, 밤늦게까지 개인 훈련`);
      }
      break;
    case "slump":
      if (go) {
        bump(player, m, 20);
        moraleUp(player, 1);
        news.push(`${player.name}, 2군 가는 동기 ${m ? m.name : ""} 배웅… "금방 올라와라"`);
      } else bump(player, m, -5);
      break;
    case "provoke":
      if (go) {
        bump(player, m, -10);
        changeFame(player, 2);
        player.nextMod = (player.nextMod || 0) + 1;
        news.push(`${player.name}, ${m ? m.name : "경쟁자"} 도발에 "그라운드에서 보여 주겠다"`);
      } else {
        bump(player, m, 10);
        moraleUp(player, 1);
      }
      break;
    case "teach":
      if (go) {
        bump(player, m, 20);
        player.coachRep = (player.coachRep || 0) + 1;
        news.push(`${player.name}, 후배 ${m ? m.name : ""}와 엑스트라 훈련… 코치 같은 선배`);
      } else bump(player, m, -10);
      break;
    case "meeting":
      if (go) {
        moraleUp(player, 2);
        player.lockerRally = { team: player.team, year: gameYear(player) };
        player.meetings = (player.meetings || 0) + 1;
        news.push(`${player.team}, ${player.name} 주도 선수단 미팅… "다시 해 보자"`);
      }
      break;
  }
  return news;
}

// ---------------------------------------------
// 동료 탭
// ---------------------------------------------
function showLocker(player) {
  const box = $("tab-locker");
  if (!box) return;
  if (!player.mates || !player.mates.length) {
    box.innerHTML = `<h3>👕 라커룸</h3><p class="small">프로 팀에 들어가면 선배, 동기, 경쟁자, 후배가 생겨요.</p>`;
    return;
  }
  const mo = player.morale || 0;
  const moText = mo >= 5 ? "최고 😆" : mo >= 2 ? "좋음 🙂" : mo <= -5 ? "겉도는 중 😶" : mo <= -2 ? "가라앉음 😕" : "보통 😐";
  let html = `<h3>👕 ${player.team} 라커룸</h3>
    <p>사기 <b>${moText}</b> <span class="morale"><i style="--m:${mo}"></i></span>${player.coachRep ? ` · 지도자 평판 ${"⭐".repeat(Math.min(5, player.coachRep))}` : ""}</p>
    <ul class="mates">`;
  for (const m of player.mates) {
    const r = MATE_REL[m.rel];
    html += `<li><span class="mate-icon">${r.icon}</span><div><b>${m.name}</b> <small>${m.role} · ${koreanAge(m.age)}세 · ${m.pos} · ${r.name}</small>
      <span class="bar" style="--v:${m.bond}"></span></div><em>${m.bond >= 80 ? "형제" : m.bond >= 60 ? "가까움" : m.bond >= 35 ? "그럭저럭" : "서먹"}</em></li>`;
  }
  html += `</ul><p class="small">사기가 높으면 시즌 컨디션 +1, 낮으면 -1. 멘토와 가까우면 성장이 조금 빨라지고, 후배를 챙기면 지도자 평판이 쌓여요.</p>`;
  if (player.oldMates && player.oldMates.length)
    html += `<p class="small">옛 동료: ${player.oldMates.map((m) => `${m.name}(${shortTeam(m.team)})`).join(", ")}</p>`;
  box.innerHTML = html;
}
