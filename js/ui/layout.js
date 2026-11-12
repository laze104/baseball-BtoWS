// =============================================
// layout.js : PC 화면 오른쪽 피드 (FM 받은편지함 느낌)
// 화면 넓을 때만 보임 (css @media min-width 1100px), 폰에서는 숨김
// 시즌 상태 / 메일 / 뉴스 / 팬 반응 / 몸 상태 요약, 누르면 해당 탭으로
// =============================================

function sideFeedHtml(player) {
  const ctx = player.cur;
  const r = ctx ? ctx.report : player.lastReport;
  let html = "";

  // 1. 시즌 상태
  const psLive = !ctx && r && (r.postseason || []).some((g) => g.pending); // 결정적 순간 대기 중
  const stage = ctx ? { camp: "개막 대기", half1: "올스타 휴식기", half2: "정규시즌 끝" }[player.phase] || "" : psLive ? "포스트시즌 진행 중" : "비시즌";
  html += `<div class="side-box"><h4>📅 ${gameYear(player)}년 <small>${stage}</small></h4>`;
  if (ctx) html += phaseStepsHtml(player.phase);
  if (r && (r.bat || r.pit)) {
    const parts = [];
    if (r.bat && r.bat.G) parts.push(`타율 ${fmtRate(r.bat.AVG)} ${r.bat.HR}홈런 OPS ${fmtRate(r.bat.OPS)}`);
    if (r.pit && r.pit.G) parts.push(`${r.pit.W}승 ${r.pit.L}패 평균자책 ${r.pit.ERA.toFixed(2)}`);
    html += `<p class="side-line">${ctx ? "지금까지" : psLive ? "정규시즌" : "지난 시즌"} · ${parts.join(" / ")} · WAR <b>${r.WAR}</b></p>`;
  }
  if (r && r.standing && (r.standing.rank || r.standing.rank === 0))
    html += `<p class="side-line">팀 ${r.standing.rank}위 / ${r.standing.teams}팀 · ${r.standing.w}승 ${r.standing.l}패</p>`;
  else if (ctx && ctx.half1) html += `<p class="side-line">전반기 팀 ${ctx.half1.rank}위 / ${ctx.half1.teams}팀</p>`;
  if (ctx) html += injuryStatusHtml(ctx); // injury.js
  if (ctx && ctx.down && !r.minorLine) html += `<p class="side-line">🔽 ${ctx.down.name || "2군"}행 예정</p>`;
  if (ctx && ctx.streak && ctx.streak.live) html += `<p class="side-line">🔥 ${streakWord(ctx.streak)} ${ctx.streak.len}${streakUnit(ctx.streak)} 진행 중</p>`;
  html += "</div>";

  // 2. 메일
  const waiting = unreadMails(player).filter((c) => c.key !== "clutch");
  const log = (player.mailLog || []).slice(0, Math.max(0, 4 - waiting.length));
  if (waiting.length || log.length) {
    html += `<div class="side-box click" onclick="setTab('mail')"><h4>📬 메일 <small>${waiting.length ? `안 읽음 ${waiting.length}` : "모두 읽음"}</small></h4><ul class="side-list">`;
    html += waiting
      .map((c) => {
        const m = mailInfo(c);
        return `<li class="unread"><span>${m.icon} ${m.from}</span>${m.subject}</li>`;
      })
      .join("");
    html += log.map((m) => `<li><span>${m.icon} ${m.from}</span>${m.subject}</li>`).join("");
    html += "</ul></div>";
  }

  // 3. 뉴스
  if (r && r.news && r.news.length) {
    html += `<div class="side-box click" onclick="setTab('${ctx ? "result" : "news"}')"><h4>📰 뉴스</h4><ul class="side-list news">${r.news
      .slice(-6)
      .reverse()
      .map((n) => `<li>${n}</li>`)
      .join("")}</ul></div>`;
  }

  // 4. 팬 반응 (추천 많은 순)
  const lr = player.lastReport;
  if (lr && lr.comments && lr.comments.length) {
    const top = [...lr.comments].sort((a, b) => b.likes - a.likes).slice(0, 4);
    html += `<div class="side-box click" onclick="setTab('board')"><h4>💬 팬 반응 <small>${lr.year} 시즌</small></h4><ul class="side-list fans">${top
      .map((c) => `<li><span>${c.nick === "ㅇㅇ" ? `ㅇㅇ(${c.ip})` : c.nick}</span>${c.text}<em>👍 ${c.likes}</em></li>`)
      .join("")}</ul></div>`;
  }
  return html;
}

function showSideFeed(player) {
  const box = $("side-col");
  if (box) box.innerHTML = sideFeedHtml(player);
}
