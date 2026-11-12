// =============================================
// amateur.js : 고교·대학 시절 이벤트 (드래프트 전 해에만, 시즌 끝 메일로 옴)
// 1. 투구수 혹사: 전국대회 토너먼트에서 지친 팔로 또 던질지 → 팀 성적 vs 팔꿈치
// 2. 최저학력제: 기말고사 vs 야간훈련. 기준 못 넘으면 다음 해 앞쪽 대회 출전 정지
// 3. 전학: 1학년 끝, 강팀이 부름. 규정상 전학하면 한동안 공식 경기 못 나감
// 4. 하이라이트 영상: 중계 영상 조회수 터짐 → 인터뷰·SNS로 드래프트 화제성
// 5. 동기 라이벌: 전국대회에서 라이벌 학교와 맞대결, 프로 가면 숙적으로 다시 만남 (nemesis.js)
// 드래프트 점수 보정은 player.draftAdj (career.js draftScore, -5~+5)
// 다음 해 출전 정지는 player.amateurBan (career.js startSeason)
// =============================================

// 시즌 끝 (flow.js afterSeason): 한 해에 최대 2통
function amateurSeason(player, report) {
  if (!["HS", "COLLEGE"].includes(report.league) || player.league !== report.league) return; // 드래프트 된 해는 없음
  const list = [];
  const pit = report.pit && report.pit.outs >= 30;
  const cups = report.hsTournaments || report.collegeCups || [];
  const deep = cups.filter((c) => c.result === "8강" || c.result === "16강");
  if (pit && deep.length && Math.random() < 0.4) list.push(() => overuseMail(player, report, pick(deep)));
  if (Math.random() < 0.3) list.push(() => gradesMail(player, report));
  if (report.league === "HS" && report.age === 16 && !player.transferAsked) {
    const school = HIGH_SCHOOLS.find((s) => s.name === player.school);
    const good = getOvrs(player).best >= LEAGUES.HS.level + 6;
    if (school && school.level <= 2 && good && Math.random() < 0.45) list.push(() => transferMail(player, report));
  }
  const side = report.bat && report.bat.PA ? "bat" : "pit";
  const great = (report[side] && report[side].G && seasonGrade(report, side) === "great") || report.awards.some((a) => a.endsWith("우승"));
  if (great && Math.random() < 0.45) list.push(() => highlightMail(player, report));
  const r = player.rival;
  if (report.league === "HS" && r && !r.retired && r.league === "HS" && r.school !== player.school && !player.rivalHs) {
    const met = cups.filter((c) => ["8강", "4강", "준우승", "우승", "결승 진출"].includes(c.result));
    if (met.length && Math.random() < 0.45) list.push(() => rivalMatchMail(player, report, pick(met)));
  }
  for (const f of shuffle(list).slice(0, 2)) f();
}

function addDraftAdj(player, v) {
  player.draftAdj = clamp((player.draftAdj || 0) + v, -5, 5);
}

function schoolOf(player) {
  return player.league === "COLLEGE" ? player.college : player.school;
}

// ---------------------------------------------
// 1. 투구수 혹사
// ---------------------------------------------
function overuseMail(player, report, cup) {
  const pitches = randomInt(88, 104);
  const next = cup.result === "16강" ? "16강" : "8강";
  pushChoice(player, {
    key: "overuse",
    cup: cup.name,
    round: next,
    mailFrom: `${schoolOf(player)} 야구부`,
    mailSubject: `[${cup.name}] ${next}전 등판 관련`,
    text: `⚾ ${cup.name} ${next}전 전날이에요. 사흘 전 경기에서 ${pitches}구를 던졌어요. 규정상 휴식일은 지나서 등판은 되는데, 팔이 묵직해요.<br>감독님: "${player.name}, 내일 한 번만 더 가자. 너 아니면 못 이긴다."`,
    options: [
      { id: "throw", label: "던지겠습니다", detail: "이기면 한 라운드 더 · 팔꿈치 부상 위험 큼" },
      { id: "short", label: "불펜에서 짧게만", detail: "반반 · 위험 조금" },
      { id: "rest", label: "솔직히 말하고 쉰다", detail: "팀은 불리 · 스카우트는 '관리되는 투수'로 봄" },
    ],
  });
}

