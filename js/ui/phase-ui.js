// =============================================
// phase-ui.js : 4구간 시즌 진행 버튼과 스프링캠프 창 (규칙은 systems/phases.js)
// =============================================

function phaseStep(player) {
  if (!player.cur) {
    openCamp(player);
    return;
  }
  if (player.phase === "half2") {
    const report = finishPhased(player);
    player.lastReport = report;
    const shown = report.toastShown || 0;
    savePlayer(player);
    showPlayer(player);
    setTab("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
    showBigMoments(seasonBigMoments(report));
    showToasts((report.toasts || []).slice(shown));
    return;
  }
  if (player.phase === "camp") playFirstHalf(player);
  else playSecondHalf(player);
  afterPhase(player);
}

// 구간 끝날 때마다: 새로 생긴 토스트·큰 알림만 보여줌
function afterPhase(player) {
  const r = player.cur.report;
  const toasts = (r.toasts || []).slice(r.toastShown || 0);
  r.toastShown = (r.toasts || []).length;
  const moments = (r.bigMoments || []).splice(0); // 시즌 끝 화면에서 또 안 나오게 꺼냄
  savePlayer(player);
  showPlayer(player);
  setTab("result");
  window.scrollTo({ top: 0, behavior: "smooth" });
  showBigMoments(moments);
  showToasts(toasts);
}

// 스프링캠프 창: 프로그램 하나 + 시즌 목표 3개
function openCamp(player) {
  if (getCheckedFocus().length !== 2) return;
  const d = campDraft(player);
  savePlayer(player);
  const modal = $("camp-modal");
  const progs = campPrograms(player)
    .map(
      (c, i) =>
        `<label class="camp-prog"><input type="radio" name="camp-prog" value="${c.id}" ${i === 0 ? "checked" : ""}><b>${c.icon} ${c.label}</b><small>${c.detail}</small></label>`,
    )
    .join("");
  const goals = d.goals
    .map(
      (g, i) =>
        `<label class="camp-goal ${g.kind}"><input type="checkbox" value="${i}"><b>${g.label}</b><small>${g.kind === "chal" ? "도전 · 달성하면 인기 +4" : "현실 · 달성하면 인기 +2"}</small></label>`,
    )
    .join("");
  modal.querySelector(".camp-body").innerHTML = `<h3>🌴 ${gameYear(player)}년 스프링캠프 <small>${player.team}</small></h3>
    ${d.expect ? `<p class="expect">🏢 구단 목표: <b>${d.expect.label}</b> <small>${d.expect.desc}</small></p>` : ""}
    <p class="small">📊 데이터팀 예상: ${projectionLine(d.pj)}</p>
    <h4>캠프 프로그램 <small>하나만</small></h4><div class="camp-progs">${progs}</div>
    <h4>올 시즌 목표 <small>3개 고르기 · <span id="camp-count">0</span>/3</small></h4><div class="camp-goals">${goals}</div>
    <p class="small">캠프 끝나고 연습경기를 치러요. 연습경기 성적은 감독이 봐요 (개막 컨디션·면담에 반영).</p>`;
  $("camp-go").disabled = true;
  modal.hidden = false;
}

$("camp-modal").addEventListener("change", (event) => {
  const boxes = [...$("camp-modal").querySelectorAll(".camp-goals input:checked")];
  if (boxes.length > 3) event.target.checked = false;
  const n = $("camp-modal").querySelectorAll(".camp-goals input:checked").length;
  $("camp-count").textContent = n;
  $("camp-go").disabled = n !== 3;
});

$("camp-cancel").addEventListener("click", () => {
  $("camp-modal").hidden = true;
});

$("camp-go").addEventListener("click", () => {
  const modal = $("camp-modal");
  const prog = modal.querySelector("input[name=camp-prog]:checked");
  const goals = [...modal.querySelectorAll(".camp-goals input:checked")].map((x) => Number(x.value));
  if (!prog || goals.length !== 3) return;
  modal.hidden = true;
  startCamp(currentPlayer, getCheckedFocus(), prog.value, goals);
  afterPhase(currentPlayer);
});

// 분석실 '훈련 탭에서 체크하기'
$("tab-analysis").addEventListener("click", (event) => {
  const key = event.target.dataset.focus;
  if (!key || !currentPlayer) return;
  if (currentPlayer.cur) {
    alert("시즌 중이라 집중 훈련은 다음 스프링캠프 때 바꿀 수 있어요.");
    return;
  }
  const boxes = [...focusList.querySelectorAll("input")];
  const target = boxes.find((b) => b.value === key);
  if (!target) return;
  if (!target.checked) {
    const on = boxes.filter((b) => b.checked);
    if (on.length >= 2) on[on.length - 1].checked = false;
    target.checked = true;
  }
  refreshSeasonButton();
  setTab("train");
});
