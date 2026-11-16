// =============================================
// meeting.js : 감독 면담 화면 (규칙은 systems/manager.js)
// =============================================

// 감독 면담 패널 (비시즌마다 1번)
function meetingHtml(player) {
  if (isAmateur(player.league) || isServing(player)) return "";
  const now = [];
  if (player.role === "closer") now.push("마무리 맡기로 함");
  if (player.lineup === "leadoff") now.push("1번 타자");
  if (player.lineup === "cleanup") now.push("4번 타자");
  if (player.lineup === "pinch") now.push("대타 요원");
  if (player.starterPromise && !player.lineup) now.push("주전 약속");
  if (player.captainTeam === player.team) now.push("주장");
  if (player.restPlan === player.team) now.push("체력 관리");
  if (player.trustTeam === player.team && player.managerTrust) now.push(`감독 신뢰 ${player.managerTrust}/3`);
  if (player.campWish) now.push(`캠프 경쟁 예정: ${MEETING_WISHES.find((w) => w.id === player.campWish.id).short}`);
  const m = managerOf(player);
  const st = MANAGER_STYLES[m.style];
  let html = `<details class="meeting"><summary>🗣️ 감독 면담 <small>(비시즌마다 1번${now.length ? ` · 지금: ${now.join(", ")}` : ""})</small></summary>
    <p class="manager"><b>${managerTitle(player)}</b> · ${st.name}${m.since ? ` · ${Math.max(1, gameYear(player) - m.since + 1)}년째` : ""}<small>${m.note ? `${m.note} · ` : ""}${st.desc}</small></p>
    ${player.league === "KBO" ? managerBoardHtml(player, gameYear(player)) : ""}`;
  if (!canMeetManager(player)) {
    html += `<p class="small">이번 비시즌 면담은 끝났어요. 다음 시즌이 끝나면 다시 찾아갈 수 있어요.</p></details>`;
    return html;
  }
  const wishes = meetingWishes(player);
  if (!wishes.length) return html + `<p class="small">지금은 따로 요청할 게 없어요.</p></details>`;
  html += `<ul class="positions">${wishes.map((w) => `<li><span>${w.label}<small>${w.hint}</small></span><button data-wish="${w.id}">말해 보기</button></li>`).join("")}</ul>`;
  html += `<p class="small">감독은 실력, 최근 성적, 팀 내 입지를 보고 판단해요. 수락이 아니면 스프링캠프 경쟁으로 넘어가거나 거절될 수 있어요.</p></details>`;
  return html;
}