function resolveOveruse(player, choice, option) {
  const id = option.id;
  player.lastOveruse = id;
  const r = player.lastReport;
  const cups = (r && (r.hsTournaments || r.collegeCups)) || [];
  const cup = cups.find((c) => c.name === choice.cup);
  const winChance = { throw: 0.6, short: 0.35, rest: 0.15 }[id];
  const hurtChance = { throw: 0.22, short: 0.08, rest: 0 }[id];
  const news = [];
  if (cup && Math.random() < winChance) {
    const up = { "16강": "8강", "8강": "4강" }[cup.result];
    if (up) {
      cup.result = up;
      news.push(`${schoolOf(player)}, ${choice.cup} ${choice.round} 통과… ${id === "rest" ? "에이스 없이 이겼다" : `${player.name} 투혼의 호투`}`);
    }
  } else news.push(`${schoolOf(player)}, ${choice.cup} ${choice.round}에서 탈락`);
  player.lastOveruseHurt = Math.random() < hurtChance;
  if (player.lastOveruseHurt) {
    player.amateurBan = { factor: 0.6, why: "팔꿈치 부상 재활" };
    player.nextMod = (player.nextMod || 0) - 2;
    addDraftAdj(player, -2);
    player.elbowHurt = (player.elbowHurt || 0) + 1;
    news.push(`${player.name}, 경기 뒤 팔꿈치 통증… 정밀검사 결과 인대 손상, 재활 길어질 듯`);
    news.push(`'고교 에이스 혹사' 논란 다시… "투구수 규정만으론 부족" 지적`);
  } else if (id === "rest") {
    addDraftAdj(player, 1);
    news.push(`스카우트 "${player.name}, 무리 안 시키고 관리 잘 됐다" 평가`);
  } else if (id === "throw") {
    changeFame(player, 2);
  }
  return news;
}

// ---------------------------------------------
// 2. 최저학력제
// ---------------------------------------------
function gradesMail(player, report) {
  const college = report.league === "COLLEGE";
  pushChoice(player, {
    key: "grades",
    mailFrom: college ? `${player.college} 학사지원팀` : `${player.school} 교무실`,
    mailSubject: college ? "[안내] 학생선수 학점 기준" : "[안내] 학생선수 최저학력 기준",
    text: college
      ? `📚 기말고사 주간이에요. 학생선수는 학점 기준(C0)을 못 넘으면 다음 학기 대회에 못 나가요. 근데 감독님은 동계훈련 일정 그대로 간대요.`
      : `📚 기말고사 주간이에요. 최저학력 기준에 못 미치면 다음 학기 대회 출전이 막혀요. 근데 감독님은 야간훈련 빠지지 말래요.`,
    options: [
      { id: "study", label: "공부 챙긴다", detail: "출전 정지 걱정 없음 · 훈련 조금 빠져서 다음 시즌 컨디션 -1" },
      { id: "train", label: "훈련 올인", detail: "능력치 +1 · 기준 못 넘으면 다음 해 앞쪽 대회 출전 정지" },
      { id: "cram", label: "밤새 벼락치기", detail: "둘 다 잡아 보기 · 피곤함" },
    ],
  });
}

function resolveGrades(player, choice, option) {
  const id = option.id;
  player.lastGrades = id;
  player.lastGradesFail = false;
  if (id === "study") {
    player.nextMod = (player.nextMod || 0) - 1;
    if (Math.random() < 0.4) changeFame(player, 1);
    return [`${player.name}, 기말고사 학년 상위권… "공부하는 야구선수" 교내 화제`];
  }
  const failChance = id === "train" ? 0.35 : 0.15;
  if (id === "train") {
    const keys = Object.keys(getStatNames(player.type));
    const k = pick(keys);
    player.stats[k] = clamp(player.stats[k] + 1, 1, 99);
  } else player.nextMod = (player.nextMod || 0) - 1;
  player.lastGradesFail = Math.random() < failChance;
  if (player.lastGradesFail) {
    player.amateurBan = { factor: 0.75, why: "최저학력 미달 출전 정지" };
    player.gradesFail = (player.gradesFail || 0) + 1;
    return [`${player.name}, 학력 기준 미달… 다음 학기 앞쪽 대회 출전 정지`];
  }
  return [
    id === "train" ? `${player.name}, 시험 기간에도 야간훈련… 성적은 겨우 기준 넘겨` : `${player.name}, 밤샘 벼락치기로 기준 통과… 다음 날 훈련은 비몽사몽`,
  ];
}

