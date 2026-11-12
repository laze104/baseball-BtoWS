// =============================================
// backup.js : 저장 내보내기·불러오기 (시작 화면에만 있음)
// 브라우저 저장(localStorage)에 있는 것 전부를 .json 파일 하나로 내려받고, 그 파일로 되돌림
// 진행 중인 선수 + 역대 랭킹 + 명예의 전당 + 업적
// 다른 기기로 옮기거나, 캐시 지우기 전에 백업할 때 씀
// =============================================

const BACKUP_GAME = "baseball-BtoWS"; // 이 게임 파일인지 확인용
const BACKUP_KEYS = ["baseball-save", "baseball-ranking", "baseball-hof", "baseball-achievements"];

function backupMsg(text, bad) {
  const el = $("backup-msg");
  if (!el) return;
  el.textContent = text;
  el.className = "small" + (bad ? " bad" : " good");
}

function exportBackup() {
  const keys = {};
  for (const k of BACKUP_KEYS) {
    try {
      const v = localStorage.getItem(k);
      if (v) keys[k] = v;
    } catch (e) {
      // 시크릿 창 등: 못 읽는 건 건너뜀
    }
  }
  if (!Object.keys(keys).length) {
    backupMsg("아직 저장된 기록이 없어요.", true);
    return;
  }
  const data = { game: BACKUP_GAME, ver: 1, at: new Date().toISOString(), version: ($("version") || {}).textContent || "", keys };
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `baseball-save-${ymd}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  const ranking = keys["baseball-ranking"] ? JSON.parse(keys["baseball-ranking"]).length : 0;
  backupMsg(`내보냄: ${keys["baseball-save"] ? "진행 중인 선수 + " : ""}역대 선수 ${ranking}명`);
}

// 파일 내용 확인 → 이 게임 저장 파일이 아니면 아무것도 안 바꿈
function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return null;
  }
  if (!data || data.game !== BACKUP_GAME || !data.keys || typeof data.keys !== "object") return null;
  for (const k of Object.keys(data.keys)) {
    if (!BACKUP_KEYS.includes(k) || typeof data.keys[k] !== "string") return null;
    try {
      JSON.parse(data.keys[k]); // 안에 든 것도 깨지지 않았는지
    } catch (e) {
      return null;
    }
  }
  return data;
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const data = parseBackup(String(reader.result));
    if (!data) {
      backupMsg("이 게임 저장 파일이 아니에요. 아무것도 안 바꿨어요.", true);
      return;
    }
    const when = data.at ? data.at.slice(0, 10) : "?";
    if (!confirm(`${when}에 내보낸 기록으로 바꿀까요?\n지금 이 기기에 있는 선수·랭킹은 파일 내용으로 덮어써져요.`)) return;
    try {
      for (const k of BACKUP_KEYS) {
        if (data.keys[k]) localStorage.setItem(k, data.keys[k]);
        else localStorage.removeItem(k);
      }
    } catch (e) {
      backupMsg("저장 공간에 쓰지 못했어요 (시크릿 창이면 안 될 수 있어요).", true);
      return;
    }
    location.reload(); // 불러온 선수로 다시 시작
  };
  reader.readAsText(file);
}

$("export-btn").addEventListener("click", exportBackup);
$("import-file").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) importBackup(file);
  event.target.value = ""; // 같은 파일 다시 골라도 동작하게
});
