// =============================================
// flow.js : 각 시스템을 시즌 흐름에 연결하는 곳
// career.js runSeason 끝에서 afterSeason, resolveChoice 에서 resolveSideChoice,
// world.js teamStanding 에서 standingBonus, main.js reactionPool 에서 sidePool 부름
// 새 시스템 만들면 여기 한 줄 추가하면 됨
// =============================================

// 팀 승률 보정: 우승 전력 FA, 선수단 미팅, 신생구단
function standingBonus(player, team, lg, year) {
  let b = 0;
  if (team === player.team && player.contenderTeam === team) b += 0.04;
  if (player.lockerRally && player.lockerRally.team === team && player.lockerRally.year === year) b += 0.02;
  b += expansionPenalty(player, team, year);
  return b;
}

// 시즌 끝 (runSeason 마지막)
function afterSeason(player, report) {
  if (player.retired) return;
  // 몸·딜레마·라커룸·기록 사냥·시대 변화
  surgeryComeback(player, report);
  fixingInvestigation(player, report);
  if (player.banned) return; // 제명되면 다른 일은 없음
  maybeHiddenPain(player, report);
  maybeSurgeryChoice(player, report);
  maybeStyleChange(player, report);
  maybeConversion(player, report);
  maybeCoachPitch(player, report);
  lockerSeason(player, report);
  lockerSetup(player);
  maybeLockerEvent(player, report);
  legendEvents(player, report);
  const before = (report.bigMoments || []).length;
  recordHunt(player, report);
  if ((report.bigMoments || []).slice(before).some((m) => m.tone === "gold")) moreComments(player, report, FAN.record, 3);
  eraSeason(player, report);
  maybeFixingOffer(player, report);
  // 돈따라 이적 밈은 몇 년 따라다님
  if (player.moneyMeme && Math.random() < 0.35) moreComments(player, report, FAN.moneyMeme, 1);
  if (report.specials.some((s) => s.key === "reinjury")) moreComments(player, report, FAN.reinjury, 2);
  if (player.retired) return; // 위에서 은퇴했으면 여기까지

  // 카드·등번호·응원가·세레머니
  cardSeason(player, report); // 서포트 카드 이벤트·광고·여론 (cards.js)
  numberSeason(player, report); // 팀 옮기면 등번호 (fanfare.js)
  chantSeason(player, report); // 응원가 버전 업 (fanfare.js)
  ceremonySeason(player, report); // 마일스톤 세레머니 (ceremony.js)
  // 반응하는 세계
  fandomSeason(player, report); // 팀 팬심, 이적, 친정 야유 (fandom.js)
  memeSeason(player, report); // 밈 생기고·터지고·뒤집기 (meme.js)
  maybeSnsIssue(player, report); // 논란 메일 (sns.js)
}

function moreComments(player, report, pool, n) {
  if (!pool) return;
  report.comments = report.comments || [];
  for (const t of pickMany(pool, n)) report.comments.push(makeComment(t, player, { team: player.team, nick: player.nickname || "" }, "normal"));
}

// 선택지 처리 (career.js resolveChoice)
const SIDE_CHOICE_KEYS = ["sns", "hiddenPain", "fixing", "surgery", "styleChange", "convert", "coachPitch", "locker", "expansionDraft"];
function resolveSideChoice(player, choice, option) {
  switch (choice.key) {
    case "sns":
      return resolveSns(player, choice, option);
    case "hiddenPain":
      return resolveHiddenPain(player, choice, option);
    case "fixing":
      return resolveFixing(player, choice, option);
    case "surgery":
      return resolveSurgery(player, choice, option);
    case "styleChange":
      return resolveStyleChange(player, choice, option);
    case "convert":
      return resolveConversion(player, choice, option);
    case "coachPitch":
      return resolveCoachPitch(player, choice, option);
    case "locker":
      return resolveLocker(player, choice, option);
    case "expansionDraft":
      return resolveExpansionDraft(player, choice, option);
  }
  return [];
}