// ---------------------------------------------
// 3. 전학
// ---------------------------------------------
function transferMail(player) {
  player.transferAsked = true;
  const region = Object.keys(HS_REGIONS).find((r) => HS_REGIONS[r].includes(player.school));
  const near = HIGH_SCHOOLS.filter((s) => s.level >= 3 && s.name !== player.school);
  const same = near.filter((s) => region && HS_REGIONS[region].includes(s.name));
  const to = pick(same.length ? same : near);
  if (!to) return;
  pushChoice(player, {
    key: "transfer",
    to: to.name,
    mailFrom: `${to.name} 야구부 감독`,
    mailSubject: "우리 학교로 올 생각 없나",
    text: `🏫 전국대회 단골 ${to.name}에서 전학 제안이 왔어요. 강팀이라 전국대회 노출이 많고 스카우트도 자주 와요.<br>근데 규정상 전학하면 한동안 공식 경기에 못 나가요. 그리고 ${player.school} 감독님과 동기들은…`,
    options: [
      { id: "move", label: `${to.name}${josaOf(to.name, "으로")} 전학`, detail: "강팀 · 스카우트 노출 ↑ · 다음 해 절반은 출전 정지 · 모교와 서먹" },
      { id: "stay", label: `${player.school}에 남는다`, detail: "모교 에이스 · 다음 시즌 컨디션 +1 · 지역 팬 응원" },
    ],
  });
}

function resolveTransfer(player, choice, option) {
  player.lastTransfer = option.id;
  if (option.id === "move") {
    const from = player.school;
    player.oldSchool = from;
    player.school = choice.to;
    player.team = choice.to;
    if (player.contract) player.contract.team = choice.to;
    player.amateurBan = { factor: 0.5, why: "전학생 출전 제한" };
    return [`${player.name}, ${from} → ${choice.to} 전학… 규정상 당분간 공식 경기 못 나가`, `${from} 동기 "서운하지만 잘되길 바란다"`];
  }
  player.nextMod = (player.nextMod || 0) + 1;
  player.loyalSchool = true;
  changeFame(player, 1);
  return [`${player.name}, 강팀 전학 제안 뿌리쳐… "${player.school}에서 전국대회 우승하고 싶다"`];
}

// ---------------------------------------------
// 4. 하이라이트 영상
// ---------------------------------------------
function highlightMail(player, report) {
  const views = randomInt(18, 160);
  const what = report.bat && report.bat.HR >= 3 ? "홈런" : report.pit && report.pit.K >= 30 ? "탈삼진" : "명장면";
  pushChoice(player, {
    key: "hlVideo",
    mailFrom: "야구 유튜브 채널",
    mailSubject: "인터뷰 요청드립니다",
    text: `📱 아마야구 중계에 나온 ${player.name} ${what} 영상이 조회수 ${views}만 회를 넘었어요. 댓글에 "이 선수 누구냐"가 수두룩해요. 구독자 많은 야구 채널에서 인터뷰를 하자고 해요.`,
    options: [
      { id: "interview", label: "인터뷰 한다", detail: "화제성 ↑ · 말실수하면 역풍" },
      { id: "post", label: "영상을 내 SNS에 직접 올린다", detail: "팬 ↑ · 건방지다는 말 나올 수도" },
      { id: "quiet", label: "사양하고 운동만", detail: "조용히 · 스카우트는 오히려 좋게 봄" },
    ],
  });
}

function resolveHlVideo(player, choice, option) {
  const id = option.id;
  player.lastHl = id;
  if (id === "quiet") {
    addDraftAdj(player, 1);
    return [`${player.name}, 인터뷰 요청 고사… 스카우트 "실력으로 말하는 스타일"`];
  }
  const slip = Math.random() < (id === "interview" ? 0.2 : 0.15);
  if (slip) {
    changeFame(player, -2);
    addDraftAdj(player, -1);
    player.lastHl = id + "Bad";
    return [
      id === "interview" ? `${player.name} 인터뷰 "프로 가면 바로 주전"… 고교생이 너무 나갔다는 반응` : `${player.name} SNS에 '#국대각' 태그… 댓글창 갑론을박`,
    ];
  }
  changeFame(player, id === "interview" ? 3 : 2);
  addDraftAdj(player, id === "interview" ? 2 : 1);
  return [
    id === "interview" ? `${player.name} 인터뷰 영상 화제… 구단 스카우트들 "직접 보러 간다"` : `${player.name} 하이라이트 영상 SNS로 퍼져… 아마야구 스타 탄생`,
  ];
}

