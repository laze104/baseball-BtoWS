// =============================================
// data.js : 게임에 쓰이는 고정 데이터 모음
// 이름이나 숫자를 바꾸고 싶으면 이 파일만 수정
// =============================================

// 능력치 이름표 (코드에서는 영어 키, 화면에는 한글)
const BATTER_STATS = {
  contact: "컨택",
  power: "파워",
  eye: "선구",
  speed: "주루",
  defense: "수비",
  arm: "송구",
  clutch: "클러치",
};

const PITCHER_STATS = {
  velocity: "구속",
  control: "제구",
  breaking: "변화",
  stamina: "체력",
  mental: "멘탈",
  fielding: "수비",
  stuff: "구위",
};

// 유형별 포지션 목록
const POSITIONS = {
  batter: ["포수", "1루수", "2루수", "3루수", "유격수", "외야수"],
  pitcher: ["선발", "불펜"],
  twoway: ["선발 겸 외야수", "선발 겸 1루수", "불펜 겸 외야수"],
};

// 플레이 스타일: 숫자가 클수록 그 능력치에 포인트가 더 많이 배분됨 (기본 1)
const STYLES = {
  batter: {
    "교타자": { contact: 1.5, eye: 1.4 },
    "거포": { power: 1.8 },
    "호타준족": { speed: 1.5, power: 1.3 },
    "수비형": { defense: 1.5, arm: 1.4 },
  },
  pitcher: {
    "파이어볼러": { velocity: 1.8 },
    "제구형": { control: 1.8 },
    "기교파": { breaking: 1.8 },
    "이닝이터": { stamina: 1.8 },
  },
  twoway: {
    "이도류": {}, // 특별한 보너스 없음. 대신 14개 능력치에 280을 나눠 가짐
  },
};

// 시작 능력치 총합
const START_TOTAL = 280;

// 고등학교 목록 (level 3 = 전통 강호, 2 = 강팀, 1 = 중위권)
const HIGH_SCHOOLS = [
  // level 3
  { name: "덕수고", level: 3 },
  { name: "서울고", level: 3 },
  { name: "휘문고", level: 3 },
  { name: "장충고", level: 3 },
  { name: "충암고", level: 3 },
  { name: "경남고", level: 3 },
  { name: "부산고", level: 3 },
  { name: "경북고", level: 3 },
  { name: "대구고", level: 3 },
  { name: "광주제일고", level: 3 },
  { name: "천안북일고", level: 3 },
  { name: "인천고", level: 3 },
  // level 2
  { name: "신일고", level: 2 },
  { name: "배재고", level: 2 },
  { name: "선린인터넷고", level: 2 },
  { name: "유신고", level: 2 },
  { name: "야탑고", level: 2 },
  { name: "동산고", level: 2 },
  { name: "마산용마고", level: 2 },
  { name: "세광고", level: 2 },
  { name: "대전고", level: 2 },
  { name: "강릉고", level: 2 },
  { name: "상원고", level: 2 },
  { name: "군산상일고", level: 2 },
  { name: "개성고", level: 2 },
  { name: "진흥고", level: 2 },
  // level 1
  { name: "배명고", level: 1 },
  { name: "성남고", level: 1 },
  { name: "경기상고", level: 1 },
  { name: "중앙고", level: 1 },
  { name: "장안고", level: 1 },
  { name: "안산공고", level: 1 },
  { name: "제물포고", level: 1 },
  { name: "청주고", level: 1 },
  { name: "공주고", level: 1 },
  { name: "원주고", level: 1 },
  { name: "경주고", level: 1 },
  { name: "마산고", level: 1 },
  { name: "전주고", level: 1 },
  { name: "화순고", level: 1 },
];

// 포지션별로 OVR 계산 때 더 중요하게 보는 능력치 (2배로 계산)
const POSITION_FOCUS = {
  "포수": ["defense", "arm"],
  "1루수": ["power", "contact"],
  "2루수": ["defense", "contact"],
  "3루수": ["arm", "power"],
  "유격수": ["defense", "arm"],
  "외야수": ["speed", "arm"],
  "선발": ["stamina", "control"],
  "불펜": ["velocity", "mental"],
};

// =============================================
// 3단계: 리그와 팀
// level = 그 리그 상대 선수들의 평균 능력치 (높을수록 어려움)
// games = 한 시즌 팀 경기 수
// =============================================
const LEAGUES = {
  HS:   { name: "고교야구",   level: 35, games: 30 },
  INDIE:{ name: "독립리그",   level: 42, games: 60 },
  ABL:  { name: "호주리그",   level: 47, games: 40 }, // 11~1월 겨울 리그
  KBO2: { name: "퓨처스리그", level: 48, games: 100 },
  KBO:  { name: "KBO 리그",   level: 58, games: 144 },
  NPB:  { name: "NPB",        level: 64, games: 143 },
  MLB:  { name: "MLB",        level: 70, games: 162 },
};

const TEAMS = {
  KBO: ["KIA 타이거즈", "삼성 라이온즈", "LG 트윈스", "두산 베어스", "KT 위즈",
        "SSG 랜더스", "롯데 자이언츠", "한화 이글스", "NC 다이노스", "키움 히어로즈"],
  NPB: ["요미우리 자이언츠", "한신 타이거스", "소프트뱅크 호크스", "오릭스 버펄로스",
        "지바 롯데 마린스", "주니치 드래건스", "야쿠르트 스왈로스", "라쿠텐 이글스"],
  MLB: ["LA 다저스", "뉴욕 양키스", "샌디에이고 파드리스", "샌프란시스코 자이언츠",
        "시애틀 매리너스", "토론토 블루제이스", "보스턴 레드삭스", "시카고 컵스"],
  INDIE: ["연천 미라클", "파주 챌린저스", "성남 맥파이스"],
  ABL: ["애들레이드 자이언츠", "브리즈번 밴디츠", "캔버라 캐벌리", "멜버른 에이시스", "퍼스 히트", "시드니 블루삭스"],
};

// 우승 이름
const CHAMPIONSHIP = {
  HS: "전국고교대회 우승",
  KBO: "한국시리즈 우승",
  NPB: "재팬시리즈 우승",
  MLB: "월드시리즈 우승",
  ABL: "클랙스턴 실드 우승", // 호주리그 우승 트로피
};

// =============================================
// 기사 제목 템플릿: {name} 같은 칸에 실제 값이 들어감
// =============================================
const NEWS = {
  batter: {
    great: ["{name}, 시즌 {HR}홈런·타율 {AVG}… 리그 최고 타자 반열",
            "'괴물 타자' {name}, {team} 타선의 중심으로 우뚝",
            "{name} OPS {OPS}, 올 시즌 가장 무서운 타자"],
    good:  ["{name}, 타율 {AVG}로 시즌 마무리… 꾸준함 증명",
            "{team} {name}, {HR}홈런 {RBI}타점으로 제 몫 해냈다"],
    bad:   ["{name}, 타율 {AVG} 부진… 반등 절실",
            "{team} {name}, 기대 못 미친 시즌… 내년이 고비"],
  },
  pitcher: {
    great: ["{name}, 평균자책점 {ERA}… 리그를 지배한 에이스",
            "{name} 탈삼진 {K}개, 마운드 위의 폭군",
            "'언터처블' {name}, {team} 마운드의 기둥"],
    good:  ["{name}, {W}승 평균자책점 {ERA}… 든든한 한 시즌",
            "{team} {name}, 마운드에 안정감 더했다"],
    bad:   ["{name}, 평균자책점 {ERA}로 고전… 제구 숙제",
            "흔들린 {name}, 내년엔 달라질 수 있을까"],
  },
  special: {
    draft: "{team}, {round}라운드에서 {school} {name} 지명… 계약금 {bonus}",
    draftTop: "'최대어' {name}, {team} 1라운드 지명… 계약금 {bonus}",
    undrafted: "{name}, 드래프트 미지명… 다시 일어설 수 있을까",
    callup: "{name}, 드디어 1군 콜업! {team} 합류",
    demote: "{name}, 2군행 통보… 재정비 필요",
    award: "{name}, {award} 수상!",
    champion: "{team} {award}! {name} 우승 반지 품었다",
    national: "{name}, {event} 대표팀 승선… 태극마크 단다",
    nationalCall: "{event} 예비 명단 발표… {name} 이름 올렸다",
    medal: "{name} 맹활약! 대한민국 {award}",
    nationalFail: "{event} 대표팀 조기 탈락… {name}도 고개 숙여",
    shopping: "{name}, {item} 마련 화제",
    overseas: "{name}, {team|과} {years}년 총액 {total} 계약… 꿈의 무대로",
    uturn: "{name}, 해외 팀에서 방출… 국내 복귀 타진",
    fa: "{name}, {team|과} {years}년 총액 {total} FA 계약… 새 출발",
    stay: "{name}, {team} 잔류… {years}년 총액 {total} '여기서 끝까지'",
    injury: "{name}, 부상으로 한동안 이탈",
    awaken: "{name} 각성했다! 올 시즌 완전히 달라진 모습",
    twowayAwaken: "만화가 현실로… {name}, 투타 모두 리그 정상급",
    focus: "{name}, 이도류 내려놓고 {side} 전념 선언",
    retire: "{name}, 정든 그라운드와 작별… 은퇴 선언",
  },
};

