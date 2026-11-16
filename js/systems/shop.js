// =============================================
// shop.js : 쇼핑과 전담 스태프 계약
// 물건 목록은 data/economy.js SHOP_ITEMS
// =============================================

function itemPrice(player, item) {
  return Math.round(item.price * priceIndex(player));
}

function hasItem(player, id) {
  if (player.services && player.services[id]) return true; // 계약 중인 전담 스태프
  return (player.owned || []).includes(id);
}

function buyItem(player, id) {
  const item = SHOP_ITEMS.find((i) => i.id === id);
  const price = itemPrice(player, item);
  if (item.service || hasItem(player, id) || player.money < price) return false;
  player.money -= price;
  player.owned.push(id);
  if (item.fame) changeFame(player, item.fame);
  return true;
}

// ---------------------------------------------
// 전담 스태프 (연 단위 계약)
// ---------------------------------------------

const SERVICE_YEARS = [
  { years: 1, discount: 1 },
  { years: 3, discount: 0.95 },
  { years: 5, discount: 0.9 },
];

function serviceFee(player, item, years) {
  const d = SERVICE_YEARS.find((s) => s.years === years).discount;
  return Math.round(itemPrice(player, item) * d);
}

// 계약할 때 첫해 비용을 내고, 다음 해부터는 시즌이 끝날 때마다 냄
function hireService(player, id, years) {
  const item = SHOP_ITEMS.find((i) => i.id === id);
  const fee = serviceFee(player, item, years);
  if (hasItem(player, id) || player.money < fee) return false;
  player.money -= fee;
  player.services[id] = { left: years, total: years, fee };
  return true;
}

// payday에서 부름: 남은 기간을 줄이고 다음 해 비용을 냄
function payServices(player, report) {
  for (const [id, s] of Object.entries(player.services || {})) {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    s.left--;
    if (s.left <= 0) {
      delete player.services[id];
      if (report) report.specials.push({ key: "serviceEnd", item: item ? item.name : id });
    } else {
      player.money -= s.fee;
    }
  }
}

// ---------------------------------------------
// 기사 문구
// ---------------------------------------------

Object.assign(NEWS.special, {
  serviceEnd: "{name}, {item} 계약 만료",
});