// ---------------------------------------------
// 5. 동기 라이벌 맞대결
// ---------------------------------------------
function rivalMatchMail(player, report, cup) {
  const r = player.rival;
  const won = cup.result !== "8강"; // 8강에서 떨어졌으면 그 경기가 라이벌전
  pushChoice(player, {
    key: "rivalHs",
    cup: cup.name,
    teamWon: won,
    mailFrom: "고교야구 중계팀",
    mailSubject: `[${cup.name} 8강] ${player.school} vs ${r.school}`,
    text: `⚔️ ${cup.name} 8강 상대가 ${r.school}, 동기 라이벌 ${r.name}의 학교예요. 기자들이 벌써 "${player.name} vs ${r.name}" 기사를 쓰고 있어요. 경기 전 마음가짐은?`,
    options: [
      { id: "head", label: `${r.name}${josaOf(r.name, "과")} 정면승부`, detail: "이기면 크게, 지면 크게" },
      { id: "team", label: "팀 승리가 먼저", detail: "개인 대결은 신경 안 씀 · 안정적" },
      { id: "talk", label: "경기 전 도발 인터뷰", detail: "화제성 ↑ · 지면 밈" },
    ],
  });
}

function resolveRivalHs(player, choice, option) {
  const r = player.rival;
  const id = option.id;
  const me = getOvrs(player).best;
  const them = getOvrs(r).best;
  let p = clamp(0.5 + (me - them) * 0.03, 0.2, 0.8);
  if (id === "head") p = clamp(p + (Math.random() < 0.5 ? 0.12 : -0.12), 0.1, 0.9);
  const iWon = Math.random() < p;
  player.rivalHs = { year: gameYear(player) - 1, cup: choice.cup, teamWon: choice.teamWon, iWon, school: r.school };
  player.lastRivalHs = id + (iWon ? "Win" : "Lose");
  const team = choice.teamWon ? `${player.school} 승리` : `${r.school} 승리`;
  const duel = iWon ? `개인 맞대결은 ${player.name} 판정승` : `개인 맞대결은 ${r.name} 판정승`;
  const news = [`${choice.cup} 8강 ${team}… ${duel}`];
  if (id === "talk") {
    changeFame(player, iWon ? 3 : -1);
    if (!iWon) news.push(`${player.name} 경기 전 "${r.name}? 별로 신경 안 쓴다"… 경기 뒤 그 영상 재소환`);
  } else if (id === "head" && iWon) changeFame(player, 2);
  if (!iWon) player.nextMod = (player.nextMod || 0) + 1; // 자극받음
  return news;
}

// 프로에서 다시 만남 (nemesis.js nemesisSeason): 같은 1군 리그·다른 팀·투타가 엇갈리면 숙적 목록에 들어감
function rivalToNemesis(player, report) {
  const r = player.rival;
  const lg = report.league;
  if (!r || !player.nemeses) return;
  const n = player.nemeses.find((x) => x.rival);
  if (n) {
    if (n.status !== "active" && n.status !== "retired") return; // 우리 팀 합류·감독 등은 nemesis.js 가 관리
    // 라이벌이 옮기면 숙적 정보도 따라감
    n.league = r.league;
    n.team = r.team;
    n.ovr = getOvrs(r).best;
    n.age = r.age;
    if (r.retired && n.status === "active") {
      n.status = "retired";
      n.retiredYear = report.year;
    }
    return;
  }
  if (r.retired || r.league !== lg || r.team === report.team) return;
  const iBat = player.type !== "pitcher";
  const iPit = player.type !== "batter";
  const cross = (iBat && r.type === "pitcher") || (iPit && r.type === "batter");
  if (!cross) return;
  const hs = player.rivalHs;
  player.nemeses.push({
    id: `rival-${r.name}`,
    rival: true,
    name: r.name,
    league: lg,
    type: r.type,
    pos: r.position,
    team: r.team,
    age: r.age,
    ovr: getOvrs(r).best,
    aff: matchupAff(),
    stage: 1, // 처음부터 '신경 쓰임'
    tot: { PA: 0, H: 0, HR: 0, K: 0, BB: 0 },
    log: [],
    memory: hs ? `${hs.year}년 ${hs.cup} 8강 (${hs.iWon ? "그때는 내가 이김" : "그때는 내가 짐"})` : `고교 시절 ${r.school}`,
    revenge: !!(hs && !hs.iWon),
    status: "active",
    since: gameYear(player),
  });
  const when = hs ? `${hs.cup} 8강 이후 ${gameYear(player) - hs.year}년 만의 맞대결` : `${r.school} 졸업 후 첫 맞대결`;
  report.news.push(`고교 동기 ${r.name}${josaOf(r.name, "과")} ${LEAGUES[lg].name}에서 재회… ${when}`);
}

