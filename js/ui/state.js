// =============================================
// state.js : 화면 요소, 지금 키우는 선수, 저장·불러오기
// ui 파일 중 제일 먼저 읽혀야 함 (다른 파일들이 여기 있는 것들을 씀)
// =============================================

const SAVE_KEY = "baseball-save"; // localStorage에 저장할 때 쓰는 이름

const createScreen = $("create-screen");
const playerScreen = $("player-screen");
const retiredScreen = $("retired-screen");
const form = $("create-form");
const typeSelect = $("type");
const positionSelect = $("position");
const schoolSelect = $("school");
const styleSelect = $("style");
const focusList = $("focus-list");
const seasonPanel = $("season-panel");
const seasonButton = $("season-button");
const retireButton = $("retire-button");
const choicePanel = $("choice-panel");

let currentPlayer = null; // 지금 플레이 중인 선수

// ---------------------------------------------
// 저장 / 불러오기
// ---------------------------------------------

function savePlayer(player) {
  if (!saveJSON(SAVE_KEY, player)) console.warn("저장 실패: 브라우저 저장 공간 확인 필요");
}

function loadPlayer() {
  const player = loadJSON(SAVE_KEY, null);
  if (!player) return null;
  if (!player.season) player.season = 1;
  initCareer(player);
  // 예전 버전 저장 데이터: 댓글 형식이 달라서 새로 만듦
  if (player.lastReport && !player.lastReport.comments) player.lastReport = null;
  return player;
}