// 팬 댓글 (욕설 없이, 성적에 대한 놀림은 OK)
const FAN = {
  great: ["이 정도면 그냥 리그 씹어먹는 중", "{name} 없었으면 팀 어쩔 뻔했냐",
          "올해 연봉 협상 볼만하겠네 ㅋㅋ", "얘 보려고 직관 간다 진짜",
          "솔직히 처음엔 기대 안 했는데 미안하다", "영구결번 각 나온다"],
  good:  ["나쁘지 않네 내년이 기대됨", "딱 밥값은 했다", "아직 다듬을 게 많지만 가능성 보임",
          "꾸준한 게 제일 무서운 거임", "이 정도면 합격"],
  batterBad: ["선풍기 돌리러 왔냐", "자동아웃 머신 또 출격", "타석 들어서면 화장실 가는 타이밍",
              "연봉 루팡 확정", "이 정도면 2군이 맞다", "방망이를 거꾸로 잡은 듯"],
  pitcherBad: ["불 지르러 올라왔냐", "방화범 출근했다", "볼볼볼볼 볼넷 장인",
               "얘 나오면 채널 돌림", "배팅볼 투수 아님?", "감독은 무슨 생각으로 계속 쓰냐"],
  draft: ["드디어 왔구나 기대된다", "{round}라운드면 나쁘지 않지", "육성만 잘하면 대박 날 듯"],
  undrafted: ["아깝다 ㅠㅠ 독립리그에서 증명해라", "여기서 포기하면 안 됨", "늦게 피는 꽃도 있다"],
  callup: ["드디어 1군!! 가즈아", "1군 공은 다를 텐데 버틸 수 있으려나", "콜업 축하한다 ㅠㅠ"],
  overseas: ["가서 국위선양 하고 와라", "거기서도 통할까? 궁금하다", "결국 해냈구나 ㄷㄷ"],
  twoway: ["이도류 진짜 되는 거였냐 ㄷㄷ", "만화 주인공 실존", "투타 둘 다 되는 게 말이 됨?"],
  injury: ["몸 관리 좀 하자 ㅠㅠ", "유리몸 소리 듣기 싫으면 빨리 돌아와라"],
  retire: ["수고 많았다 진짜", "덕분에 야구 볼 맛 났다", "은퇴식 꼭 간다"],
};

// =============================================
// 4. 돈, 국가대표, 커뮤니티 (기획서 추가 사항)
// =============================================

const START_YEAR = 2026; // 16세 = 2026년
const INFLATION = 0.03;  // 매년 물가 3%씩 오름

// 금액은 모두 "만원" 단위, 2026년 기준 (물가에 따라 자동으로 오름)
const MONEY = {
  kboMin: 3000,           // KBO 최저연봉
  futuresMin: 3000,
  indieSalary: 1200,
  ablSalary: 1200,        // 호주리그 외국인 선수: 시즌 3개월 + 숙소 제공
  mlbMin: 110000,         // MLB 최저연봉 약 76만 달러 ≈ 11억
  draftBonus: [50000, 20000, 12000, 9000, 7000, 6000, 5000, 4500, 4000, 3500, 3000], // 1~11라운드 계약금
};

// 살 수 있는 것들 (effect: 게임에 주는 효과)
const SHOP_ITEMS = [
  { id: "oneroom",   name: "원룸 전세",          price: 15000,  desc: "숙소 탈출. 마음이 편해져요.", effect: { mental: 1 } },
  { id: "car",       name: "국산 SUV",           price: 5000,   desc: "출퇴근이 편해졌어요." },
  { id: "trainer",   name: "개인 트레이너 계약",  price: 8000,   desc: "집중 훈련 성장 +1", effect: { focusBonus: 1 } },
  { id: "rehab",     name: "전담 재활 트레이너",  price: 12000,  desc: "부상 확률 절반", effect: { injuryHalf: true } },
  { id: "parents",   name: "부모님 집 선물",      price: 60000,  desc: "효도 완료. 팬들이 좋아해요.", effect: { fame: true } },
  { id: "apartment", name: "수도권 아파트",       price: 120000, desc: "내 집 마련 성공!" },
  { id: "supercar",  name: "수입 스포츠카",       price: 35000,  desc: "팬들 반응이 갈려요." },
  { id: "gangnam",   name: "강남 아파트",         price: 400000, desc: "야구로 강남 입성." },
  { id: "building",  name: "건물주 되기",         price: 1500000,desc: "은퇴 후도 걱정 없음." },
  { id: "academy",   name: "유소년 야구 아카데미", price: 300000, desc: "후배 양성. 은퇴 후 명예 +", effect: { fame: true } },
];

// 국가대표 대회: years = 열리는 해, minAge/maxAge = 나이 제한
const NATIONAL_EVENTS = [
  { id: "u18",     name: "U-18 청소년 야구월드컵", years: (y) => y % 2 === 1, minAge: 16, maxAge: 18, hsOnly: true },
  { id: "asian",   name: "아시안게임",   years: (y) => y % 4 === 2, maxAge: 25 },
  { id: "premier", name: "프리미어12",   years: (y) => y % 4 === 3 },
  { id: "wbc",     name: "WBC",          years: (y) => y % 3 === 2 },
  { id: "olympic", name: "올림픽",       years: (y) => y === 2028 || (y > 2028 && y % 4 === 0) },
];

// 커뮤니티 닉네임 (유동 = ㅇㅇ + IP 일부, 고정닉은 이름)
const NICKS = ["ㅇㅇ", "ㅇㅇ", "ㅇㅇ", "ㅇㅇ", "야갤러", "직관러", "엘지팬30년차", "타격코치지망생",
  "세이버충", "스탯은거짓말안함", "불펜방화범박멸", "야구는9회말부터", "홈런볼수집가", "응원단장",
  "통계맨", "만년꼴찌팬", "치맥러", "외야석3루", "새벽야구", "스카우터아님"];

// 댓글 추가 묶음 (FAN에 합쳐서 씀)
Object.assign(FAN, {
  great: FAN.great.concat([
    "이게 내가 알던 그 선수 맞냐", "올해 MVP 아니면 투표인단 다 바꿔야 됨", "중계 보다가 소리 질렀다 ㄹㅇ",
    "{name} 유니폼 품절이래 ㅋㅋㅋ", "이 정도면 해외에서 데려가도 할 말 없음", "레전드의 시작을 보고 있는 중",
    "작년에 까던 놈들 다 어디 감?", "{team} 프런트 일 잘했네 진짜", "제발 오래만 해다오",
  ]),
  good: FAN.good.concat([
    "평타 이상은 쳤다", "내년에 한 단계만 더 올라가자", "기복만 줄이면 국대급", "솔직히 기대 이상",
    "이 정도면 연봉 좀 올려줘라", "팀에 꼭 필요한 선수", "슬슬 포텐 터지는 느낌",
  ]),
  batterBad: FAN.batterBad.concat([
    "삼진 먹고 들어올 때 표정이 더 웃김", "득점권에서 병살 장인", "타율이 투수 방어율 수준",
    "이게 프로 맞냐 사회인야구 아님?", "타석 들어가면 상대 투수가 웃는다", "올해 연봉 반납해라",
    "내가 쳐도 저거보단 잘 치겠다", "제발 번트라도 대라",
  ]),
  pitcherBad: FAN.pitcherBad.concat([
    "공 던질 때마다 심장이 철렁함", "볼넷 주고 홈런 맞고 무한 반복", "이닝 끝날 때까지 밥 한 끼 먹고 옴",
    "상대 타자들 회식 시켜주는 중", "직구가 배팅볼보다 느려 보임", "올라오자마자 불펜 몸 풀더라",
  ]),
  national: ["태극마크 축하한다!!", "국대에서 한 건 해주라", "가서 다치지만 말고 와라", "드디어 국대급 인정"],
  nationalSkip: ["국대 거절은 좀 아쉽다", "팀 생각하는 건 좋은데 흠…", "몸 관리 차원이면 이해함", "애국심 어디 감?"],
  medal: ["금메달 미쳤다 ㄷㄷ", "국가가 인정한 선수", "이번 대회 MVP는 무조건 {name}"],
  contract: ["돈 많이 받았네 이제 몸값 하자", "이 계약 먹튀 되면 레전드 짤 나온다", "계약 축하! 오래 같이 가자", "총액 보고 눈 비볐다"],
  shopping: ["{item} 샀대 ㅋㅋㅋ 부럽다", "야구 잘하니까 {item}도 사네", "그 돈으로 타격 연습이나 하지", "성공한 덕후 아니 성공한 선수"],
});

// =============================================
// 5. 병역, 라이벌, 별명, 인터뷰·사생활
// =============================================

LEAGUES.SANGMU = { name: "상무 (퓨처스리그)", level: 48, games: 100 };
LEAGUES.SOCIAL = { name: "사회복무", level: 0, games: 0 };
MONEY.sangmuSalary = 2400;  // 병사 급여 수준 (연)
MONEY.socialSalary = 1500;

const RIVAL_NAMES = ["강태오", "박현우", "이도윤", "최민재", "정우진", "한서준", "윤지호", "오승민", "서지훈", "임재원"];

