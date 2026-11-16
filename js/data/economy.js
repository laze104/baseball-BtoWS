// =============================================
// economy.js : 돈 (최저연봉·계약금)과 쇼핑 목록
// 금액은 모두 "만원" 단위, 2026년 기준 (물가에 따라 자동으로 오름)
// =============================================

const MONEY = {
  kboMin: 3000, // KBO 최저연봉
  futuresMin: 3000,
  indieSalary: 300, // 월급 없이 출전수당 정도 (선수들이 회비를 내는 구단도 많음)
  ablSalary: 1200, // 호주리그 외국인 선수: 시즌 3개월 + 숙소 제공
  mlbMin: 110000, // MLB 최저연봉 약 76만 달러 ≈ 11억
  draftBonus: [50000, 20000, 12000, 9000, 7000, 6000, 5000, 4500, 4000, 3500, 3000], // 1~11라운드 계약금
  sangmuSalary: 2400, // 병사 급여 수준 (연)
  socialSalary: 1500,
};

// 쇼핑 (가격 단위: 만원, 2026년 물가 기준)
// service: 해마다 돈이 나가는 계약 (1·3·5년 중 고름) / fame: 살 때 팬 여론 변화 / effect: 게임 효과
// recovery(회복 장비)는 부상 확률을 20% 줄여줌
const SHOP_ITEMS = [
  // 전담 스태프 (연 단위 계약)
  { id: "trainer", cat: "전담 스태프", name: "개인 트레이너", price: 8000, service: true, desc: "집중 훈련 성장 +1" },
  { id: "rehab", cat: "전담 스태프", name: "전담 재활 트레이너", price: 12000, service: true, desc: "부상 확률 절반" },
  { id: "mental", cat: "전담 스태프", name: "멘탈 코치", price: 5000, service: true, desc: "슬럼프 확률 절반" },
  { id: "chef", cat: "전담 스태프", name: "전담 셰프·영양사", price: 4000, service: true, desc: "30대 이후 능력치 하락 조금 완화" },
  { id: "analyst", cat: "전담 스태프", name: "개인 전력분석관", price: 6000, service: true, desc: "결정적 순간 성공 확률 +5%" },
  // 집
  { id: "oneroom", cat: "집", name: "원룸 전세", price: 15000, desc: "숙소 탈출. 마음이 편해져요." },
  { id: "officetel", cat: "집", name: "구단 근처 고급 오피스텔", price: 35000, desc: "출퇴근 5분. 훈련 끝나면 바로 휴식." },
  { id: "apartment", cat: "집", name: "수도권 아파트", price: 120000, desc: "내 집 마련 성공!" },
  { id: "jeju", cat: "집", name: "제주도 오션뷰 별장", price: 250000, desc: "비시즌엔 바다 보며 재충전." },
  { id: "gangnam", cat: "집", name: "강남 아파트", price: 400000, desc: "야구로 강남 입성." },
  { id: "tokyo", cat: "집", name: "도쿄 미나토구 타워맨션", price: 500000, desc: "롯폰기힐스가 내려다보여요." },
  { id: "hannam", cat: "집", name: "한남동 펜트하우스", price: 1200000, desc: "연예인들이 이웃.", fame: 2 },
  { id: "manhattan", cat: "집", name: "뉴욕 맨해튼 펜트하우스", price: 3000000, desc: "센트럴파크 뷰. 성공한 해외파의 상징.", fame: 3 },
  { id: "beverly", cat: "집", name: "베벌리힐스 대저택", price: 6000000, desc: "방 12개, 수영장 3개, 할리우드 스타가 옆집.", fame: 5 },
  // 탈것
  { id: "car", cat: "탈것", name: "국산 SUV", price: 5000, desc: "출퇴근이 편해졌어요." },
  { id: "supercar", cat: "탈것", name: "수입 스포츠카", price: 35000, desc: "팬들 반응이 갈려요.", fame: -1 },
  { id: "rolls", cat: "탈것", name: "최고급 세단 (기사 포함)", price: 70000, desc: "뒷좌석에서 경기 영상 분석." },
  { id: "hypercar", cat: "탈것", name: "한정판 하이퍼카", price: 450000, desc: "전 세계 500대. 직관 주차장이 술렁여요.", fame: -2 },
  { id: "yacht", cat: "탈것", name: "슈퍼요트", price: 2500000, desc: "지중해에서 비시즌을.", fame: -2 },
  { id: "jet", cat: "탈것", name: "개인 전용기", price: 8000000, desc: "원정 이동도 내 비행기로.", fame: -3 },
  // 야구
  { id: "gym", cat: "야구", name: "개인 실내 훈련장", price: 150000, desc: "비시즌에도 감 유지 (안 고른 능력치 하락 확률 절반)" },
  { id: "academy", cat: "야구", name: "유소년 야구 아카데미", price: 300000, desc: "후배 양성. 은퇴 후 명예 +", fame: 3 },
  { id: "alma", cat: "야구", name: "모교 야구장 리모델링 기부", price: 200000, desc: "모교 후배들이 울었다.", fame: 4 },
  { id: "museum", cat: "야구", name: "내 이름 딴 야구 박물관", price: 1000000, desc: "배트·글러브·우승 반지 전시.", fame: 3 },
  { id: "club", cat: "야구", name: "독립리그 구단 인수", price: 3000000, desc: "구단주 겸 선수. 은퇴 후 2막 준비 완료.", fame: 4 },
  // 가족·기부
  { id: "parents", cat: "가족·기부", name: "부모님 집 선물", price: 60000, desc: "효도 완료. 팬들이 좋아해요.", fame: 3 },
  { id: "parentsCar", cat: "가족·기부", name: "부모님 차 선물", price: 8000, desc: "아버지가 동네방네 자랑하세요.", fame: 1 },
  { id: "donation", cat: "가족·기부", name: "소아암 병동 기부", price: 50000, desc: "조용히 했는데 기사가 났어요.", fame: 5 },
  { id: "foundation", cat: "가족·기부", name: "내 이름 장학재단 설립", price: 500000, desc: "야구 꿈나무 장학금.", fame: 6 },
  // 사치
  { id: "watch", cat: "사치", name: "명품 시계", price: 12000, desc: "인터뷰 때마다 손목이 반짝." },
  { id: "art", cat: "사치", name: "현대미술 컬렉션", price: 300000, desc: "거실에 걸린 그림 한 점이 집값." },
  { id: "building", cat: "사치", name: "건물주 되기", price: 1500000, desc: "은퇴 후도 걱정 없음." },
  { id: "island", cat: "사치", name: "남태평양 개인 섬", price: 15000000, desc: "전설만 살 수 있는 섬.", fame: -2 },
  // ---------- 2차로 늘린 물건들 ----------
  // 집
  { id: "hometown", cat: "집", name: "고향 단독주택", price: 30000, desc: "마당에서 티배팅 가능." },
  { id: "haeundae", cat: "집", name: "부산 해운대 오션뷰", price: 180000, desc: "광안대교 야경이 한눈에." },
  { id: "hawaii", cat: "집", name: "하와이 별장", price: 900000, desc: "비시즌 개인 훈련은 와이키키에서." },
  // 탈것
  { id: "ev", cat: "탈것", name: "전기차", price: 6000, desc: "조용하고 친환경. 팬들이 좋아해요.", fame: 1 },
  { id: "camper", cat: "탈것", name: "캠핑카", price: 15000, desc: "가족·동료들과 비시즌 캠핑." },
  { id: "heli", cat: "탈것", name: "개인 헬리콥터", price: 1500000, desc: "구장 옥상에 착륙하면 화제는 확실.", fame: -2 },
  // 야구
  { id: "machine", cat: "야구", name: "피칭·배팅 머신 세트", price: 20000, desc: "집 차고가 연습장." },
  { id: "recovery", cat: "야구", name: "산소 캡슐·회복 장비", price: 40000, desc: "부상 확률 20% 감소" },
  { id: "tracker", cat: "야구", name: "투구·타구 추적 장비", price: 60000, desc: "회전수·발사각까지 다 보여요." },
  { id: "little", cat: "야구", name: "고향 리틀야구단 후원", price: 30000, desc: "꼬마들 유니폼에 내 이름.", fame: 2 },
  { id: "camp", cat: "야구", name: "야구 꿈나무 캠프 개최", price: 80000, desc: "비시즌마다 아이들과 캐치볼.", fame: 3 },
  { id: "youtube", cat: "야구", name: "야구 유튜브 채널 개설", price: 10000, desc: "구독자 100만 가자!", fame: 2 },
  // 가족·기부
  { id: "coal", cat: "가족·기부", name: "연탄 나눔 봉사", price: 3000, desc: "얼굴에 검댕 묻은 사진이 화제.", fame: 2 },
  { id: "coffee", cat: "가족·기부", name: "팬클럽 커피차 선물", price: 2000, desc: "역조공으로 팬들 감동.", fame: 2 },
  { id: "elderly", cat: "가족·기부", name: "독거 어르신 지원", price: 20000, desc: "매달 꾸준히, 조용히.", fame: 3 },
  { id: "disaster", cat: "가족·기부", name: "재난 구호 성금", price: 100000, desc: "큰 금액을 선뜻 기부.", fame: 4 },
  { id: "eduFund", cat: "가족·기부", name: "자녀 교육 펀드", price: 100000, desc: "아이들 미래는 든든하게." },
  // 사치
  { id: "suit", cat: "사치", name: "명품 맞춤 슈트", price: 5000, desc: "시상식 레드카펫 준비 완료." },
  { id: "sneakers", cat: "사치", name: "한정판 스니커즈 컬렉션", price: 20000, desc: "드레스룸 한쪽 벽이 전부 신발." },
  { id: "ball", cat: "사치", name: "레전드 사인볼 컬렉션", price: 50000, desc: "어릴 적 우상들의 사인." },
  { id: "wine", cat: "사치", name: "와인 셀러", price: 80000, desc: "시즌 끝나고 한 잔." },
  { id: "golf", cat: "사치", name: "골프장 회원권", price: 500000, desc: "비시즌 라운딩은 여기서.", fame: -1 },
  { id: "esports", cat: "사치", name: "e스포츠 팀 인수", price: 2000000, desc: "야구 말고도 우승 반지를!", fame: 2 },
  { id: "soccer", cat: "사치", name: "유럽 축구팀 지분 인수", price: 6000000, desc: "구단주석에서 챔피언스리그 관람.", fame: 1 },
];
