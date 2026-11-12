// =============================================
// compensation.js : KBO FA 보상선수
// 1. 내가 FA로 다른 KBO 팀 가면: A등급 보호선수 20인 외, B등급 25인 외에서 친정팀이 유망주 한 명 데려감
//    그 유망주는 이름이 남고, 몇 년 뒤 '보상선수 신화' 기사가 나기도 함
// 2. 반대로 내 팀이 외부 FA를 잡으면 보호선수 명단 발표 → 어린 백업이면 내가 보상선수로 찍힐 수도 있음
// =============================================

// FA 계약 직전 (career.js resolveChoice): 등급은 계약 전 연봉 기준
function compensationInfo(player, o, stayed) {
  if (stayed || o.league !== "KBO" || player.league !== "KBO") return null;
  const grade = faGrade(player); // rules.js
  if (grade === "C") return { grade, pay: 150 };
  return { grade, protect: grade === "A" ? 20 : 25, pay: grade === "A" ? 200 : 100 };
}

function faCompensation(player, comp, oldTeam) {
  if (!comp) return [];
  if (!comp.protect) return [`[보상] ${oldTeam}, C등급이라 보상선수 없이 직전 연봉 ${comp.pay}%만 받는다`];
  const pos = pick(["투수", "투수", "포수", "내야수", "외야수"]);
  const kid = { name: fakeName("KBO"), age: randomInt(20, 24), pos, from: player.team, to: oldTeam, year: gameYear(player), grade: comp.grade };
  player.compKid = kid;
  return [
    `[보상선수] ${oldTeam}, ${player.team} 보호선수 ${comp.protect}인 외 ${kid.pos} ${kid.name}(${kid.age}세) 지명… 직전 연봉 ${comp.pay}%도 함께`,
    `${kid.name} "${player.name} 선배 덕에 기회 얻었다… 새 팀에서 꼭 자리 잡겠다"`,
  ];
}

// 몇 년 뒤 보상선수 소식 (flow.js afterSeason)
function compKidStory(player, report) {
  const k = player.compKid;
  if (!k || k.done) return;
  const gap = report.year - k.year;
  if (gap < 2) return;
  if (gap > 5) {
    k.done = true;
    return;
  }
  if (Math.random() >= 0.35) return;
  k.done = true;
  const boom = Math.random() < 0.45;
  if (boom) {
    report.news.push(`'보상선수 신화' ${k.name}, ${k.to} 주전 꿰찼다… ${player.name} 이적 때 넘어간 그 유망주`);
    report.comments = report.comments || [];
    report.comments.push(makeComment(pick(FAN.compBoom), player, { kid: k.name }, "hot"));
  } else report.news.push(`${player.name} 보상선수였던 ${k.name}, ${k.to}에서 아직 2군… "기회는 온다"`);
}

// ---------------------------------------------
// 2. 내가 보상선수로 찍힘
// ---------------------------------------------
function protectSeason(player, report) {
  if (!["KBO", "KBO2"].includes(player.league) || !TEAMS.KBO.includes(player.team)) return;
  const busy = [player.pendingChoice, ...(player.choiceQueue || [])].some(
    (c) => c && ["fa", "posting", "forcedRetire", "military", "undrafted"].includes(c.key),
  );
  if (busy) return;
  if (player.age > 27 || isFranchiseHere(player) || (player.contract && player.contract.isFA)) return;
  if (Math.random() >= 0.18) return; // 우리 팀이 외부 FA를 잡은 해
  const ovr = getOvrs(player).best;
  const lv = LEAGUES.KBO.level;
  // 주전급이면 무조건 보호, 백업·퓨처스면 빠질 수 있음
  const out = ovr < lv - 2 && Math.random() < (ovr < lv - 6 ? 0.55 : 0.3);
  const signer = pick(TEAMS.KBO.filter((t) => t !== player.team));
  const fa = fakeName("KBO");
  if (!out) {
    report.news.push(`${player.team}, 외부 FA ${fa} 영입… ${player.name}${josaOf(player.name, "은")} 보호선수 명단에 들어가`);
    return;
  }
  const picked = Math.random() < 0.4;
  if (!picked) {
    report.news.push(`${player.team} 보호선수 명단에서 빠졌던 ${player.name}, ${signer}의 선택은 다른 선수였다`);
    player.nextMod = (player.nextMod || 0) + 1; // 자극받음
    return;
  }
  pushChoice(player, {
    key: "compPicked",
    mailFrom: "KBO 사무국",
    mailSubject: "[통보] FA 보상선수 지명",
    signer,
    fa,
    text: `📦 ${player.team}${josaOf(player.team, "이")} ${signer}의 FA ${fa}${josaOf(fa, "을")} 영입하면서 보호선수 명단을 냈는데, 거기에 내 이름이 없었어요.<br>그리고 ${signer}${josaOf(signer, "가")} 보상선수로 <b>${player.name}</b>${josaOf(player.name, "을")} 지명했어요. 거부할 수는 없어요.`,
    options: [
      { id: "chance", label: "새 팀에서 기회로 삼겠다", detail: "다음 시즌 컨디션 +1 · 새 팀 팬심 ↑" },
      { id: "hurt", label: "친정에 서운한 마음 SNS에 올리기", detail: "원소속 팬들 동정 · 구단 프런트와 껄끄러움" },
    ],
  });
}

function resolveCompPicked(player, choice, option) {
  const from = player.team;
  const to = choice.signer;
  player.team = to;
  if (player.contract) player.contract.team = to;
  player.moveKind = "trade";
  player.starterPromise = false;
  player.restPlan = null;
  player.compPicked = (player.compPicked || 0) + 1;
  player.lastComp = option.id;
  if (option.id === "chance") {
    player.nextMod = (player.nextMod || 0) + 1;
    changeTeamFans(player, to, 3);
    return [`[보상선수] ${player.name}, ${from} → ${to}… "날 원한 팀에서 증명하겠다"`];
  }
  changeTeamFans(player, from, 3);
  changeFame(player, -1);
  return [`[보상선수] ${player.name}, ${from} → ${to}… SNS에 "보호 명단에 없다는 거 뉴스 보고 알았다"`];
}

Object.assign(MAIL_SENDERS, {
  compPicked: { from: "KBO 사무국", icon: "📦", subject: "보상선수 지명" },
});

Object.assign(FAN, {
  compChance: ["보상선수 신화 써라", "가서 터지면 친정 땅 치고 후회함", "기회 많은 팀 가서 오히려 좋아", "응원한다 진짜로"],
  compHurt: ["서운할 만하지", "보호 명단 20명에 못 들어간 건 실력이지 뭐", "구단이 너무했다", "가서 친정 상대로 터뜨려라"],
  compBoom: ["{kid} 보상선수로 데려온 거 신의 한 수였네", "보상선수 신화 또 나왔다", "FA보다 보상선수가 낫다 ㅋㅋ"],
});

function compPool(player) {
  return { chance: FAN.compChance, hurt: FAN.compHurt }[player.lastComp];
}

ACHIEVEMENTS.push({ id: "compPicked", group: "커리어", name: "보상선수", desc: "FA 보상선수로 팀을 옮김", check: (p) => (p.compPicked || 0) >= 1 });