// 인터뷰·사생활 이벤트
// when: 일어날 수 있는 조건, options: 선택지 (fame = 팬 여론 변화)
const LIFE_EVENTS = [
  {
    id: "interviewBad", when: (p, r) => r.grade === "bad" && !isAmateur(p.league),
    text: "부진한 시즌 뒤 기자가 묻습니다. \"올 시즌 가장 아쉬웠던 점은?\"",
    options: [
      { id: "a", label: "\"제 탓입니다. 더 노력하겠습니다\"", fame: 10, news: "{name} \"모두 제 탓\"… 고개 숙인 인터뷰", mood: "good" },
      { id: "b", label: "\"운이 좀 없었던 것 같아요\"", fame: -8, news: "{name} \"운이 없었다\" 발언에 팬들 싸늘", mood: "bad" },
      { id: "c", label: "\"기용 방식이 아쉬웠다\"", fame: -15, nextMod: -1, news: "{name}, 감독 기용 공개 저격?… 더그아웃 분위기 냉랭", mood: "bad" },
    ],
  },
  {
    id: "interviewGood", when: (p, r) => r.grade === "great",
    text: "최고의 시즌을 보낸 뒤 방송 인터뷰. \"팬들께 한마디 해주세요!\"",
    options: [
      { id: "a", label: "\"다 팬분들 덕분입니다!\"", fame: 10, news: "{name} \"팬들 덕분\"… 겸손한 소감에 박수", mood: "good" },
      { id: "b", label: "\"솔직히 제가 잘했죠 ㅎㅎ\"", fame: -5, mental: 2, news: "{name} \"내가 잘했다\" 당당 소감… 호불호 갈려", mood: "bad" },
      { id: "c", label: "\"다음 목표는 메이저리그!\"", fame: 3, news: "{name}, MLB 도전 공개 선언", mood: "good" },
    ],
  },
  {
    id: "dating", when: (p) => p.age >= 21 && !p.dating && !p.married,
    text: "열애설 기사가 떴어요! 상대는 일반인이에요.",
    options: [
      { id: "a", label: "공개 연애 인정", fame: 5, flag: "dating", news: "{name} 열애 인정 \"예쁘게 지켜봐 주세요\"", mood: "good" },
      { id: "b", label: "\"사생활은 노코멘트\" (비공개 연애)", fame: 0, flag: "dating", news: "{name} 측 \"사생활이라 확인 불가\"", mood: "good" },
    ],
  },
  {
    id: "marriage", when: (p) => p.dating && !p.married && p.age >= 26,
    text: "오래 만난 연인과 결혼 이야기가 나와요.",
    options: [
      { id: "a", label: "결혼한다", fame: 8, mental: 3, flag: "married", news: "{name}, 시즌 끝나고 결혼… \"가장으로서 더 책임감\"", mood: "good" },
      { id: "b", label: "아직은 야구에 집중", fame: 0, news: "{name} \"결혼은 아직, 야구가 먼저\"", mood: "good" },
    ],
  },
  {
    id: "sns", when: (p) => !isAmateur(p.league),
    text: "SNS에 올린 글이 팬 비하 논란에 휩싸였어요.",
    options: [
      { id: "a", label: "바로 사과문 올리기", fame: -5, news: "{name}, SNS 논란 사과 \"생각이 짧았다\"", mood: "bad" },
      { id: "b", label: "무시하고 넘어가기", fame: -20, nextMod: -1, news: "{name}, SNS 논란에도 침묵… 여론 악화", mood: "bad" },
      { id: "c", label: "라이브 방송으로 해명", fame: "random", news: "{name}, 라이브 해명 방송… 반응은 엇갈려", mood: "bad" },
    ],
  },
  {
    id: "variety", when: (p) => !isAmateur(p.league) && (p.fame || 0) >= 20,
    text: "인기 예능 프로그램에서 출연 제의가 왔어요. 비시즌 촬영이라 훈련 시간이 줄어요.",
    options: [
      { id: "a", label: "출연한다 (출연료 + 인기)", fame: 15, money: 10000, nextMod: -1, news: "{name}, 예능 출연 화제… 반전 입담", mood: "good" },
      { id: "b", label: "거절하고 훈련", fame: 0, mental: 1, news: "{name}, 예능 제의 고사 \"야구에만 집중\"", mood: "good" },
    ],
  },
  {
    id: "ad", when: (p, r) => r.grade === "great" && (p.fame || 0) >= 30,
    text: "대기업 광고 모델 제의가 들어왔어요!",
    options: [
      { id: "a", label: "계약한다", fame: 5, money: 30000, news: "{name}, 광고 모델 발탁… 몸값 고공행진", mood: "good" },
      { id: "b", label: "정중히 거절", fame: 0, news: "{name}, 광고 제의 거절 \"아직 보여줄 게 많다\"", mood: "good" },
    ],
  },
  {
    id: "donation", when: (p) => (p.money || 0) >= 50000,
    text: "연말에 기부 요청이 들어왔어요.",
    options: [
      { id: "a", label: "재산 5% 기부", fame: 20, moneyRate: -0.05, news: "{name}, 소아암 환우에 거액 기부… 훈훈", mood: "good" },
      { id: "b", label: "조용히 넘어간다", fame: 0, news: "", mood: "good" },
    ],
  },
  {
    id: "fanservice", when: (p) => !isAmateur(p.league),
    text: "경기 후 어린이 팬이 사인을 부탁했는데, 너무 피곤한 상황이에요.",
    options: [
      { id: "a", label: "웃으면서 사인해준다", fame: 8, news: "{name}, 어린이 팬에 사인 + 기념사진… 미담 화제", mood: "good" },
      { id: "b", label: "그냥 지나친다", fame: -12, news: "{name}, 어린이 팬 사인 거절 영상 확산", mood: "bad" },
    ],
  },
];

// 별명 규칙: 위에 있을수록 우선
const NICKNAME_RULES = [
  { nick: "국민타자", when: (p) => p.type !== "pitcher" && countAward(p, "MVP") >= 2 },
  { nick: "국민투수", when: (p) => p.type === "pitcher" && countAward(p, "MVP") >= 2 },
  { nick: "한국의 이도류", when: (p) => p.type === "twoway" && p.bestOvr >= 65 },
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
  { nick: "볼넷 제조기", when: (p, r) => r.pit && r.pit.outs >= 90 && r.pit.BB * 27 / r.pit.outs >= 5 },
  { nick: "선풍기", when: (p, r) => r.bat && r.bat.PA >= 200 && r.bat.K / r.bat.PA >= 0.28 },
  { nick: "자동아웃", when: (p, r) => r.bat && r.bat.PA >= 200 && r.bat.AVG < 0.22 },
  { nick: "{school}의 자랑", when: (p) => countAward(p, "고교대회 우승") >= 1 && p.league === "HS" },
];

Object.assign(FAN, {
  military: ["몸 건강히 다녀와라 ㅠㅠ", "2년 금방 간다", "전역하면 더 강해져서 오길", "군대 가서 철 좀 들어라 ㅋㅋ"],
  exempt: ["병역 특례 축하한다!!", "이제 걱정 없이 야구만 하면 됨", "메달이 인생을 바꿨네"],
  nickname: ["'{nick}' ㅋㅋㅋ 찰떡이네", "이제부터 {nick}이라고 부른다", "별명 진짜 잘 지었다", "{nick} 소리 듣기 싫으면 잘해라"],
  rival: ["라이벌 {rival}보다 낫다 이건 확실", "솔직히 올해는 {rival|이} 더 잘함", "{rival|이랑} 비교되는 거 자존심 상할 듯", "둘이 평생 라이벌 가자"],
  lifeGood: ["인성까지 갖췄네", "이래서 응원할 맛 난다", "멋있다 진짜", "호감도 상승 중"],
  lifeBad: ["실망이다 진짜", "야구나 잘하지", "팬들 무시하는 거냐", "이건 좀 아니지 않나"],
  fameHigh: ["우리 팀 아이돌", "얘는 뭘 해도 응원함", "평생 내 원픽"],
  fameLow: ["이 선수는 정이 안 감", "잘해도 별로 안 반가움", "인성 논란 아직 기억한다"],
});

// =============================================
// 6. 대학야구
// =============================================
LEAGUES.COLLEGE = { name: "대학야구", level: 41, games: 30 };
TEAMS.COLLEGE = ["건국대", "경희대", "고려대", "단국대", "동국대", "동아대", "성균관대", "연세대", "인하대", "중앙대", "한양대", "홍익대"];
CHAMPIONSHIP.COLLEGE = "전국대학야구선수권 우승";

// =============================================
// 7. 리그 구조, 마이너리그, 쇼핑 (v9)
// =============================================

// NPB는 센트럴·퍼시픽 2개 리그(6팀씩), MLB는 2개 리그 x 3개 지구(5팀씩) = 30팀
const LEAGUE_GROUPS = {
  NPB: [
    { name: "센트럴리그", league: "센트럴리그", teams: ["요미우리 자이언츠", "한신 타이거스", "주니치 드래건스", "야쿠르트 스왈로스", "요코하마 DeNA 베이스타스", "히로시마 도요 카프"] },
    { name: "퍼시픽리그", league: "퍼시픽리그", teams: ["소프트뱅크 호크스", "오릭스 버펄로스", "지바 롯데 마린스", "라쿠텐 이글스", "세이부 라이온스", "닛폰햄 파이터스"] },
  ],
  MLB: [
    { name: "아메리칸리그 동부지구", league: "아메리칸리그", teams: ["뉴욕 양키스", "보스턴 레드삭스", "토론토 블루제이스", "탬파베이 레이스", "볼티모어 오리올스"] },
    { name: "아메리칸리그 중부지구", league: "아메리칸리그", teams: ["클리블랜드 가디언스", "디트로이트 타이거스", "캔자스시티 로열스", "미네소타 트윈스", "시카고 화이트삭스"] },
    { name: "아메리칸리그 서부지구", league: "아메리칸리그", teams: ["휴스턴 애스트로스", "시애틀 매리너스", "텍사스 레인저스", "LA 에인절스", "애슬레틱스"] },
    { name: "내셔널리그 동부지구", league: "내셔널리그", teams: ["애틀랜타 브레이브스", "필라델피아 필리스", "뉴욕 메츠", "마이애미 말린스", "워싱턴 내셔널스"] },
    { name: "내셔널리그 중부지구", league: "내셔널리그", teams: ["시카고 컵스", "밀워키 브루어스", "세인트루이스 카디널스", "신시내티 레즈", "피츠버그 파이리츠"] },
    { name: "내셔널리그 서부지구", league: "내셔널리그", teams: ["LA 다저스", "샌디에이고 파드리스", "샌프란시스코 자이언츠", "애리조나 다이아몬드백스", "콜로라도 로키스"] },
  ],
};
TEAMS.NPB = LEAGUE_GROUPS.NPB.flatMap((g) => g.teams);
TEAMS.MLB = LEAGUE_GROUPS.MLB.flatMap((g) => g.teams);

