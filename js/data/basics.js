// =============================================
// basics.js : 능력치·포지션·플레이 스타일 같은 기본 값
// 이름이나 숫자를 바꾸고 싶으면 data 폴더 파일만 고치면 됨 (계산하는 코드는 여기 없음)
// =============================================

// 게임 시작 연도와 물가
const START_YEAR = 2026; // 16세 = 2026년
const INFLATION = 0.03; // 매년 물가 3%씩 오름

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
