// =============================================
// managers.js : 감독 (2026 시즌 KBO 1군 감독, 운영 스타일, 역대 감독, 새 얼굴 후보)
// 스타일은 게임 속 면담 판단에만 쓰임. 이름과 스타일은 게임용으로 단순하게 정리한 거임
// 규칙은 systems/manager.js
// =============================================

const MANAGER_STYLES = {
  trust: { name: "믿음의 야구", desc: "한 번 믿은 선수는 꾸준히 써요 (주전 요청 수월)" },
  run: { name: "뛰는 야구·작전 야구", desc: "발 빠른 타자를 좋아해요 (1번 타자 요청 수월)" },
  pitch: { name: "투수 운영 전문", desc: "투수 출신이라 투수 보직 요청을 잘 들어줘요" },
  results: { name: "승부사", desc: "성적이 전부예요 (최근 성적을 크게 봐요, 기준 엄격)" },
  talk: { name: "소통형", desc: "대화로 풀어요 (애매하면 캠프 경쟁 기회를 줘요)" },
  defense: { name: "수비 중시", desc: "수비 좋은 선수를 주전으로 써요" },
  youth: { name: "육성형", desc: "젊은 선수에게 기회를 줘요 (만 25세 이하 유리)" },
  training: { name: "지옥 훈련", desc: "훈련량이 엄청나요 (시즌마다 능력치 +1, 요청 기준은 엄격)" },
  freedom: { name: "자율 야구", desc: "베테랑에게 맡겨요 (만 30세 이상 요청 수월, 컨디션 +1)" },
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

// since = 그 팀 감독을 맡은 해 (오래 할수록 계약 만료로 바뀔 확률이 올라감)
const MANAGER_SINCE = {
  "KIA 타이거즈": 2024,
  "두산 베어스": 2026,
  "롯데 자이언츠": 2024,
  "NC 다이노스": 2025,
  "LG 트윈스": 2023,
  "한화 이글스": 2024,
  "KT 위즈": 2019,
  "삼성 라이온즈": 2023,
  "SSG 랜더스": 2024,
  "키움 히어로즈": 2026,
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
const NEW_MANAGER_NAMES = [
  "정민혁",
  "배성훈",
  "남궁현",
  "조태민",
  "문재석",
  "황보준",
  "구동현",
  "엄태율",
  "변상우",
  "석진호",
  "류건우",
  "탁영민",
  "공태현",
  "여민수",
  "기성준",
  "명재훈",
  "추현석",
  "하도겸",
  "봉준혁",
  "편승우",
];
