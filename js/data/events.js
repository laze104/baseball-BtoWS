// =============================================
// events.js : 국가대표 대회, 라이벌 이름, 인터뷰·사생활 이벤트, 별명 규칙
// when 은 "이럴 때 일어남" 조건임. 실제로 굴리는 코드는 systems 폴더 (national.js, rival.js, life.js, nickname.js)
// =============================================

// 국가대표 대회: years = 열리는 해, minAge/maxAge = 나이 제한
const NATIONAL_EVENTS = [
  { id: "u18", name: "U-18 청소년 야구월드컵", years: (y) => y % 2 === 1, minAge: 16, maxAge: 18, hsOnly: true },
  { id: "asian", name: "아시안게임", years: (y) => y % 4 === 2, maxAge: 25 },
  { id: "premier", name: "프리미어12", years: (y) => y % 4 === 3 },
  { id: "wbc", name: "WBC", years: (y) => y % 3 === 2 },
  { id: "olympic", name: "올림픽", years: (y) => y === 2028 || (y > 2028 && y % 4 === 0) },
];

const RIVAL_NAMES = ["강태오", "박현우", "이도윤", "최민재", "정우진", "한서준", "윤지호", "오승민", "서지훈", "임재원"];

const isBatter = (p) => p.type !== "pitcher";
const isPitcher = (p) => p.type !== "batter";