Object.assign(MAIL_SENDERS, {
  overuse: { from: "야구부", icon: "⚾", subject: "등판 관련" },
  grades: { from: "학교", icon: "📚", subject: "학생선수 학력 기준" },
  transfer: { from: "다른 학교 감독", icon: "🏫", subject: "전학 제안" },
  hlVideo: { from: "야구 유튜브 채널", icon: "📱", subject: "인터뷰 요청" },
  rivalHs: { from: "고교야구 중계팀", icon: "⚔️", subject: "라이벌 맞대결" },
});

Object.assign(FAN, {
  overuseThrow: ["고딩 팔 갈아 넣지 마라 진짜", "투혼은 멋진데 프로 가기 전에 팔 나간다", "감독이 애 망치네", "이게 고교야구 현실임"],
  overuseRest: ["잘 쉬었다 이게 맞음", "팔은 소모품이다", "스카우트들 이런 거 다 봄", "팀은 아쉽지만 현명함"],
  overuseHurt: ["결국 이렇게 됐네 ㅅㅂ", "감독 책임이다", "제발 재활 잘 해라", "혹사 규정 더 세게 해야 함"],
  gradesStudy: ["공부도 하는 야구선수 ㅇㅈ", "이게 맞지", "멋있네"],
  gradesTrain: ["야구선수가 야구 해야지", "출전 정지 먹으면 어쩌려고", "과감하네"],
  gradesFail: ["출전 정지 ㅋㅋㅋ 공부 좀 하지", "학력 기준 낮은데 그걸 못 넘냐", "내년엔 정신 차리자"],
  transferMove: ["강팀 가서 터져라", "모교 버렸네…", "프로 가려면 어쩔 수 없지", "전학생 제한 아깝다"],
  transferStay: ["의리 ㅇㅈ", "모교의 자랑", "이런 선수가 진짜 스타 됨", "약팀 에이스 낭만"],
  hlGood: ["이 선수 누구냐 진짜", "벌써 프로 체형이네", "드래프트 1라운드 각", "영상 10번 돌려봄"],
  hlBad: ["고딩이 벌써 건방지네", "실력은 인정하는데 말은 좀…", "프로 가서 보자"],
  hlQuiet: ["조용히 실력으로 ㅇㅈ", "이런 스타일 좋아"],
  rivalWin: ["{rival} 상대로 이겼다 ㅋㅋ", "동기 라이벌전 레전드", "프로 가서도 붙어라"],
  rivalLose: ["{rival}한테 졌네 ㅠ", "프로에서 갚아 줘라", "라이벌전은 원래 반반"],
});

function amateurPool(player, key) {
  if (key === "overuse") return player.lastOveruseHurt ? FAN.overuseHurt : player.lastOveruse === "rest" ? FAN.overuseRest : FAN.overuseThrow;
  if (key === "grades") return player.lastGradesFail ? FAN.gradesFail : player.lastGrades === "study" ? FAN.gradesStudy : FAN.gradesTrain;
  if (key === "transfer") return player.lastTransfer === "move" ? FAN.transferMove : FAN.transferStay;
  if (key === "hlVideo") return /Bad$/.test(player.lastHl || "") ? FAN.hlBad : player.lastHl === "quiet" ? FAN.hlQuiet : FAN.hlGood;
  if (key === "rivalHs") {
    const pool = /Win$/.test(player.lastRivalHs || "") ? FAN.rivalWin : FAN.rivalLose;
    const nm = player.rival ? player.rival.name : "라이벌";
    return pool.map((t) => t.replace("{rival}", nm)); // 반응 댓글엔 rival 값이 안 넘어가서 미리 채움
  }
  return null;
}

ACHIEVEMENTS.push(
  { id: "loyalSchool", group: "인생", name: "모교의 자랑", desc: "강팀 전학 제안을 뿌리치고 남음", check: (p) => !!p.loyalSchool },
  {
    id: "hsRival",
    group: "인생",
    name: "동기 라이벌",
    desc: "고교 라이벌과 프로에서 다시 만남",
    check: (p) => (p.nemeses || []).some((n) => n.rival && n.tot.PA > 0),
  },
);
