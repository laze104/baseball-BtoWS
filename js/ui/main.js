// =============================================
// main.js : 버튼 연결 + 시작
// index.html 에서 맨 마지막에 읽힘
// =============================================

// ---------------------------------------------
// 버튼 연결
// ---------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const player = createPlayer({
    name: $("name").value.trim(),
    type: typeSelect.value,
    position: positionSelect.value,
    hand: $("hand").value,
    school: schoolSelect.value,
    style: styleSelect.value,
  });
  // 등번호, 서포트 카드
  const num = parseInt($("number").value, 10);
  player.number = Number.isNaN(num) ? randomInt(1, 99) : clamp(num, 0, 99);
  player.wantNumber = player.number;
  player.numberLog = [{ team: player.team, num: player.number }];
  setDeck(player, pickedDeck());
  savePlayer(player);
  showPlayer(player);
  setTab("train");
});

seasonButton.addEventListener("click", () => {
  if (currentPlayer.pendingChoice) {
    // 혹시 모를 경우 한 번 더 막음
    choicePanel.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (usesPhases(currentPlayer)) {
    phaseStep(currentPlayer); // 스프링캠프 → 전반기 → 후반기 → 가을야구
    return;
  }
  const report = runSeason(currentPlayer, getCheckedFocus());
  currentPlayer.lastReport = report;
  savePlayer(currentPlayer);
  showPlayer(currentPlayer);
  setTab("result");
  window.scrollTo({ top: 0, behavior: "smooth" });
  showBigMoments(seasonBigMoments(report)); // 수상하면 큰 화면으로
  showToasts(report.toasts); // 작은 기록은 토스트 (effects.js)
});

retireButton.addEventListener("click", () => {
  if (!confirm("정말 은퇴할까요? 기록이 랭킹에 올라가요.")) return;
  retirePlayer(currentPlayer);
  localStorage.removeItem(SAVE_KEY);
  showRetired(currentPlayer);
});

// 빠른 진행 켜기·끄기 (effects.js)
$("fast-button").textContent = fastLabel();
$("fast-button").classList.toggle("on", fastMode);
$("fast-button").addEventListener("click", toggleFast);

$("reset-button").addEventListener("click", () => {
  if (!confirm("정말 처음부터 다시 할까요? 지금 선수는 사라져요.")) return;
  localStorage.removeItem(SAVE_KEY);
  playerScreen.hidden = true;
  renderDeckPicker();
  createScreen.hidden = false;
});

$("new-player-button").addEventListener("click", () => {
  retiredScreen.hidden = true;
  renderDeckPicker(); // 방금 은퇴한 선수가 레전드 카드로 나올 수 있음
  createScreen.hidden = false;
});

// ---------------------------------------------
// 시작
// ---------------------------------------------

// 시작할 때 저장된 선수가 있으면 바로 보여줌
// 파일 맨 끝에 둬야 함 (위에서 const 로 만든 PS_NAMES 등이 다 준비된 뒤에 실행)
const saved = loadPlayer();
if (saved) showPlayer(saved);
