// =============================================
// util.js : 여러 파일에서 같이 쓰는 작은 함수들
// 게임 규칙 없음. 다른 파일보다 먼저 읽힘
// =============================================

// ---------- 랜덤 ----------

// min~max 정수 (양 끝 포함)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 리스트에서 하나
function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// 섞은 복사본 (피셔-예이츠). 원본은 안 건드림
// sort(() => Math.random() - 0.5) 는 앞쪽이 덜 섞여서 안 씀
function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 리스트에서 겹치지 않게 n개
function pickMany(list, n) {
  return shuffle(list).slice(0, n);
}

// ---------- 숫자 ----------

// 값을 min~max 사이로 고정
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// 소수점 자리 맞추기: round(0.31234, 3) → 0.312
function round(value, digits) {
  const p = Math.pow(10, digits);
  return Math.round(value * p) / p;
}

// ---------- 화면 ----------

// HTML 요소 가져오기
const $ = (id) => document.getElementById(id);

// ---------- 저장 (localStorage) ----------
// 시크릿 창·저장 공간 꽉 참·깨진 데이터에서도 게임이 안 멈추게 try로 감쌈

function loadJSON(key, fallback) {
  try {
    const text = localStorage.getItem(key);
    return text ? (JSON.parse(text) ?? fallback) : fallback;
  } catch (e) {
    return fallback;
  }
}

// 성공하면 true
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}
