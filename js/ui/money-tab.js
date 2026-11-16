// =============================================
// money-tab.js : 재산 탭 (쇼핑, 전담 스태프)
// =============================================

function showMoney(player) {
  const box = $("tab-money");
  const c = player.contract;
  let html = `<div class="money-top"><span>보유 자산</span><b>${fmtMoney(player.money)}</b></div>`;
  if (c) {
    html += `<p>계약: ${c.team} (${LEAGUES[c.league] ? LEAGUES[c.league].name : ""}) · 연봉 <b>${fmtMoney(c.salary)}</b>`;
    if (c.isFA) html += ` · ${c.total ? `총액 ${fmtMoney(c.total)} · ` : ""}남은 기간 ${c.years}년`;
    html += "</p>";
  } else {
    html += "<p>아직 아마추어라 수입이 없어요.</p>";
  }
  html += serviceHtml(player);
  html += agentHtml(player); // 에이전트 (agent.js)
  html += `<p class="small">연봉의 65%가 저축돼요 (세금·생활비 제외). 가격은 ${gameYear(player)}년 물가 기준이에요.</p>`;

  html += shopHtml(player);
  box.innerHTML = html;
}

$("tab-money").addEventListener("click", (event) => {
  if (event.target.dataset.fireAgent) {
    if (!confirm(`${currentPlayer.agent.name}와 에이전트 계약을 끝낼까요? 지금 계약 수수료는 계약이 끝날 때까지 계속 나가요.`)) return;
    const line = `${currentPlayer.name}, ${currentPlayer.agent.name}와 결별`;
    currentPlayer.agent = null;
    addReaction(currentPlayer, currentPlayer.lastReport, [line], FAN.contract, {});
    savePlayer(currentPlayer);
    showPlayer(currentPlayer);
    setTab("money");
    return;
  }
  const hire = event.target.dataset.hire;
  if (hire) {
    const years = Number(event.target.dataset.years);
    const item = SHOP_ITEMS.find((i) => i.id === hire);
    const fee = serviceFee(currentPlayer, item, years);
    if (!confirm(`${item.name}와 ${years}년 계약할까요? 해마다 ${fmtMoney(fee)}씩 나가요 (올해 분은 지금 결제).`)) return;
    if (hireService(currentPlayer, hire, years)) {
      const line = `${currentPlayer.name}, ${item.name}와 ${years}년 계약… 몸 관리에 진심`;
      addReaction(currentPlayer, currentPlayer.lastReport, [line], FAN.shopping, { item: item.name });
      savePlayer(currentPlayer);
      showPlayer(currentPlayer);
      setTab("money");
    }
    return;
  }
  const id = event.target.dataset.buy;
  if (!id) return;
  const item = SHOP_ITEMS.find((i) => i.id === id);
  if (!confirm(`${item.name}을(를) ${fmtMoney(itemPrice(currentPlayer, item))}에 살까요?`)) return;
  if (buyItem(currentPlayer, id)) {
    const line = fillText(NEWS.special.shopping, currentPlayer, { item: item.name });
    addReaction(currentPlayer, currentPlayer.lastReport, [line], FAN.shopping, { item: item.name });
    savePlayer(currentPlayer);
    showPlayer(currentPlayer);
    setTab("money");
  }
});

// FA·포스팅·서비스타임 현황 (실제 규정)
function serviceHtml(player) {
  if (isAmateur(player.league)) return "";
  const s = player.kboService || 0;
  let html = `<div class="service"><h4>FA·해외 진출 현황</h4><p>KBO 1군 등록 <b>${s}시즌</b> (${player.collegeGrad ? "대졸" : "고졸"} FA 기준 ${kboFaNeeded(player)}시즌)`;
  const left = seasonsToFa(player);
  html += left > 0 ? ` · FA까지 <b>${left}시즌</b>` : " · <b>FA 자격 있음</b>";
  html += `</p><p>포스팅: ${s >= FA_RULES.posting ? "자격 있음 (구단 동의 필요)" : `1군 ${FA_RULES.posting}시즌부터 (${FA_RULES.posting - s}시즌 남음)`}`;
  if (player.faCount) html += ` · FA 계약 ${player.faCount}회`;
  html += "</p>";
  if (player.mlbService)
    html += `<p>MLB 서비스타임 <b>${player.mlbService}년</b> · ${player.mlbService >= 6 ? "FA 가능" : player.mlbService >= 3 ? "연봉조정 대상" : "연봉조정 전"}</p>`;
  if (player.kboRights) html += `<p class="small">KBO 복귀 시 보류권: ${player.kboRights}</p>`;
  html += `<p class="small">1군 등록일수 145일(시즌의 약 78%)을 채운 해만 1시즌으로 쳐요. 2군·상무·해외 기간은 빠져요. FA 계약 뒤 다시 FA가 되려면 1군 4시즌이 필요해요.</p></div>`;
  return html;
}

// 쇼핑: 분류별, 전담 스태프는 1·3·5년 계약
function shopHtml(player) {
  let html = "<h4>쇼핑</h4>";
  const cats = [...new Set(SHOP_ITEMS.map((i) => i.cat))];
  for (const cat of cats) {
    html += `<h5 class="shop-cat">${cat}</h5><ul class="shop">`;
    for (const item of SHOP_ITEMS.filter((i) => i.cat === cat)) {
      if (item.service) {
        const s = player.services[item.id];
        let right;
        if (s) {
          right = `<span class="owned-tag">계약 중 · 남은 ${s.left}년 · 연 ${fmtMoney(s.fee)}</span>`;
        } else {
          right = SERVICE_YEARS.map((y) => {
            const fee = serviceFee(player, item, y.years);
            return `<button data-hire="${item.id}" data-years="${y.years}" ${player.money >= fee ? "" : "disabled"}>${y.years}년<small>연 ${fmtMoney(fee)}</small></button>`;
          }).join("");
        }
        html += `<li class="${s ? "owned" : ""}"><div><b>${item.name}</b><small>${item.desc} · 해마다 비용이 나가요</small></div><div class="years">${right}</div></li>`;
      } else {
        const price = itemPrice(player, item);
        const owned = hasItem(player, item.id);
        const canBuy = !owned && player.money >= price;
        const fame = item.fame ? ` · 팬 여론 ${item.fame > 0 ? "+" : ""}${item.fame}` : "";
        html += `<li class="${owned ? "owned" : ""}"><div><b>${item.name}</b><small>${item.desc}${fame}</small></div>
          <button data-buy="${item.id}" ${canBuy ? "" : "disabled"}>${owned ? "보유 중" : fmtMoney(price)}</button></li>`;
      }
    }
    html += "</ul>";
  }
  html += `<p class="small">전담 스태프는 계약할 때 첫해 비용을 내고, 시즌이 끝날 때마다 다음 해 비용이 빠져나가요. 3년 계약은 5%, 5년 계약은 10% 할인.</p>`;
  return html;
}
