// =============================================
// growth.js : 선수마다 다른 성장유형 (선수를 만들 때 랜덤으로 정해짐)
// 플레이어에게는 끝까지 안 보여줌. 실제 성장 계산은 career.js growPlayer
// =============================================

// up: 성장하는 나이에 곱하는 값, down: 노쇠하는 나이에 곱하는 값
const GROWTH_TYPES = [
  {
    id: "early",
    name: "조기 완성형",
    weight: 25,
    desc: "어릴 때 쑥쑥 크지만 일찍 꺾여요",
    up: (age) => (age <= 20 ? 1.4 : age <= 23 ? 1.15 : age <= 27 ? 0.7 : 0.4),
    down: 1.3,
  },
  { id: "normal", name: "표준형", weight: 35, desc: "나이에 맞게 평범하게 커요", up: () => 1, down: 1 },
  {
    id: "late",
    name: "대기만성형",
    weight: 20,
    desc: "늦게 터져요. 20대 중후반이 전성기",
    up: (age) => (age <= 20 ? 0.7 : age <= 23 ? 0.95 : age <= 27 ? 1.7 : 2.5),
    down: 0.85,
  },
  { id: "steady", name: "꾸준형", weight: 15, desc: "폭발력은 덜해도 오래 버텨요", up: () => 0.95, down: 0.5 },
  { id: "genius", name: "천재형", weight: 5, desc: "모든 나이에 잘 커요 (아주 드물어요)", up: () => 1.3, down: 0.9 },
];

function rollGrowthType() {
  const total = GROWTH_TYPES.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of GROWTH_TYPES) {
    r -= t.weight;
    if (r < 0) return t.id;
  }
  return "normal";
}

function growthType(player) {
  return GROWTH_TYPES.find((t) => t.id === player.growthType) || GROWTH_TYPES[1];
}

// career.js의 growPlayer가 쓰는 기본 성장량
function typedGrowth(player) {
  const base = baseGrowth(player.age);
  const t = growthType(player);
  return base > 0 ? base * t.up(player.age) : base * t.down;
}