// 고졸 미국 직행 선수가 뛰는 마이너리그 (트리플A 구단)
LEAGUES.MILB = { name: "마이너리그", level: 56, games: 140 };
const MILB_AFFILIATE = {
  "뉴욕 양키스": "스크랜턴/윌크스배리 레일라이더스", "보스턴 레드삭스": "우스터 레드삭스", "토론토 블루제이스": "버펄로 바이슨스",
  "탬파베이 레이스": "더럼 불스", "볼티모어 오리올스": "노퍽 타이즈", "클리블랜드 가디언스": "콜럼버스 클리퍼스",
  "디트로이트 타이거스": "털리도 머드헨스", "캔자스시티 로열스": "오마하 스톰체이서스", "미네소타 트윈스": "세인트폴 세인츠",
  "시카고 화이트삭스": "샬럿 나이츠", "휴스턴 애스트로스": "슈거랜드 스페이스카우보이스", "시애틀 매리너스": "타코마 레이니어스",
  "텍사스 레인저스": "라운드록 익스프레스", "LA 에인절스": "솔트레이크 비스", "애슬레틱스": "라스베이거스 에이비에이터스",
  "애틀랜타 브레이브스": "귀넷 스트라이퍼스", "필라델피아 필리스": "리하이밸리 아이언피그스", "뉴욕 메츠": "시러큐스 메츠",
  "마이애미 말린스": "잭슨빌 점보쉬림프", "워싱턴 내셔널스": "로체스터 레드윙스", "시카고 컵스": "아이오와 컵스",
  "밀워키 브루어스": "내슈빌 사운즈", "세인트루이스 카디널스": "멤피스 레드버즈", "신시내티 레즈": "루이빌 배츠",
  "피츠버그 파이리츠": "인디애나폴리스 인디언스", "LA 다저스": "오클라호마시티 코메츠", "샌디에이고 파드리스": "엘패소 치와와스",
  "샌프란시스코 자이언츠": "새크라멘토 리버캣츠", "애리조나 다이아몬드백스": "리노 에이시스", "콜로라도 로키스": "앨버커키 아이소톱스",
};
TEAMS.MILB = Object.values(MILB_AFFILIATE);

// 쇼핑 (가격 단위: 만원, 2026년 물가 기준)
// service: 해마다 돈이 나가는 계약 (1·3·5년 중 고름) / fame: 살 때 팬 여론 변화 / effect: 게임 효과
SHOP_ITEMS.length = 0;
SHOP_ITEMS.push(
  // 전담 스태프 (연 단위 계약)
  { id: "trainer",  cat: "전담 스태프", name: "개인 트레이너",       price: 8000,  service: true, desc: "집중 훈련 성장 +1" },
  { id: "rehab",    cat: "전담 스태프", name: "전담 재활 트레이너",   price: 12000, service: true, desc: "부상 확률 절반" },
  { id: "mental",   cat: "전담 스태프", name: "멘탈 코치",           price: 5000,  service: true, desc: "슬럼프 확률 절반" },
  { id: "chef",     cat: "전담 스태프", name: "전담 셰프·영양사",     price: 4000,  service: true, desc: "30대 이후 능력치 하락 조금 완화" },
  { id: "analyst",  cat: "전담 스태프", name: "개인 전력분석관",     price: 6000,  service: true, desc: "결정적 순간 성공 확률 +5%" },
  // 집
  { id: "oneroom",   cat: "집", name: "원룸 전세",               price: 15000,    desc: "숙소 탈출. 마음이 편해져요." },
  { id: "officetel", cat: "집", name: "구단 근처 고급 오피스텔",   price: 35000,    desc: "출퇴근 5분. 훈련 끝나면 바로 휴식." },
  { id: "apartment", cat: "집", name: "수도권 아파트",           price: 120000,   desc: "내 집 마련 성공!" },
  { id: "jeju",      cat: "집", name: "제주도 오션뷰 별장",       price: 250000,   desc: "비시즌엔 바다 보며 재충전." },
  { id: "gangnam",   cat: "집", name: "강남 아파트",             price: 400000,   desc: "야구로 강남 입성." },
  { id: "tokyo",     cat: "집", name: "도쿄 미나토구 타워맨션",   price: 500000,   desc: "롯폰기힐스가 내려다보여요." },
  { id: "hannam",    cat: "집", name: "한남동 펜트하우스",        price: 1200000,  desc: "연예인들이 이웃.", fame: 2 },
  { id: "manhattan", cat: "집", name: "뉴욕 맨해튼 펜트하우스",   price: 3000000,  desc: "센트럴파크 뷰. 성공한 해외파의 상징.", fame: 3 },
  { id: "beverly",   cat: "집", name: "베벌리힐스 대저택",        price: 6000000,  desc: "방 12개, 수영장 3개, 할리우드 스타가 옆집.", fame: 5 },
  // 탈것
  { id: "car",       cat: "탈것", name: "국산 SUV",              price: 5000,     desc: "출퇴근이 편해졌어요." },
  { id: "supercar",  cat: "탈것", name: "수입 스포츠카",          price: 35000,    desc: "팬들 반응이 갈려요.", fame: -1 },
  { id: "rolls",     cat: "탈것", name: "최고급 세단 (기사 포함)", price: 70000,    desc: "뒷좌석에서 경기 영상 분석." },
  { id: "hypercar",  cat: "탈것", name: "한정판 하이퍼카",        price: 450000,   desc: "전 세계 500대. 직관 주차장이 술렁여요.", fame: -2 },
  { id: "yacht",     cat: "탈것", name: "슈퍼요트",              price: 2500000,  desc: "지중해에서 비시즌을.", fame: -2 },
  { id: "jet",       cat: "탈것", name: "개인 전용기",            price: 8000000,  desc: "원정 이동도 내 비행기로.", fame: -3 },
  // 야구
  { id: "gym",       cat: "야구", name: "개인 실내 훈련장",       price: 150000,   desc: "비시즌에도 감 유지 (안 고른 능력치 하락 확률 절반)" },
  { id: "academy",   cat: "야구", name: "유소년 야구 아카데미",    price: 300000,   desc: "후배 양성. 은퇴 후 명예 +", fame: 3 },
  { id: "alma",      cat: "야구", name: "모교 야구장 리모델링 기부", price: 200000,  desc: "모교 후배들이 울었다.", fame: 4 },
  { id: "museum",    cat: "야구", name: "내 이름 딴 야구 박물관",  price: 1000000,  desc: "배트·글러브·우승 반지 전시.", fame: 3 },
  { id: "club",      cat: "야구", name: "독립리그 구단 인수",      price: 3000000,  desc: "구단주 겸 선수. 은퇴 후 2막 준비 완료.", fame: 4 },
  // 가족·기부
  { id: "parents",   cat: "가족·기부", name: "부모님 집 선물",      price: 60000,    desc: "효도 완료. 팬들이 좋아해요.", fame: 3 },
  { id: "parentsCar",cat: "가족·기부", name: "부모님 차 선물",      price: 8000,     desc: "아버지가 동네방네 자랑하세요.", fame: 1 },
  { id: "donation",  cat: "가족·기부", name: "소아암 병동 기부",     price: 50000,    desc: "조용히 했는데 기사가 났어요.", fame: 5 },
  { id: "foundation",cat: "가족·기부", name: "내 이름 장학재단 설립", price: 500000,   desc: "야구 꿈나무 장학금.", fame: 6 },
  // 사치
  { id: "watch",     cat: "사치", name: "명품 시계",             price: 12000,    desc: "인터뷰 때마다 손목이 반짝." },
  { id: "art",       cat: "사치", name: "현대미술 컬렉션",       price: 300000,   desc: "거실에 걸린 그림 한 점이 집값." },
  { id: "building",  cat: "사치", name: "건물주 되기",           price: 1500000,  desc: "은퇴 후도 걱정 없음." },
  { id: "island",    cat: "사치", name: "남태평양 개인 섬",       price: 15000000, desc: "전설만 살 수 있는 섬.", fame: -2 },
);

// =============================================
// 8. 2군·독립리그·대학·고교 현실화 (v10, 2026 시즌 기준)
// =============================================

// 퓨처스리그: 북부·남부 2개 리그, 팀당 121경기, 리그별 1·2위가 챔피언결정전
LEAGUES.KBO2.games = 121;
LEAGUE_GROUPS.KBO2 = [
  { name: "퓨처스 북부리그", league: "북부리그", teams: ["상무 피닉스", "한화 이글스", "LG 트윈스", "SSG 랜더스", "두산 베어스", "키움 히어로즈"] },
  { name: "퓨처스 남부리그", league: "남부리그", teams: ["KT 위즈", "NC 다이노스", "롯데 자이언츠", "삼성 라이온즈", "KIA 타이거즈", "울산 웨일즈"] },
];
LEAGUE_GROUPS.SANGMU = LEAGUE_GROUPS.KBO2; // 상무도 퓨처스 북부리그에서 뜀
TEAMS.KBO2 = LEAGUE_GROUPS.KBO2.flatMap((g) => g.teams);
TEAMS.SANGMU = TEAMS.KBO2;
CHAMPIONSHIP.KBO2 = "퓨처스리그 우승";
CHAMPIONSHIP.SANGMU = "퓨처스리그 우승";

// 경기도 독립야구리그: 9개 구단, 팀당 36경기, 2·3위 플레이오프 → 1위와 챔피언결정전
LEAGUES.INDIE.name = "경기도 독립리그";
LEAGUES.INDIE.games = 36;
TEAMS.INDIE = ["연천 미라클", "성남 맥파이스", "포천 몬스터", "가평 웨일스", "수원 파인이그스", "고양 PIC", "화성 코리요", "안산 웨이브스", "동두천 프리우스"];
CHAMPIONSHIP.INDIE = "경기도 독립리그 우승";
MONEY.indieSalary = 300; // 월급 없이 출전수당 정도 (선수들이 회비를 내는 구단도 많음)

// 대학야구: KUSF U-리그 조별리그(조 1~5위 왕중왕전) + 전국 대회
const COLLEGE_CUPS = [
  { name: "U-리그 왕중왕전", rounds: 5, qualify: "uleague" },
  { name: "전국대학야구선수권", rounds: 5 },
  { name: "대통령기 대학야구", rounds: 5 },
];
LEAGUE_GROUPS.COLLEGE = [{ name: "U-리그 조별리그", league: "U-리그", teams: TEAMS.COLLEGE }];
const STANDING_GAMES = { COLLEGE: 11 }; // U-리그는 조별 풀리그라 경기 수가 적음

