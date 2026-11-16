// =============================================
// schools.js : 고등학교·대학교 야구부와 아마추어 대회
// =============================================

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
  // 2차로 늘린 학교들
  { name: "경기고", level: 1 },
  { name: "경동고", level: 1 },
  { name: "서울디자인고", level: 1 },
  { name: "서울컨벤션고", level: 1 },
  { name: "부천고", level: 1 },
  { name: "소래고", level: 1 },
  { name: "비봉고", level: 1 },
  { name: "라온고", level: 1 },
  { name: "속초상고", level: 1 },
  { name: "설악고", level: 1 },
  { name: "대전제일고", level: 1 },
  { name: "동성고", level: 2 },
  { name: "순천효천고", level: 1 },
  { name: "제주고", level: 1 },
  { name: "포항제철고", level: 1 },
  { name: "김해고", level: 2 },
  { name: "부경고", level: 1 },
  { name: "부산정보고", level: 1 },
  { name: "물금고", level: 1 },
  // 내가 다녔던 학교들 (재미로 넣음, 야구부 전력은 최하 level 0)
  { name: "성지고", level: 0 },
  { name: "인제고", level: 0 },
];

// 고교야구: 권역별 주말리그(전반기·후반기) + 5개 전국대회
const HS_REGIONS = {
  "서울": [
    "덕수고",
    "서울고",
    "휘문고",
    "장충고",
    "충암고",
    "신일고",
    "배재고",
    "선린인터넷고",
    "배명고",
    "성남고",
    "경기상고",
    "중앙고",
    "경기고",
    "경동고",
    "서울디자인고",
    "서울컨벤션고",
  ],
  "경기·인천": ["인천고", "유신고", "야탑고", "동산고", "장안고", "안산공고", "제물포고", "부천고", "소래고", "비봉고", "라온고", "성지고", "인제고"],
  "부산·경남": ["경남고", "부산고", "마산용마고", "개성고", "마산고", "김해고", "부경고", "부산정보고", "물금고"],
  "대구·경북": ["경북고", "대구고", "상원고", "경주고", "포항제철고"],
  "충청·강원": ["천안북일고", "세광고", "대전고", "강릉고", "청주고", "공주고", "원주고", "속초상고", "설악고", "대전제일고"],
  "호남·제주": ["광주제일고", "군산상일고", "진흥고", "전주고", "화순고", "동성고", "순천효천고", "제주고"],
};

function hsRegion(name) {
  return Object.keys(HS_REGIONS).find((r) => HS_REGIONS[r].includes(name)) || "";
}

// rounds: 우승까지 이겨야 하는 경기 수 / qualify: 주말리그 성적으로 본선 진출
const HS_CUPS = [
  { name: "이마트배", rounds: 7 }, // 전국 모든 팀 참가
  { name: "황금사자기", rounds: 6, qualify: "전반기" },
  { name: "청룡기", rounds: 6, qualify: "전반기" },
  { name: "대통령배", rounds: 6, qualify: "후반기" },
  { name: "봉황대기", rounds: 7 }, // 전국 모든 팀 참가
];

// 대학 야구부 (tier: 스카우트들이 보는 야구부 전력 3 = 상위권, 2 = 중위권, 1 = 신생·하위권)
const COLLEGES = [
  { name: "고려대", tier: 3 },
  { name: "연세대", tier: 3 },
  { name: "성균관대", tier: 3 },
  { name: "한양대", tier: 3 },
  { name: "동국대", tier: 3 },
  { name: "동아대", tier: 3 },
  { name: "원광대", tier: 3 },
  { name: "강릉영동대", tier: 3 },
  { name: "경희대", tier: 2 },
  { name: "인하대", tier: 2 },
  { name: "건국대", tier: 2 },
  { name: "단국대", tier: 2 },
  { name: "중앙대", tier: 2 },
  { name: "홍익대", tier: 2 },
  { name: "동의대", tier: 2 },
  { name: "경성대", tier: 2 },
  { name: "영남대", tier: 2 },
  { name: "계명대", tier: 2 },
  { name: "한일장신대", tier: 2 },
  { name: "송원대", tier: 2 },
  { name: "서울대", tier: 1 },
  { name: "가톨릭관동대", tier: 1 },
  { name: "송호대", tier: 1 },
  { name: "수성대", tier: 1 },
  { name: "김천대", tier: 1 },
  { name: "경일대", tier: 1 },
  { name: "세한대", tier: 1 },
  { name: "호원대", tier: 1 },
];

// 대학야구: KUSF U-리그 조별리그(조 1~5위 왕중왕전) + 전국 대회
const COLLEGE_CUPS = [
  { name: "U-리그 왕중왕전", rounds: 5, qualify: "uleague" },
  { name: "전국대학야구선수권", rounds: 5 },
  { name: "대통령기 대학야구", rounds: 5 },
];