// 인터뷰·사생활 이벤트
// when: 일어날 수 있는 조건, options: 선택지 (fame = 팬 여론 변화)
// stats: 능력치 변화 (그 능력치가 있는 선수만), cost: 드는 돈(만원), flag: 상태 표시
const LIFE_EVENTS = [
  {
    id: "interviewBad",
    when: (p, r) => r.grade === "bad" && !isAmateur(p.league),
    text: '부진한 시즌 뒤 기자가 묻습니다. "올 시즌 가장 아쉬웠던 점은?"',
    options: [
      { id: "a", label: '"제 탓입니다. 더 노력하겠습니다"', fame: 10, news: '{name} "모두 제 탓"… 고개 숙인 인터뷰', mood: "good" },
      { id: "b", label: '"운이 좀 없었던 것 같아요"', fame: -8, news: '{name} "운이 없었다" 발언에 팬들 싸늘', mood: "bad" },
      { id: "c", label: '"기용 방식이 아쉬웠다"', fame: -15, nextMod: -1, news: "{name}, 감독 기용 공개 저격?… 더그아웃 분위기 냉랭", mood: "bad" },
    ],
  },
  {
    id: "interviewGood",
    when: (p, r) => r.grade === "great",
    text: '최고의 시즌을 보낸 뒤 방송 인터뷰. "팬들께 한마디 해주세요!"',
    options: [
      { id: "a", label: '"다 팬분들 덕분입니다!"', fame: 10, news: '{name} "팬들 덕분"… 겸손한 소감에 박수', mood: "good" },
      { id: "b", label: '"솔직히 제가 잘했죠 ㅎㅎ"', fame: -5, mental: 2, news: '{name} "내가 잘했다" 당당 소감… 호불호 갈려', mood: "bad" },
      { id: "c", label: '"다음 목표는 메이저리그!"', fame: 3, news: "{name}, MLB 도전 공개 선언", mood: "good" },
    ],
  },
  {
    id: "dating",
    when: (p) => p.age >= 21 && !p.dating && !p.married,
    text: "열애설 기사가 떴어요! 상대는 일반인이에요.",
    options: [
      { id: "a", label: "공개 연애 인정", fame: 5, flag: "dating", news: '{name} 열애 인정 "예쁘게 지켜봐 주세요"', mood: "good" },
      { id: "b", label: '"사생활은 노코멘트" (비공개 연애)', fame: 0, flag: "dating", news: '{name} 측 "사생활이라 확인 불가"', mood: "good" },
    ],
  },
  {
    id: "marriage",
    when: (p) => p.dating && !p.married && p.age >= 26,
    text: "오래 만난 연인과 결혼 이야기가 나와요.",
    options: [
      { id: "a", label: "결혼한다", fame: 8, mental: 3, flag: "married", news: '{name}, 시즌 끝나고 결혼… "가장으로서 더 책임감"', mood: "good" },
      { id: "b", label: "아직은 야구에 집중", fame: 0, news: '{name} "결혼은 아직, 야구가 먼저"', mood: "good" },
    ],
  },
  {
    id: "sns",
    when: (p) => !isAmateur(p.league),
    text: "SNS에 올린 글이 팬 비하 논란에 휩싸였어요.",
    options: [
      { id: "a", label: "바로 사과문 올리기", fame: -5, news: '{name}, SNS 논란 사과 "생각이 짧았다"', mood: "bad" },
      { id: "b", label: "무시하고 넘어가기", fame: -20, nextMod: -1, news: "{name}, SNS 논란에도 침묵… 여론 악화", mood: "bad" },
      { id: "c", label: "라이브 방송으로 해명", fame: "random", news: "{name}, 라이브 해명 방송… 반응은 엇갈려", mood: "bad" },
    ],
  },
  {
    id: "variety",
    when: (p) => !isAmateur(p.league) && (p.fame || 0) >= 20,
    text: "인기 예능 프로그램에서 출연 제의가 왔어요. 비시즌 촬영이라 훈련 시간이 줄어요.",
    options: [
      { id: "a", label: "출연한다 (출연료 + 인기)", fame: 15, money: 10000, nextMod: -1, news: "{name}, 예능 출연 화제… 반전 입담", mood: "good" },
      { id: "b", label: "거절하고 훈련", fame: 0, mental: 1, news: '{name}, 예능 제의 고사 "야구에만 집중"', mood: "good" },
    ],
  },
  {
    id: "ad",
    when: (p, r) => r.grade === "great" && (p.fame || 0) >= 30,
    text: "대기업 광고 모델 제의가 들어왔어요!",
    options: [
      { id: "a", label: "계약한다", fame: 5, money: 30000, news: "{name}, 광고 모델 발탁… 몸값 고공행진", mood: "good" },
      { id: "b", label: "정중히 거절", fame: 0, news: '{name}, 광고 제의 거절 "아직 보여줄 게 많다"', mood: "good" },
    ],
  },
  {
    id: "donation",
    when: (p) => (p.money || 0) >= 50000,
    text: "연말에 기부 요청이 들어왔어요.",
    options: [
      { id: "a", label: "재산 5% 기부", fame: 20, moneyRate: -0.05, news: "{name}, 소아암 환우에 거액 기부… 훈훈", mood: "good" },
      { id: "b", label: "조용히 넘어간다", fame: 0, news: "", mood: "good" },
    ],
  },
  {
    id: "fanservice",
    when: (p) => !isAmateur(p.league),
    text: "경기 후 어린이 팬이 사인을 부탁했는데, 너무 피곤한 상황이에요.",
    options: [
      { id: "a", label: "웃으면서 사인해준다", fame: 8, news: "{name}, 어린이 팬에 사인 + 기념사진… 미담 화제", mood: "good" },
      { id: "b", label: "그냥 지나친다", fame: -12, news: "{name}, 어린이 팬 사인 거절 영상 확산", mood: "bad" },
    ],
  },
  // ---------- 아마추어 ----------
  {
    id: "exam",
    when: (p) => isAmateur(p.league),
    text: "시험 기간이에요. 감독님은 야간 훈련을 하자고 하시고, 담임 선생님은 공부도 챙기라고 하세요.",
    options: [
      { id: "a", label: "공부도 챙긴다", fame: 3, mental: 1, news: "{name}, 성적표도 '올 A'?… 공부하는 야구선수", mood: "good" },
      { id: "b", label: "야구만 판다", fame: 0, nextMod: 1, news: "{name}, 시험 기간에도 배트 놓지 않았다", mood: "good" },
    ],
  },
  {
    id: "hazing",
    when: (p) => isAmateur(p.league) && p.age >= 17,
    text: "선배들이 후배들에게 부당한 얼차려를 주는 걸 봤어요.",
    options: [
      { id: "a", label: "나서서 막는다", fame: 8, mental: 1, news: "{name}, 후배 감싼 미담… '이런 선배가 진짜'", mood: "good" },
      { id: "b", label: "감독님께 조용히 알린다", fame: 4, news: "{name} 팀, 악습 없앴다", mood: "good" },
      { id: "c", label: "모른 척한다", fame: -3, news: "", mood: "bad" },
    ],
  },
  {
    id: "overuse",
    when: (p) => isAmateur(p.league) && isPitcher(p),
    text: "전국대회 8강, 감독님이 어제 100구를 던진 당신에게 또 등판하라고 해요.",
    options: [
      { id: "a", label: "던진다 (팀이 먼저)", fame: 3, stats: { stamina: -2, velocity: 1 }, news: "{name}, 이틀 연속 역투… 혹사 논란도", mood: "bad" },
      { id: "b", label: "트레이너와 상의해 쉰다", fame: -2, mental: 1, news: "{name}, 투구 수 관리로 휴식", mood: "good" },
    ],
  },
  {
    id: "youtubeHs",
    when: (p) => isAmateur(p.league),
    text: "구독자 100만 야구 유튜버가 '고교 최대어 인터뷰' 촬영을 제안했어요.",
    options: [
      { id: "a", label: "출연한다", fame: 6, news: "{name}, 유튜브 출연 화제… '실물이 더 크다'", mood: "good" },
      { id: "b", label: "아직은 조용히 야구만", fame: 0, mental: 1, news: "", mood: "good" },
    ],
  },
  {
    id: "collegeFest",
    when: (p) => p.league === "COLLEGE",
    text: "대학 축제 기간이에요. 동기들이 같이 놀자고 해요.",
    options: [
      { id: "a", label: "하루만 즐긴다", fame: 2, mental: 1, news: "", mood: "good" },
      { id: "b", label: "개인 훈련한다", fame: 0, nextMod: 1, news: "{name}, 축제 대신 실내 연습장… '프로 가서 놀겠다'", mood: "good" },
    ],
  },
  // ---------- 프로: 경기장 ----------
  {
    id: "umpire",
    when: (p) => !isAmateur(p.league),
    text: "결정적인 순간, 명백한 오심이 나왔어요. 판정 하나에 경기가 넘어갈 상황이에요.",
    options: [
      { id: "a", label: "강하게 항의한다", fame: 4, nextMod: -1, news: "{name}, 오심에 격한 항의 끝 퇴장… 출장 정지 징계", mood: "bad" },
      { id: "b", label: "꾹 참는다", fame: 2, mental: 1, news: "{name}, 오심에도 침착… '야구로 갚겠다'", mood: "good" },
    ],
  },
  {
    id: "benchClear",
    when: (p) => !isAmateur(p.league),
    text: "상대 투수의 몸쪽 공에 동료가 맞아 벤치클리어링이 벌어졌어요!",
    options: [
      { id: "a", label: "맨 앞에서 동료를 지킨다", fame: 6, nextMod: 1, news: "{name}, 벤치클리어링 앞장… '동료는 내가 지킨다'", mood: "good" },
      { id: "b", label: "말리는 역할을 한다", fame: 3, news: "{name}, 벤치클리어링 진화… 성숙한 대처", mood: "good" },
      { id: "c", label: "더그아웃에 있는다", fame: -4, news: "{name}, 벤치클리어링 때 혼자 더그아웃?", mood: "bad" },
    ],
  },
  {
    id: "formChange",
    when: (p) => !isAmateur(p.league) && isBatter(p) && p.type !== "twoway",
    text: "새로 온 타격코치가 타격 폼을 완전히 바꾸자고 해요.",
    options: [
      { id: "a", label: "새 폼으로 바꾼다", fame: 0, stats: { power: 3, contact: -1 }, nextMod: -1, news: "{name}, 비시즌 타격 폼 대수술", mood: "good" },
      { id: "b", label: "내 폼을 지킨다", fame: 0, mental: 1, news: '{name} "내 폼은 내가 제일 잘 안다"', mood: "good" },
    ],
  },
  {
    id: "newPitch",
    when: (p) => !isAmateur(p.league) && isPitcher(p) && p.type !== "twoway",
    text: "비시즌에 새 구종(스위퍼)을 장착할 기회가 생겼어요. 익히는 동안은 제구가 흔들릴 수 있어요.",
    options: [
      { id: "a", label: "신무기 장착", fame: 2, stats: { breaking: 3, control: -1 }, news: "{name}, 신무기 스위퍼 장착… 타자들 긴장", mood: "good" },
      { id: "b", label: "있는 공을 다듬는다", fame: 0, stats: { control: 1 }, news: "", mood: "good" },
    ],
  },
  {
    id: "bodyChange",
    when: (p) => !isAmateur(p.league),
    text: "비시즌 몸 만들기 방향을 정해야 해요.",
    options: [
      {
        id: "a",
        label: "10kg 벌크업",
        fame: 1,
        stats: { power: 2, velocity: 2, speed: -1, stamina: -1 },
        news: "{name}, 벌크업 성공… 몸이 달라졌다",
        mood: "good",
      },
      { id: "b", label: "8kg 감량", fame: 1, stats: { speed: 2, defense: 1, stamina: 2, power: -1 }, news: "{name}, 체중 감량으로 날렵해졌다", mood: "good" },
      { id: "c", label: "지금 몸 유지", fame: 0, news: "", mood: "good" },
    ],
  },
  {
    id: "drivelineUS",
    when: (p) => !isAmateur(p.league) && (p.money || 0) >= 10000,
    text: "미국 유명 트레이닝 센터에서 비시즌 개인 훈련을 받을 수 있어요. 비용은 꽤 들어요.",
    options: [
      {
        id: "a",
        label: "미국 훈련 간다",
        fame: 2,
        cost: 5000,
        stats: { velocity: 2, power: 2 },
        news: "{name}, 사비 들여 미국 훈련… '데이터로 다시 태어났다'",
        mood: "good",
      },
      { id: "b", label: "국내에서 훈련", fame: 0, news: "", mood: "good" },
    ],
  },
  {
    id: "mentor",
    when: (p) => !isAmateur(p.league) && p.age >= 29,
    text: "구단이 고졸 신인의 멘토가 되어 달라고 부탁해요.",
    options: [
      { id: "a", label: "기꺼이 맡는다", fame: 6, mental: 1, news: "{name}, 신인 멘토 자처… '내가 받은 걸 돌려줄 때'", mood: "good" },
      { id: "b", label: "내 몸 관리가 먼저", fame: -2, news: "", mood: "good" },
    ],
  },
  {
    id: "retireRumor",
    when: (p) => !isAmateur(p.league) && p.age >= 35,
    text: "은퇴설 기사가 났어요. 기자들이 은퇴 계획을 물어요.",
    options: [
      { id: "a", label: '"아직 보여줄 게 많다"', fame: 3, mental: 2, news: '{name} "은퇴? 아직 멀었다"… 현역 연장 의지', mood: "good" },
      { id: "b", label: '"올해가 마지막일 수도"', fame: 8, news: "{name}, 은퇴 시사… 팬들 '마지막까지 함께'", mood: "good" },
    ],
  },
  {
    id: "sickFan",
    when: (p) => !isAmateur(p.league),
    text: "투병 중인 어린이 팬이 '홈런(삼진) 하나만 보여주세요'라는 편지를 보냈어요.",
    options: [
      { id: "a", label: "병원에 직접 찾아간다", fame: 10, mental: 1, news: "{name}, 투병 중인 어린이 팬 병문안… 사인볼 선물", mood: "good" },
      { id: "b", label: "약속하고 경기에서 보여준다", fame: 6, nextMod: 1, news: "{name}, 어린이 팬과의 약속 지켰다", mood: "good" },
    ],
  },
  // ---------- 프로: 경기장 밖 ----------
  {
    id: "teamDinner",
    when: (p) => !isAmateur(p.league) && (p.money || 0) >= 5000,
    text: "시즌 끝, 고생한 동료와 스태프들에게 회식을 쏠까요?",
    options: [
      { id: "a", label: "통 크게 쏜다", fame: 4, cost: 1500, mental: 1, news: "{name}, 선수단 전체 회식 쐈다… '다들 고생 많았다'", mood: "good" },
      { id: "b", label: "다음에", fame: 0, news: "", mood: "good" },
    ],
  },
  {
    id: "littleLeague",
    when: (p) => !isAmateur(p.league) && (p.money || 0) >= 5000,
    text: "고향 리틀야구단이 장비가 낡아 어렵다는 소식을 들었어요.",
    options: [
      { id: "a", label: "장비 일체 기부", fame: 8, cost: 2000, news: "{name}, 고향 리틀야구단에 장비 기부… '나도 여기서 시작했다'", mood: "good" },
      { id: "b", label: "사인볼만 보낸다", fame: 2, news: "", mood: "good" },
    ],
  },
  {
    id: "rumor",
    when: (p) => !isAmateur(p.league) && (p.fame || 0) >= 10,
    text: "근거 없는 악성 루머가 온라인에 퍼지고 있어요.",
    options: [
      { id: "a", label: "법적 대응", fame: 5, cost: 1000, news: "{name} 측, 악성 루머 유포자 고소… '선처 없다'", mood: "good" },
      { id: "b", label: "무시한다", fame: -6, nextMod: -1, news: "{name}, 루머에 침묵… 의혹만 커져", mood: "bad" },
    ],
  },
  {
    id: "lateNight",
    when: (p) => !isAmateur(p.league) && p.age >= 21,
    text: "원정 경기 전날 새벽, 동료들이 술자리에 가자고 해요.",
    options: [
      { id: "a", label: "숙소에서 쉰다", fame: 0, mental: 1, news: "", mood: "good" },
      { id: "b", label: "잠깐만 따라간다", fame: -10, nextMod: -1, news: "{name}, 원정 전날 새벽 술자리 목격담… 구단 '경위 파악 중'", mood: "bad" },
    ],
  },
  {
    id: "channel",
    when: (p) => !isAmateur(p.league) && (p.fame || 0) >= 15,
    text: "개인 유튜브 채널을 열자는 제안이 왔어요. 수익은 쏠쏠하지만 시간이 들어요.",
    options: [
      { id: "a", label: "채널 개설", fame: "random", money: 5000, nextMod: -1, news: "{name}, 개인 유튜브 개설… 첫 영상 조회수 폭발", mood: "good" },
      { id: "b", label: "야구에 집중", fame: 0, mental: 1, news: "", mood: "good" },
    ],
  },
  {
    id: "fanMeeting",
    when: (p) => !isAmateur(p.league) && (p.fame || 0) >= 25,
    text: "팬클럽이 비시즌 팬미팅을 열어 달라고 요청했어요.",
    options: [
      { id: "a", label: "직접 준비해서 연다", fame: 10, cost: 1000, news: "{name}, 첫 단독 팬미팅 매진… 팬들과 눈물의 시간", mood: "good" },
      { id: "b", label: "사인회 정도만", fame: 4, news: "", mood: "good" },
    ],
  },
  {
    id: "baby",
    when: (p) => p.married && !p.kids,
    text: "아내가 임신 소식을 전했어요! 출산 예정일이 시즌 중이에요.",
    options: [
      { id: "a", label: "출산 휴가를 쓴다", fame: 8, mental: 2, flag: "kids", news: "{name}, 경조사 휴가로 출산 지켜… '아빠가 됐다'", mood: "good" },
      {
        id: "b",
        label: "경기 끝나고 달려간다",
        fame: 3,
        mental: 1,
        flag: "kids",
        nextMod: 1,
        news: "{name}, 경기 끝나자마자 병원으로… '분유 버프' 기대",
        mood: "good",
      },
    ],
  },
  {
    id: "pet",
    when: (p) => !p.pet && !isAmateur(p.league),
    text: "숙소 근처에서 떠돌던 강아지가 계속 따라와요.",
    options: [
      { id: "a", label: "입양한다", fame: 5, mental: 1, flag: "pet", news: "{name}, 유기견 입양… SNS에 '반려견 자랑' 폭주", mood: "good" },
      { id: "b", label: "보호소에 연락한다", fame: 1, news: "", mood: "good" },
    ],
  },
  {
    id: "charityGame",
    when: (p) => !isAmateur(p.league) && (p.fame || 0) >= 5,
    text: "연말 자선 야구대회에 초대받았어요. 비시즌 휴식이 조금 줄어요.",
    options: [
      { id: "a", label: "참가한다", fame: 6, news: "{name}, 자선 야구대회 참가… 수익금 전액 기부", mood: "good" },
      { id: "b", label: "휴식을 택한다", fame: -1, news: "", mood: "good" },
    ],
  },
  {
    id: "hometown",
    when: (p) => !isAmateur(p.league) && p.age >= 25,
    text: "모교에서 후배들 앞에서 특강을 해 달라고 해요.",
    options: [
      { id: "a", label: "모교를 찾아간다", fame: 5, news: "{name}, 모교 {school} 특강… '꿈은 도망가지 않는다'", mood: "good" },
      { id: "b", label: "영상 메시지로 대신", fame: 1, news: "", mood: "good" },
    ],
  },
];