// 고교야구: 권역별 주말리그(전반기·후반기) + 5개 전국대회
const HS_REGIONS = {
  "서울": ["덕수고", "서울고", "휘문고", "장충고", "충암고", "신일고", "배재고", "선린인터넷고", "배명고", "성남고", "경기상고", "중앙고"],
  "경기·인천": ["인천고", "유신고", "야탑고", "동산고", "장안고", "안산공고", "제물포고"],
  "부산·경남": ["경남고", "부산고", "마산용마고", "개성고", "마산고"],
  "대구·경북": ["경북고", "대구고", "상원고", "경주고"],
  "호남": ["광주제일고", "군산상일고", "진흥고", "전주고", "화순고"],
  "충청·강원": ["천안북일고", "세광고", "대전고", "강릉고", "청주고", "공주고", "원주고"],
};
// rounds: 우승까지 이겨야 하는 경기 수 / qualify: 주말리그 성적으로 본선 진출
const HS_CUPS = [
  { name: "이마트배", rounds: 7 },                        // 전국 모든 팀 참가
  { name: "황금사자기", rounds: 6, qualify: "전반기" },
  { name: "청룡기", rounds: 6, qualify: "전반기" },
  { name: "대통령배", rounds: 6, qualify: "후반기" },
  { name: "봉황대기", rounds: 7 },                        // 전국 모든 팀 참가
];

// =============================================
// 9. 인생 이벤트 추가 (v10)
// stats: 능력치 변화 (그 능력치가 있는 선수만), cost: 드는 돈(만원), flag: 상태 표시
// =============================================
const isBatter = (p) => p.type !== "pitcher";
const isPitcher = (p) => p.type !== "batter";
LIFE_EVENTS.push(
  // ---------- 아마추어 ----------
  {
    id: "exam", when: (p) => isAmateur(p.league),
    text: "시험 기간이에요. 감독님은 야간 훈련을 하자고 하시고, 담임 선생님은 공부도 챙기라고 하세요.",
    options: [
      { id: "a", label: "공부도 챙긴다", fame: 3, mental: 1, news: "{name}, 성적표도 '올 A'?… 공부하는 야구선수", mood: "good" },
      { id: "b", label: "야구만 판다", fame: 0, nextMod: 1, news: "{name}, 시험 기간에도 배트 놓지 않았다", mood: "good" },
    ],
  },
  {
    id: "hazing", when: (p) => isAmateur(p.league) && p.age >= 17,
    text: "선배들이 후배들에게 부당한 얼차려를 주는 걸 봤어요.",
    options: [
      { id: "a", label: "나서서 막는다", fame: 8, mental: 1, news: "{name}, 후배 감싼 미담… '이런 선배가 진짜'", mood: "good" },
      { id: "b", label: "감독님께 조용히 알린다", fame: 4, news: "{name} 팀, 악습 없앴다", mood: "good" },
      { id: "c", label: "모른 척한다", fame: -3, news: "", mood: "bad" },
    ],
  },
  {
    id: "overuse", when: (p) => isAmateur(p.league) && isPitcher(p),
    text: "전국대회 8강, 감독님이 어제 100구를 던진 당신에게 또 등판하라고 해요.",
    options: [
      { id: "a", label: "던진다 (팀이 먼저)", fame: 3, stats: { stamina: -2, velocity: 1 }, news: "{name}, 이틀 연속 역투… 혹사 논란도", mood: "bad" },
      { id: "b", label: "트레이너와 상의해 쉰다", fame: -2, mental: 1, news: "{name}, 투구 수 관리로 휴식", mood: "good" },
    ],
  },
  {
    id: "youtubeHs", when: (p) => isAmateur(p.league),
    text: "구독자 100만 야구 유튜버가 '고교 최대어 인터뷰' 촬영을 제안했어요.",
    options: [
      { id: "a", label: "출연한다", fame: 6, news: "{name}, 유튜브 출연 화제… '실물이 더 크다'", mood: "good" },
      { id: "b", label: "아직은 조용히 야구만", fame: 0, mental: 1, news: "", mood: "good" },
    ],
  },
  {
    id: "collegeFest", when: (p) => p.league === "COLLEGE",
    text: "대학 축제 기간이에요. 동기들이 같이 놀자고 해요.",
    options: [
      { id: "a", label: "하루만 즐긴다", fame: 2, mental: 1, news: "", mood: "good" },
      { id: "b", label: "개인 훈련한다", fame: 0, nextMod: 1, news: "{name}, 축제 대신 실내 연습장… '프로 가서 놀겠다'", mood: "good" },
    ],
  },
  // ---------- 프로: 경기장 ----------
  {
    id: "umpire", when: (p) => !isAmateur(p.league),
    text: "결정적인 순간, 명백한 오심이 나왔어요. 판정 하나에 경기가 넘어갈 상황이에요.",
    options: [
      { id: "a", label: "강하게 항의한다", fame: 4, nextMod: -1, news: "{name}, 오심에 격한 항의 끝 퇴장… 출장 정지 징계", mood: "bad" },
      { id: "b", label: "꾹 참는다", fame: 2, mental: 1, news: "{name}, 오심에도 침착… '야구로 갚겠다'", mood: "good" },
    ],
  },
  {
    id: "benchClear", when: (p) => !isAmateur(p.league),
    text: "상대 투수의 몸쪽 공에 동료가 맞아 벤치클리어링이 벌어졌어요!",
    options: [
      { id: "a", label: "맨 앞에서 동료를 지킨다", fame: 6, nextMod: 1, news: "{name}, 벤치클리어링 앞장… '동료는 내가 지킨다'", mood: "good" },
      { id: "b", label: "말리는 역할을 한다", fame: 3, news: "{name}, 벤치클리어링 진화… 성숙한 대처", mood: "good" },
      { id: "c", label: "더그아웃에 있는다", fame: -4, news: "{name}, 벤치클리어링 때 혼자 더그아웃?", mood: "bad" },
    ],
  },
  {
    id: "formChange", when: (p) => !isAmateur(p.league) && isBatter(p) && p.type !== "twoway",
    text: "새로 온 타격코치가 타격 폼을 완전히 바꾸자고 해요.",
    options: [
      { id: "a", label: "새 폼으로 바꾼다", fame: 0, stats: { power: 3, contact: -1 }, nextMod: -1, news: "{name}, 비시즌 타격 폼 대수술", mood: "good" },
      { id: "b", label: "내 폼을 지킨다", fame: 0, mental: 1, news: "{name} \"내 폼은 내가 제일 잘 안다\"", mood: "good" },
    ],
  },
  {
    id: "newPitch", when: (p) => !isAmateur(p.league) && isPitcher(p) && p.type !== "twoway",
    text: "비시즌에 새 구종(스위퍼)을 장착할 기회가 생겼어요. 익히는 동안은 제구가 흔들릴 수 있어요.",
    options: [
      { id: "a", label: "신무기 장착", fame: 2, stats: { breaking: 3, control: -1 }, news: "{name}, 신무기 스위퍼 장착… 타자들 긴장", mood: "good" },
      { id: "b", label: "있는 공을 다듬는다", fame: 0, stats: { control: 1 }, news: "", mood: "good" },
    ],
  },
  {
    id: "bodyChange", when: (p) => !isAmateur(p.league),
    text: "비시즌 몸 만들기 방향을 정해야 해요.",
    options: [
      { id: "a", label: "10kg 벌크업", fame: 1, stats: { power: 2, velocity: 2, speed: -1, stamina: -1 }, news: "{name}, 벌크업 성공… 몸이 달라졌다", mood: "good" },
      { id: "b", label: "8kg 감량", fame: 1, stats: { speed: 2, defense: 1, stamina: 2, power: -1 }, news: "{name}, 체중 감량으로 날렵해졌다", mood: "good" },
      { id: "c", label: "지금 몸 유지", fame: 0, news: "", mood: "good" },
    ],
  },
  {
    id: "drivelineUS", when: (p) => !isAmateur(p.league) && (p.money || 0) >= 10000,
    text: "미국 유명 트레이닝 센터에서 비시즌 개인 훈련을 받을 수 있어요. 비용은 꽤 들어요.",
    options: [
      { id: "a", label: "미국 훈련 간다", fame: 2, cost: 5000, stats: { velocity: 2, power: 2 }, news: "{name}, 사비 들여 미국 훈련… '데이터로 다시 태어났다'", mood: "good" },
      { id: "b", label: "국내에서 훈련", fame: 0, news: "", mood: "good" },
    ],
  },
  {
    id: "mentor", when: (p) => !isAmateur(p.league) && p.age >= 29,
    text: "구단이 고졸 신인의 멘토가 되어 달라고 부탁해요.",
    options: [
      { id: "a", label: "기꺼이 맡는다", fame: 6, mental: 1, news: "{name}, 신인 멘토 자처… '내가 받은 걸 돌려줄 때'", mood: "good" },
      { id: "b", label: "내 몸 관리가 먼저", fame: -2, news: "", mood: "good" },
    ],
  },
  {
    id: "retireRumor", when: (p) => !isAmateur(p.league) && p.age >= 35,
    text: "은퇴설 기사가 났어요. 기자들이 은퇴 계획을 물어요.",
    options: [
      { id: "a", label: "\"아직 보여줄 게 많다\"", fame: 3, mental: 2, news: "{name} \"은퇴? 아직 멀었다\"… 현역 연장 의지", mood: "good" },
      { id: "b", label: "\"올해가 마지막일 수도\"", fame: 8, news: "{name}, 은퇴 시사… 팬들 '마지막까지 함께'", mood: "good" },
    ],
  },
  {
    id: "sickFan", when: (p) => !isAmateur(p.league),
    text: "투병 중인 어린이 팬이 '홈런(삼진) 하나만 보여주세요'라는 편지를 보냈어요.",
    options: [
      { id: "a", label: "병원에 직접 찾아간다", fame: 10, mental: 1, news: "{name}, 투병 중인 어린이 팬 병문안… 사인볼 선물", mood: "good" },
      { id: "b", label: "약속하고 경기에서 보여준다", fame: 6, nextMod: 1, news: "{name}, 어린이 팬과의 약속 지켰다", mood: "good" },
    ],
  },
  // ---------- 프로: 경기장 밖 ----------
  {
    id: "teamDinner", when: (p) => !isAmateur(p.league) && (p.money || 0) >= 5000,
    text: "시즌 끝, 고생한 동료와 스태프들에게 회식을 쏠까요?",
    options: [
      { id: "a", label: "통 크게 쏜다", fame: 4, cost: 1500, mental: 1, news: "{name}, 선수단 전체 회식 쐈다… '다들 고생 많았다'", mood: "good" },
      { id: "b", label: "다음에", fame: 0, news: "", mood: "good" },
    ],
  },
  {
    id: "littleLeague", when: (p) => !isAmateur(p.league) && (p.money || 0) >= 5000,
    text: "고향 리틀야구단이 장비가 낡아 어렵다는 소식을 들었어요.",
    options: [
      { id: "a", label: "장비 일체 기부", fame: 8, cost: 2000, news: "{name}, 고향 리틀야구단에 장비 기부… '나도 여기서 시작했다'", mood: "good" },
      { id: "b", label: "사인볼만 보낸다", fame: 2, news: "", mood: "good" },
    ],
  },
  {
    id: "rumor", when: (p) => !isAmateur(p.league) && (p.fame || 0) >= 10,
    text: "근거 없는 악성 루머가 온라인에 퍼지고 있어요.",
    options: [
      { id: "a", label: "법적 대응", fame: 5, cost: 1000, news: "{name} 측, 악성 루머 유포자 고소… '선처 없다'", mood: "good" },
      { id: "b", label: "무시한다", fame: -6, nextMod: -1, news: "{name}, 루머에 침묵… 의혹만 커져", mood: "bad" },
    ],
  },
  {
    id: "lateNight", when: (p) => !isAmateur(p.league) && p.age >= 21,
    text: "원정 경기 전날 새벽, 동료들이 술자리에 가자고 해요.",
    options: [
      { id: "a", label: "숙소에서 쉰다", fame: 0, mental: 1, news: "", mood: "good" },
      { id: "b", label: "잠깐만 따라간다", fame: -10, nextMod: -1, news: "{name}, 원정 전날 새벽 술자리 목격담… 구단 '경위 파악 중'", mood: "bad" },
    ],
  },
  {
    id: "channel", when: (p) => !isAmateur(p.league) && (p.fame || 0) >= 15,
    text: "개인 유튜브 채널을 열자는 제안이 왔어요. 수익은 쏠쏠하지만 시간이 들어요.",
    options: [
      { id: "a", label: "채널 개설", fame: "random", money: 5000, nextMod: -1, news: "{name}, 개인 유튜브 개설… 첫 영상 조회수 폭발", mood: "good" },
      { id: "b", label: "야구에 집중", fame: 0, mental: 1, news: "", mood: "good" },
    ],
  },
  {
    id: "fanMeeting", when: (p) => !isAmateur(p.league) && (p.fame || 0) >= 25,
    text: "팬클럽이 비시즌 팬미팅을 열어 달라고 요청했어요.",
    options: [
      { id: "a", label: "직접 준비해서 연다", fame: 10, cost: 1000, news: "{name}, 첫 단독 팬미팅 매진… 팬들과 눈물의 시간", mood: "good" },
      { id: "b", label: "사인회 정도만", fame: 4, news: "", mood: "good" },
    ],
  },
  {
    id: "baby", when: (p) => p.married && !p.kids,
    text: "아내가 임신 소식을 전했어요! 출산 예정일이 시즌 중이에요.",
    options: [
      { id: "a", label: "출산 휴가를 쓴다", fame: 8, mental: 2, flag: "kids", news: "{name}, 경조사 휴가로 출산 지켜… '아빠가 됐다'", mood: "good" },
      { id: "b", label: "경기 끝나고 달려간다", fame: 3, mental: 1, flag: "kids", nextMod: 1, news: "{name}, 경기 끝나자마자 병원으로… '분유 버프' 기대", mood: "good" },
    ],
  },
  {
    id: "pet", when: (p) => !p.pet && !isAmateur(p.league),
    text: "숙소 근처에서 떠돌던 강아지가 계속 따라와요.",
    options: [
      { id: "a", label: "입양한다", fame: 5, mental: 1, flag: "pet", news: "{name}, 유기견 입양… SNS에 '반려견 자랑' 폭주", mood: "good" },
      { id: "b", label: "보호소에 연락한다", fame: 1, news: "", mood: "good" },
    ],
  },
  {
    id: "charityGame", when: (p) => !isAmateur(p.league) && (p.fame || 0) >= 5,
    text: "연말 자선 야구대회에 초대받았어요. 비시즌 휴식이 조금 줄어요.",
    options: [
      { id: "a", label: "참가한다", fame: 6, news: "{name}, 자선 야구대회 참가… 수익금 전액 기부", mood: "good" },
      { id: "b", label: "휴식을 택한다", fame: -1, news: "", mood: "good" },
    ],
  },
  {
    id: "hometown", when: (p) => !isAmateur(p.league) && p.age >= 25,
    text: "모교에서 후배들 앞에서 특강을 해 달라고 해요.",
    options: [
      { id: "a", label: "모교를 찾아간다", fame: 5, news: "{name}, 모교 {school} 특강… '꿈은 도망가지 않는다'", mood: "good" },
      { id: "b", label: "영상 메시지로 대신", fame: 1, news: "", mood: "good" },
    ],
  },
);