// 팬 반응 (main.js reactionPool 앞에서)
function sidePool(key, option, player) {
  const id = option.id;
  if (key === "sns") return snsPool(player); // 논란 대응별 (sns.js)
  if (key === "fa" && player.lastFaPath) return { money: FAN.moneyMove, home: FAN.homeTeam, win: FAN.winPath }[player.lastFaPath];
  if (key === "hiddenPain") return id === "hide" ? FAN.painHide : FAN.painTell;
  if (key === "fixing") return id === "report" ? FAN.fixReport : FAN.good; // 받거나 무시한 건 아무도 모름
  if (key === "surgery") return id === "surgery" ? FAN.surgery : FAN.rehab;
  if (key === "styleChange") return id === "change" ? FAN.styleChange : FAN.good;
  if (key === "convert") return id === "convert" ? FAN.convert : FAN.good;
  if (key === "coachPitch") return id === "learn" ? FAN.coachPitch : FAN.good;
  if (key === "locker") return FAN.locker;
  if (key === "expansionDraft") return FAN.expansion;
  return null;
}

// ---------------------------------------------
// 댓글 (약한 욕·요즘 말투 섞음, 특정 집단 비하는 안 씀)
// ---------------------------------------------
Object.assign(FAN, {
  banned: [
    "와 ㅅㅂ 진짜 실망이다",
    "영구제명 당연하지 야구판에서 꺼져라",
    "승부조작은 답 없다",
    "유니폼 태우러 간다",
    "응원했던 내가 호구였네",
    "이게 무슨 염병이냐",
    "존나 배신감 든다 진짜",
    "{team} 팬들 무슨 죄냐",
  ],
  moneyMove: [
    "결국 돈 따라가네 ㅋㅋ",
    "돈따라 이적 ㅇㅈ",
    "프로는 돈이지 근데 서운한 건 서운한 거다",
    "우리 팀 레전드 될 줄 알았는데 지랄",
    "응 니 연봉값 하는지 두고 보자",
    "돈 많이 받고 잘 살아라 ㅅㅂ",
    "이적 기자회견 웃는 거 보니까 개빡치네",
  ],
  moneyMeme: [
    "돈따라 이적 그 선수 맞음?",
    "ㄴ 그 돈값은 하는 중이냐",
    "돈따라 간 놈 오늘도 잘하네 ㅅㅂ 배아파",
    "몸값 생각하면 이 정도는 해야지",
    "친정 팀 상대로만 잘하는 거 국룰이냐",
  ],
  homeTeam: [
    "고향 팀 컴백 ㅠㅠ 낭만 미쳤다",
    "돈보다 고향 ㄹㅇ 낭만야구",
    "어릴 때 응원하던 팀이라니 눈물 난다",
    "이게 야구지 존나 멋있다",
    "고향 사람들 난리 났겠네 ㅋㅋ",
  ],
  winPath: ["반지 원정대 출발", "우승하러 갔네 인정", "돈보다 반지 ㅇㅈ", "저 팀 가면 우승 각 나오냐", "반지 끼고 오면 다 용서된다"],
  fixReport: ["이게 프로지 클린 베이스볼 ㅇㅈ", "신고한 거 존나 멋있다", "이런 선수가 많아야 함", "브로커 새끼들 다 잡아라", "인성 만렙 ㄷㄷ"],
  painHide: ["진통제 맞고 뛴다고? 투혼 미쳤다", "몸 아끼라고 ㅠㅠ", "ㅈ됐다 이거 내년에 탈난다", "멋있긴 한데 불안하다"],
  painTell: ["솔직하게 말한 거 잘했다", "팀 생각하는 선수", "아 아쉽다 그래도 몸이 우선", "빈자리 존나 크다 ㅠㅠ"],
  surgery: ["1년 쉬고 건강하게만 돌아와라", "토미존 받고 구속 오르는 거 아니냐 ㅋㅋ", "수술이 맞다 길게 봐야지", "재활 잘해라 기다린다"],
  rehab: ["재활로 버틴다고? 불안한데", "또 다치면 ㅈ된다 진짜", "빨리 보고 싶긴 하다", "의료진 말 좀 들어라 ㅠㅠ"],
  reinjury: ["또 거기냐 ㅅㅂ", "그러니까 수술하라니까", "재발은 ㄹㅇ 답 없다", "몸 관리 좀 하자 제발"],
  styleChange: ["나이 먹고 스타일 바꾸는 거 쉽지 않은데 응원함", "베테랑의 지혜 ㄷㄷ", "살아남는 놈이 강한 거다", "변신 성공하면 롱런각"],
  convert: ["전향이라니 ㄷㄷ 인생 걸었네", "성공하면 영화 한 편 나온다", "망하면 끝인데 존나 용기 있다", "이거 진짜 낭만이다"],
  coachPitch: ["신무기 장착 ㄷㄷ", "구종 하나 늘었네 타자들 ㅈ됐다", "코치님 일 잘한다", "캠프 영상 빨리 풀어라"],
  locker: ["라커룸 분위기 좋아 보이네", "선후배 사이 훈훈하다", "이런 고참 있어야 팀이 산다", "케미 미쳤다 ㅋㅋ"],
  expansion: ["창단 멤버 낭만 있다", "신생팀 가서 주전 먹어라", "보호선수 명단에서 뺀 거 실화냐 구단 지랄하네", "새 팀 유니폼 생각보다 예쁘네"],
  record: ["역사의 현장 ㄷㄷ", "기록 깨는 거 실시간으로 봤다", "와 이건 레전드다 진짜", "명예의 전당 예약", "{name} 미쳤다 ㅋㅋㅋ"],
  eraChange: ["리그 또 바뀌네", "기록 비교 이제 못 하겠다", "적응하는 놈이 이기는 거지", "KBO 일 좀 그만 벌여라"],
  era_bouncy: [
    "이거 완전 탱탱볼이네 ㅋㅋㅋ 플라이가 다 넘어감",
    "공 존나 날아간다 투수들 불쌍",
    "기록 인플레 ㅈ됐다 옛날 기록이랑 비교 불가",
    "탱탱볼 시즌 홈런왕은 별표 쳐라",
    "KBO 공인구 검사 다시 해라 염병",
    "ㄴ 반발계수 기준치 안이라는데?",
    "ㄴ 기준치 안이면 뭐함 체감이 다른데",
  ],
  era_deadball: ["공이 안 뻗는다 투고타저 오졌다", "홈런 보기 힘들어졌네", "타자들 기록 박살나겠다", "투수 놀음 시작이다"],
  era_abs: ["로봇 심판 존 넓힌 거 실화냐", "볼넷 실종 ㅋㅋ", "제구 좋은 투수들 신났네", "타자들 ABS 탓만 하겠다"],
  era_clock: ["투수 숨 넘어가겠다", "경기 빨라진 건 좋네", "피치클록 위반 또 나옴 ㅋㅋ", "타자 쪽이 유리해졌다던데"],
  era_foreign: ["용병 넷이면 국내 선수 자리 없겠네", "외국인 에이스만 3명 실화냐", "리그 수준 올라가긴 하겠다", "국내 타자들 ㅈ됐다"],
  era_normal: ["드디어 원래대로", "이제 좀 제대로 된 야구 하자", "몇 년 동안 뭐 한 거냐 KBO"],
});