// 별명 규칙: 위에 있을수록 우선
const NICKNAME_RULES = [
  { nick: "국민타자", when: (p) => p.type !== "pitcher" && countAward(p, "MVP") >= 2 },
  { nick: "국민투수", when: (p) => p.type === "pitcher" && countAward(p, "MVP") >= 2 },
  { nick: "한국의 이도류", when: (p) => p.type === "twoway" && p.bestOvr >= 65 },
  { nick: "{team}의 심장", when: (p) => p.franchise && p.franchise === p.team },
  { nick: "먹튀", when: (p, r) => p.contract && p.contract.isFA && p.contract.total >= 500000 && r.WAR < 1 },
  { nick: "태극전사", when: (p) => countAward(p, "메달") >= 3 },
  { nick: "가을 사나이", when: (p) => countAward(p, "시리즈 우승") >= 2 },
  { nick: "괴물", when: (p, r) => (r.bat && r.bat.HR >= 40) || (r.pit && r.pit.ERA <= 2 && r.pit.outs >= 450) },
  { nick: "닥터 K", when: (p, r) => r.pit && r.pit.K >= 200 },
  { nick: "수호신", when: (p, r) => r.pit && r.pit.SV >= 30 },
  { nick: "타격기계", when: (p, r) => r.bat && r.bat.PA >= 400 && r.bat.AVG >= 0.33 },
  { nick: "대도", when: (p, r) => r.bat && r.bat.SB >= 30 },
  { nick: "유리몸", when: (p) => p.history.filter((h) => h.events.includes("부상")).length >= 3 },
  { nick: "방화범", when: (p, r) => r.pit && r.pit.outs >= 90 && r.pit.ERA >= 6 },
  { nick: "볼넷 제조기", when: (p, r) => r.pit && r.pit.outs >= 90 && (r.pit.BB * 27) / r.pit.outs >= 5 },
  { nick: "선풍기", when: (p, r) => r.bat && r.bat.PA >= 200 && r.bat.K / r.bat.PA >= 0.28 },
  { nick: "자동아웃", when: (p, r) => r.bat && r.bat.PA >= 200 && r.bat.AVG < 0.22 },
  { nick: "{school}의 자랑", when: (p) => p.league === "HS" && hsTitles(p) >= 2 },
];