// =============================================
// 10. 고교·대학 야구부 늘리기, 대학 진학 (v11)
// =============================================
HIGH_SCHOOLS.push(
  { name: "경기고", level: 1 }, { name: "경동고", level: 1 }, { name: "서울디자인고", level: 1 }, { name: "서울컨벤션고", level: 1 },
  { name: "부천고", level: 1 }, { name: "소래고", level: 1 }, { name: "비봉고", level: 1 }, { name: "라온고", level: 1 },
  { name: "속초상고", level: 1 }, { name: "설악고", level: 1 }, { name: "대전제일고", level: 1 },
  { name: "동성고", level: 2 }, { name: "순천효천고", level: 1 }, { name: "제주고", level: 1 },
  { name: "포항제철고", level: 1 }, { name: "김해고", level: 2 }, { name: "부경고", level: 1 }, { name: "부산정보고", level: 1 }, { name: "물금고", level: 1 },
);
HS_REGIONS["서울"].push("경기고", "경동고", "서울디자인고", "서울컨벤션고");
HS_REGIONS["경기·인천"].push("부천고", "소래고", "비봉고", "라온고");
HS_REGIONS["충청·강원"].push("속초상고", "설악고", "대전제일고");
HS_REGIONS["호남·제주"] = [...HS_REGIONS["호남"], "동성고", "순천효천고", "제주고"];
delete HS_REGIONS["호남"];
HS_REGIONS["대구·경북"].push("포항제철고");
HS_REGIONS["부산·경남"].push("김해고", "부경고", "부산정보고", "물금고");

function hsRegion(name) {
  return Object.keys(HS_REGIONS).find((r) => HS_REGIONS[r].includes(name)) || "";
}

// 대학 야구부 (tier: 스카우트들이 보는 야구부 전력 3 = 상위권, 2 = 중위권, 1 = 신생·하위권)
const COLLEGES = [
  { name: "고려대", tier: 3 }, { name: "연세대", tier: 3 }, { name: "성균관대", tier: 3 }, { name: "한양대", tier: 3 },
  { name: "동국대", tier: 3 }, { name: "동아대", tier: 3 }, { name: "원광대", tier: 3 }, { name: "강릉영동대", tier: 3 },
  { name: "경희대", tier: 2 }, { name: "인하대", tier: 2 }, { name: "건국대", tier: 2 }, { name: "단국대", tier: 2 },
  { name: "중앙대", tier: 2 }, { name: "홍익대", tier: 2 }, { name: "동의대", tier: 2 }, { name: "경성대", tier: 2 },
  { name: "영남대", tier: 2 }, { name: "계명대", tier: 2 }, { name: "한일장신대", tier: 2 }, { name: "송원대", tier: 2 },
  { name: "서울대", tier: 1 }, { name: "가톨릭관동대", tier: 1 }, { name: "송호대", tier: 1 }, { name: "수성대", tier: 1 },
  { name: "김천대", tier: 1 }, { name: "경일대", tier: 1 }, { name: "세한대", tier: 1 }, { name: "호원대", tier: 1 },
];
TEAMS.COLLEGE = COLLEGES.map((c) => c.name);
LEAGUE_GROUPS.COLLEGE = [
  { name: "U-리그 A조", league: "U-리그", teams: ["고려대", "연세대", "성균관대", "한양대", "동국대", "건국대", "서울대"] },
  { name: "U-리그 B조", league: "U-리그", teams: ["경희대", "인하대", "단국대", "중앙대", "홍익대", "강릉영동대", "가톨릭관동대", "송호대"] },
  { name: "U-리그 C조", league: "U-리그", teams: ["동아대", "동의대", "경성대", "영남대", "계명대", "수성대", "김천대"] },
  { name: "U-리그 D조", league: "U-리그", teams: ["원광대", "한일장신대", "송원대", "세한대", "호원대", "경일대"] },
];
STANDING_GAMES.COLLEGE = 9;