// ---------------------------------------------
// 업적
// ---------------------------------------------
ACHIEVEMENTS.push(
  {
    id: "convertWin",
    group: "커리어",
    name: "인생 역전",
    desc: "투수↔타자 전향 후 WAR 3 이상 시즌",
    check: (p) => !!(p.converted && p.converted.from && p.history.some((h) => h.year >= p.converted.year && h.WAR >= 3)),
  },
  { id: "cleanBall", group: "인생", name: "클린 베이스볼", desc: "승부조작 제안 자진 신고", check: (p) => !!p.fixReported },
  {
    id: "recordHunter",
    group: "통산 기록",
    name: "기록 사냥꾼",
    desc: "KBO 역대 기록 하나 경신",
    check: (p) => Object.keys(p.recordsBroken || {}).length >= 1,
  },
  {
    id: "lockerLeader",
    group: "인생",
    name: "라커룸 리더",
    desc: "후배를 키우거나 선수단 미팅을 이끈 고참",
    check: (p) => (p.coachRep || 0) >= 3 || (p.meetings || 0) >= 3,
  },
  { id: "founding", group: "커리어", name: "창단 멤버", desc: "신생구단 창단 멤버", check: (p) => !!p.foundingMember },
  { id: "surgeryBack", group: "커리어", name: "수술 극복", desc: "수술 복귀 시즌 WAR 3 이상", check: (p) => !!p.surgeryComeback },
  { id: "styleShift", group: "커리어", name: "스타일 변신", desc: "30대에 플레이 스타일을 바꿈", check: (p) => !!p.styleShifted && p.styleShifted !== "keep" },
  { id: "homeTown", group: "인생", name: "고향의 품", desc: "FA로 고향 팀 입단", check: (p) => !!p.homeSigned },
  { id: "newPitch", group: "커리어", name: "신무기", desc: "코치에게 새 구종을 배움", check: (p) => (p.learnedPitches || 0) >= 1 },
);