// =============================================
// 11. 감독 (v14): 2026 시즌 KBO 1군 감독과 운영 스타일
// 스타일은 게임 속 면담 판단에만 쓰임 (감독이 바뀌면 이름만 수정)
// =============================================
const MANAGER_STYLES = {
  trust:   { name: "믿음의 야구", desc: "한 번 믿은 선수는 꾸준히 써요 (주전 요청 수월)" },
  run:     { name: "뛰는 야구·작전 야구", desc: "발 빠른 타자를 좋아해요 (1번 타자 요청 수월)" },
  pitch:   { name: "투수 운영 전문", desc: "투수 출신이라 투수 보직 요청을 잘 들어줘요" },
  results: { name: "승부사", desc: "성적이 전부예요 (최근 성적을 크게 봐요, 기준 엄격)" },
  talk:    { name: "소통형", desc: "대화로 풀어요 (애매하면 캠프 경쟁 기회를 줘요)" },
  defense: { name: "수비 중시", desc: "수비 좋은 선수를 주전으로 써요" },
  youth:   { name: "육성형", desc: "젊은 선수에게 기회를 줘요 (만 25세 이하 유리)" },
};
const MANAGERS = {
  "KIA 타이거즈": { name: "이범호", born: 1981, style: "talk" },
  "두산 베어스": { name: "김원형", born: 1972, style: "pitch" },
  "롯데 자이언츠": { name: "김태형", born: 1967, style: "results" },
  "NC 다이노스": { name: "이호준", born: 1976, style: "talk" },
  "LG 트윈스": { name: "염경엽", born: 1968, style: "run" },
  "한화 이글스": { name: "김경문", born: 1958, style: "trust" },
  "KT 위즈": { name: "이강철", born: 1966, style: "pitch" },
  "삼성 라이온즈": { name: "박진만", born: 1976, style: "defense" },
  "SSG 랜더스": { name: "이숭용", born: 1971, style: "youth" },
  "키움 히어로즈": { name: "설종진", born: 1973, style: "youth" },
};

// =============================================
// 12. 감독 교체 (v14): 감독이 언제 왔는지, 그리고 다음 감독 후보들
// since = 그 팀 감독을 맡은 해 (오래 할수록 계약 만료로 바뀔 확률이 올라감)
// 이름과 스타일은 게임용으로 단순하게 정리한 거임. 필요하면 수정
// =============================================
MANAGER_STYLES.training = { name: "지옥 훈련", desc: "훈련량이 엄청나요 (시즌마다 능력치 +1, 요청 기준은 엄격)" };
MANAGER_STYLES.freedom = { name: "자율 야구", desc: "베테랑에게 맡겨요 (만 30세 이상 요청 수월, 컨디션 +1)" };

const MANAGER_SINCE = {
  "KIA 타이거즈": 2024, "두산 베어스": 2026, "롯데 자이언츠": 2024, "NC 다이노스": 2025, "LG 트윈스": 2023,
  "한화 이글스": 2024, "KT 위즈": 2019, "삼성 라이온즈": 2023, "SSG 랜더스": 2024, "키움 히어로즈": 2026,
};

// 역대 감독 (legend: 레전드 감독은 이름 옆에 👑, 팀 전력도 살짝 올라감)
// born: 출생 연도 (만 68세까지 새로 맡고, 72세면 물러남)
// until: 이미 연세가 많은 레전드는 게임 초반 몇 년만 특별 출연함
const PAST_MANAGERS = [
  { name: "김응용", born: 1941, style: "results", legend: true, until: 2029, note: "한국시리즈 우승 10회 · 해태 왕조" },
  { name: "김성근", born: 1942, style: "training", legend: true, until: 2029, note: "SK 왕조 · 한국시리즈 우승 3회" },
  { name: "김인식", born: 1947, style: "trust", legend: true, until: 2030, note: "WBC 준우승 · 국민 감독" },
  { name: "김재박", born: 1954, style: "run", legend: true, until: 2031, note: "현대 왕조 · 한국시리즈 우승 4회" },
  { name: "선동열", born: 1963, style: "pitch", legend: true, note: "삼성 2연패 · 국보 투수" },
  { name: "류중일", born: 1963, style: "trust", legend: true, note: "삼성 통합 4연패" },
  { name: "강병철", born: 1946, style: "results", legend: true, until: 2030, note: "롯데 우승 2회 (1984·1992)" },
  { name: "이광환", born: 1948, style: "freedom", legend: true, until: 2030, note: "LG 1994 우승 · 자율 야구" },
  { name: "조범현", born: 1960, style: "youth", note: "KIA 2009 우승 · KT 초대 감독" },
  { name: "김기태", born: 1969, style: "talk", note: "KIA 2017 우승 · 형님 리더십" },
  { name: "트레이 힐만", born: 1963, style: "talk", note: "SK 2018 우승" },
  { name: "제리 로이스터", born: 1952, style: "freedom", note: "롯데 'No Fear'" },
  { name: "이동욱", born: 1974, style: "youth", note: "NC 2020 통합 우승" },
  { name: "김시진", born: 1958, style: "pitch", note: "투수 출신 · 현대·넥센·롯데 감독" },
  { name: "양상문", born: 1961, style: "pitch", note: "투수 출신" },
  { name: "이만수", born: 1958, style: "talk", note: "헐크 · SK 2012 준우승" },
  { name: "이승엽", born: 1976, style: "trust", note: "국민 타자" },
  { name: "홍원기", born: 1973, style: "youth", note: "키움 2022 준우승" },
  { name: "이순철", born: 1961, style: "run", note: "해태 왕조 리드오프" },
  { name: "김진욱", born: 1960, style: "talk", note: "두산·KT 감독" },
];

// 앞으로 새로 감독이 될 사람들 (가상 인물)
const NEW_MANAGER_NAMES = ["정민혁", "배성훈", "남궁현", "조태민", "문재석", "황보준", "구동현", "엄태율", "변상우", "석진호", "류건우", "탁영민", "공태현", "여민수", "기성준", "명재훈", "추현석", "하도겸", "봉준혁", "편승우"];

// =============================================
// 13. 우승 결정 시리즈 (v14): 결정적 순간에 나오는 경기
// bo = 몇 판 몇 선승제, win/lose = 우승·준우승한 해에 결정적 순간이 나오는 차전 후보
// =============================================
const FINAL_SERIES = {
  KBO: { name: "한국시리즈", bo: 7, win: [4, 5, 5, 6, 6, 6, 7], lose: [5, 6, 6, 7] },
  NPB: { name: "재팬시리즈", bo: 7, win: [4, 5, 5, 6, 6, 6, 7], lose: [5, 6, 6, 7] },
  MLB: { name: "월드시리즈", bo: 7, win: [4, 5, 5, 6, 6, 6, 7], lose: [5, 6, 6, 7] },
  ABL: { name: "ABL 챔피언십 시리즈", bo: 3, win: [2, 2, 3], lose: [2, 3] },
  INDIE: { name: "독립리그 챔피언결정전", bo: 3, win: [2, 2, 3], lose: [2, 3] },
  KBO2: { name: "퓨처스 챔피언결정전", bo: 1, win: [1], lose: [1] },
  SANGMU: { name: "퓨처스 챔피언결정전", bo: 1, win: [1], lose: [1] },
};

// =============================================
// 14. 구단 팬덤 크기 (v14): 1(작음) ~ 5(전국구)
// 관중 수와 인기를 참고해서 게임용으로 단순하게 매긴 값임. 적어 두지 않은 팀은 3
// 팬덤이 크면: 올스타 팬 투표에 유리, 잘하면 인기 폭발 / 못하면 비난도 큼
// =============================================
const TEAM_FANDOM = {
  "삼성 라이온즈": 5, "KIA 타이거즈": 5, "롯데 자이언츠": 5, "LG 트윈스": 5, "한화 이글스": 5,
  "두산 베어스": 4, "SSG 랜더스": 3, "NC 다이노스": 2, "KT 위즈": 2, "키움 히어로즈": 1,
  "요미우리 자이언츠": 5, "한신 타이거스": 5, "소프트뱅크 호크스": 4, "히로시마 도요 카프": 4,
  "주니치 드래건스": 3, "닛폰햄 파이터스": 3, "요코하마 DeNA 베이스타스": 3, "라쿠텐 이글스": 3,
  "야쿠르트 스왈로스": 2, "오릭스 버펄로스": 2, "지바 롯데 마린스": 3, "세이부 라이온스": 2,
  "LA 다저스": 5, "뉴욕 양키스": 5, "보스턴 레드삭스": 4, "시카고 컵스": 4, "세인트루이스 카디널스": 4,
  "샌프란시스코 자이언츠": 4, "뉴욕 메츠": 4, "필라델피아 필리스": 4, "애틀랜타 브레이브스": 4,
  "탬파베이 레이스": 2, "애슬레틱스": 1, "마이애미 말린스": 1, "피츠버그 파이리츠": 2,
  "캔자스시티 로열스": 2, "콜로라도 로키스": 2, "신시내티 레즈": 2, "시카고 화이트삭스": 2,
};
function teamFandom(team) {
  return TEAM_FANDOM[team] || 3;
}

// =============================================
// 15. 상점 더 다양하게 (v14)
// recovery(회복 장비)는 부상 확률을 20% 줄여줌. 나머지는 팬 여론(fame)이나 그냥 기분
// =============================================
SHOP_ITEMS.push(
  // 집
  { id: "hometown",  cat: "집", name: "고향 단독주택",             price: 30000,    desc: "마당에서 티배팅 가능." },
  { id: "haeundae",  cat: "집", name: "부산 해운대 오션뷰",         price: 180000,   desc: "광안대교 야경이 한눈에." },
  { id: "hawaii",    cat: "집", name: "하와이 별장",               price: 900000,   desc: "비시즌 개인 훈련은 와이키키에서." },
  // 탈것
  { id: "ev",        cat: "탈것", name: "전기차",                  price: 6000,     desc: "조용하고 친환경. 팬들이 좋아해요.", fame: 1 },
  { id: "camper",    cat: "탈것", name: "캠핑카",                  price: 15000,    desc: "가족·동료들과 비시즌 캠핑." },
  { id: "heli",      cat: "탈것", name: "개인 헬리콥터",            price: 1500000,  desc: "구장 옥상에 착륙하면 화제는 확실.", fame: -2 },
  // 야구
  { id: "machine",   cat: "야구", name: "피칭·배팅 머신 세트",       price: 20000,    desc: "집 차고가 연습장." },
  { id: "recovery",  cat: "야구", name: "산소 캡슐·회복 장비",       price: 40000,    desc: "부상 확률 20% 감소" },
  { id: "tracker",   cat: "야구", name: "투구·타구 추적 장비",       price: 60000,    desc: "회전수·발사각까지 다 보여요." },
  { id: "little",    cat: "야구", name: "고향 리틀야구단 후원",       price: 30000,    desc: "꼬마들 유니폼에 내 이름.", fame: 2 },
  { id: "camp",      cat: "야구", name: "야구 꿈나무 캠프 개최",      price: 80000,    desc: "비시즌마다 아이들과 캐치볼.", fame: 3 },
  { id: "youtube",   cat: "야구", name: "야구 유튜브 채널 개설",      price: 10000,    desc: "구독자 100만 가자!", fame: 2 },
  // 가족·기부
  { id: "coal",      cat: "가족·기부", name: "연탄 나눔 봉사",        price: 3000,     desc: "얼굴에 검댕 묻은 사진이 화제.", fame: 2 },
  { id: "coffee",    cat: "가족·기부", name: "팬클럽 커피차 선물",     price: 2000,     desc: "역조공으로 팬들 감동.", fame: 2 },
  { id: "elderly",   cat: "가족·기부", name: "독거 어르신 지원",       price: 20000,    desc: "매달 꾸준히, 조용히.", fame: 3 },
  { id: "disaster",  cat: "가족·기부", name: "재난 구호 성금",         price: 100000,   desc: "큰 금액을 선뜻 기부.", fame: 4 },
  { id: "eduFund",   cat: "가족·기부", name: "자녀 교육 펀드",         price: 100000,   desc: "아이들 미래는 든든하게." },
  // 사치
  { id: "suit",      cat: "사치", name: "명품 맞춤 슈트",           price: 5000,     desc: "시상식 레드카펫 준비 완료." },
  { id: "sneakers",  cat: "사치", name: "한정판 스니커즈 컬렉션",    price: 20000,    desc: "드레스룸 한쪽 벽이 전부 신발." },
  { id: "ball",      cat: "사치", name: "레전드 사인볼 컬렉션",      price: 50000,    desc: "어릴 적 우상들의 사인." },
  { id: "wine",      cat: "사치", name: "와인 셀러",                price: 80000,    desc: "시즌 끝나고 한 잔." },
  { id: "golf",      cat: "사치", name: "골프장 회원권",            price: 500000,   desc: "비시즌 라운딩은 여기서.", fame: -1 },
  { id: "esports",   cat: "사치", name: "e스포츠 팀 인수",           price: 2000000,  desc: "야구 말고도 우승 반지를!", fame: 2 },
  { id: "soccer",    cat: "사치", name: "유럽 축구팀 지분 인수",      price: 6000000,  desc: "구단주석에서 챔피언스리그 관람.", fame: 1 },
);

// =============================================
// 16. v15 추가 데이터
// =============================================
// 내가 다녔던 학교들 (재미로 넣음, 야구부 전력은 최하 level 0)
HIGH_SCHOOLS.push({ name: "성지고", level: 0 }, { name: "인제고", level: 0 });
HS_REGIONS["경기·인천"].push("성지고", "인제고");

// FA 때 팀 사정: 이 자리가 비어 있는 팀은 공격적으로 달려듦
// match: 내 포지션이 이 부족한 자리에 맞는지
const TEAM_NEEDS = [
  { id: "sp",  label: "선발 투수", match: (pos) => pos.startsWith("선발") },
  { id: "rp",  label: "불펜",      match: (pos) => pos.includes("구원") || pos.includes("마무리") || pos.includes("불펜") },
  { id: "c",   label: "포수",      match: (pos) => pos.includes("포수") },
  { id: "inf", label: "내야수",    match: (pos) => ["1루수", "2루수", "3루수", "유격수"].some((x) => pos.includes(x)) },
  { id: "of",  label: "외야수",    match: (pos) => pos.includes("외야") },
  { id: "bat", label: "중심 타자", match: (pos, type) => type !== "pitcher" },
];

// 진짜 커뮤 느낌 댓글 (욕 거의 없이, 성적 놀림은 OK)
Object.assign(FAN, {
  // 성적 숫자를 직접 언급하는 댓글
  statBat: ["{HR}홈런 {AVG} 실화냐", "OPS {OPS}면 연봉 더 줘야 함 ㄹㅇ", "타율 {AVG} 보고 눈 비빔", "{RBI}타점이면 할 만큼 했지",
            "스탯티즈 들어가 봤는데 WAR {WAR} 찍혀 있더라 ㄷㄷ", "{HR}개 친 거 하이라이트만 봐도 30분임"],
  statPit: ["평자 {ERA} 실화냐", "{K}삼진 ㄷㄷ 그냥 선풍기 공장장", "{W}승이면 타선 도움도 받았네", "평자 {ERA}면 에이스 소리 들을 만함",
            "WAR {WAR} 투수가 우리 팀에 있다니", "얘 등판하는 날만 마음 편하게 봄"],
  statBatBad: ["타율 {AVG} 실화냐… 할 말을 잃음", "OPS {OPS}로 주전 먹는 게 신기함", "WAR {WAR} 보고 조용히 창 닫음", "{HR}홈런이 전부라고?"],
  statPitBad: ["평자 {ERA} 보고 눈을 의심함", "WAR {WAR}… 차라리 안 던지는 게 팀에 도움", "평자 {ERA}면 2군 가서 다시 해야 함", "얘 나오면 야구 끄고 잠"],
  // 커뮤 특유 짧은 반응
  meme: ["ㄹㅇㅋㅋ", "개추 박고 간다", "이건 인정", "ㅋㅋㅋㅋㅋㅋㅋㅋ", "아 진짜 ㅋㅋ", "3줄 요약 좀", "직관 간 사람 후기 좀",
         "이 글 박제함", "내년에 이 글 다시 보러 온다", "글 쓴 사람 우리 팀 팬 아니지?", "출근길에 하이라이트 돌려봄", "와 소름",
         "어제 경기 보고 잠 못 잠", "유입 많네 오늘", "지금 몇 시인데 야갤 불타냐", "엠팍에도 똑같은 글 올라옴 ㅋㅋ"],
  // 싸움 붙는 댓글 (팬 vs 안티)
  fight: ["솔직히 거품임 내년 보자", "또 까는 사람 나왔네 ㅋㅋ", "기록 보고 말해라 기록 보고", "니네 팀 선수였으면 빨았을 거면서",
          "작년이랑 비교하면 별거 없음", "숫자는 거짓말 안 함", "원래 잘하던 애가 잘하는 거임"],
  // 대댓글
  reply: ["ㄴ ㄹㅇ", "ㄴ ㅇㄱㄹㅇ", "ㄴ 이건 맞말", "ㄴ 뭔 소리여", "ㄴ 이분 작년에도 이 소리 함", "ㄴ 박제 완료", "ㄴ ㅋㅋㅋㅋ 인정",
          "ㄴ 반박 시 니 말이 맞음", "ㄴ 개추", "ㄴ 아님 그건 아님", "ㄴ 유입 컷", "ㄴ 팩트로 패네"],
  // 팀 이야기
  teamTalk: ["{team} 프런트 이번엔 일 좀 했다", "{team} 팬들은 좋겠다", "{team} 단장 보너스 줘야 함", "{team} 경기만 챙겨 보게 됨",
             "{team} 굿즈 마킹 {name|으로} 함"],
  // v15 이벤트
  trade: ["트레이드? 갑자기?", "가서 잘해라 진심으로", "프런트 뭐 하냐 진짜", "솔직히 기회 받으면 터질 듯", "이적생 버프 가즈아", "유니폼 바뀐 거 어색하네"],
  historic: ["이건 KBO 역사에 남는다", "게임에서도 이런 스탯 안 나옴", "진짜 만화 찢고 나왔냐", "이 시즌은 박물관에 걸어야 함",
             "몇십 년 뒤에도 회자될 시즌", "스탯 보고 오류인 줄"],
  autumn: ["가을만 되면 눈빛이 달라짐", "가을 DNA 확실함", "큰 경기 체질이네", "포스트시즌 {name|은} 다른 사람임"],
  season: ["여름만 되면 미쳐 날뛰네 ㅋㅋ", "날씨 풀리면 살아나는 타입", "시즌 초반엔 진짜 무서움", "막판 스퍼트 미쳤다", "월별 스탯 보면 확 티 남"],
  extend: ["포기 안 하는 거 리스펙", "고효준 루트 가자", "몸 되는 데까지 해라", "나이는 숫자일 뿐", "이 형 50까지 할 듯"],
  vetReturn: ["돌아온 걸 환영한다", "말년은 고향에서 ㅠㅠ", "아직 공 살아 있음", "메이저 물 먹은 클래스 보여 줘라"],
  glass: ["또 다쳤냐 ㅠㅠ", "재활 트레이너 연봉이 더 나오겠다", "건강하기만 하면 MVP인데", "몸이 안 따라 주네 아쉽다", "유리몸 소리 듣기 싫으면 관리 좀"],
  faWait: ["더 기다리면 돈 더 받는다", "간 보다가 망하는 거 아니냐", "에이전트 일 잘하네", "그냥 빨리 도장 찍어라"],
});

Object.assign(NEWS.special, {
  serviceInjury: "{name}, 부상 여파로 1군 등록 {days}일… FA 시계 1년 늦어진다",
  tradeMid: "[트레이드] {name}, 시즌 도중 {from}에서 {team|으로}… 본인도 몰랐다",
  tradeAfter: "[트레이드] {name}, {from}에서 {team|으로} 이적… 새 팀에서 다시 시작",
  historic: "{name}, 역사에 남을 시즌… 야구계가 들썩였다",
  extend: "{name}, 은퇴 대신 입단 테스트… \"아직 공 던질 수 있다\"",
  vetReturn: "{name}, 해외 생활 마치고 KBO 복귀",
  glassHurt: "{name}, 또 부상… 장기 이탈 우려",
});
