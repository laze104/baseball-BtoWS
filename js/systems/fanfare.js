// =============================================
// fanfare.js : 등번호 + 응원가
// 등번호: 선수 만들 때 고름. 프로 팀 옮기면 가끔 주인 있어서 다른 번호
// 응원가: 프로 오면 생김. 인기(팬 여론)·프랜차이즈면 버전 업. 팀 옮기면 1단계부터
// 가사는 전부 게임용 창작
// =============================================

// 번호별 커뮤 반응 (없으면 기본)
const NUMBER_TALK = {
  1: "1번은 아무나 다는 거 아님",
  7: "럭키 세븐 ㄱㄱ",
  10: "10번이면 에이스 번호지",
  11: "11번 = 에이스 국룰",
  17: "17번 무게 아는 사람?",
  18: "18번은 투수 로망",
  27: "27번 포수면 인정",
  33: "33번 거포 느낌 난다",
  44: "44번 묵직하다",
  51: "51번 = 외야수 감성",
  52: "52번 거포 번호 아니냐",
  99: "99번 패기 미쳤다 ㅋㅋ",
};

function initNumber(player) {
  if (player.number === undefined || player.number === null || player.number === "") player.number = randomInt(1, 99);
  if (!player.numberLog) player.numberLog = [{ team: player.team, num: player.number }];
}

// 프로 팀 바뀌면 번호 다시 받기 (25%는 이미 주인 있음)
function numberSeason(player, report) {
  initNumber(player);
  const last = player.numberLog[player.numberLog.length - 1];
  if (!last || last.team === player.team) return;
  if (isAmateur(player.league)) {
    player.numberLog.push({ team: player.team, num: player.number });
    return;
  }
  const want = player.wantNumber || player.number;
  let num = want;
  let line;
  if (Math.random() < 0.25) {
    num = pick([want + 10, want - 10, 0, want + 1, want + 50].filter((n) => n >= 0 && n <= 99 && n !== want));
    line = `${player.team}에서는 ${want}번 주인이 따로 있어서 ${num}번을 받았어요`;
    report.news.push(`${player.name}, ${player.team}에서 ${num}번… "${want}번은 선배님 번호라"`);
  } else {
    line = `${player.team}에서도 ${num}번을 달아요`;
    report.news.push(`${player.name}, ${player.team} 유니폼에도 ${num}번`);
  }
  player.wantNumber = want;
  player.number = num;
  player.numberLog.push({ team: player.team, num });
  report.events.push(`등번호 ${num}`);
  moreComments(player, report, [NUMBER_TALK[num] || `${num}번 유니폼 사러 간다`, `${num}번 마킹 벌써 품절이냐`], 1);
  return line;
}

// ---------- 응원가 ----------
const CHANT_LYRICS = {
  bat: [
    "{name}! {name}! 날려라 {name}! 오오오오~ {name}!",
    "{team}의 {name}, 그 이름을 외쳐라! 담장을 넘겨라~ 오오 {name}!",
    "우리가 기다린 그 순간, {num}번 {name}! 하늘 높이 날려라~ 영원한 우리의 {name}!",
  ],
  pit: [
    "삼진! 삼진! {name}! 잡아라 {name}! 오오~",
    "{team}의 {name}, 마운드의 주인! 던져라 던져라~ 오오 {name}!",
    "{num}번 {name}이 마운드에 오르면, 우리는 노래해~ 승리의 노래를!",
  ],
};
const CHANT_NAME = ["첫 응원가", "정식 응원가", "떼창 응원가"];

// 지금 받아야 할 응원가 단계 (0 = 아직 없음)
function chantLevelFor(player) {
  if (!["KBO", "NPB"].includes(player.league)) return 0; // 응원가는 KBO·NPB 1군만
  const fame = player.fame || 0;
  if (isFranchiseHere(player) || fame >= 60) return 3;
  if (fame >= 25 || (player.awards["올스타"] || 0) >= 1) return 2;
  return 1;
}

function chantText(player, lv) {
  const side = player.type === "pitcher" ? "pit" : "bat";
  return CHANT_LYRICS[side][lv - 1].replaceAll("{name}", player.name).replaceAll("{team}", player.team.split(" ")[0]).replaceAll("{num}", player.number);
}

function chantSeason(player, report) {
  const lv = chantLevelFor(player);
  if (!lv) return;
  const moved = player.chantTeam && player.chantTeam !== player.team;
  if (moved) player.chantLv = 0; // 팀 옮기면 새로
  if (lv <= (player.chantLv || 0)) return;
  player.chantLv = lv;
  player.chantTeam = player.team;
  const text = chantText(player, lv);
  report.news.push(`${player.team} 응원단, ${player.name} ${CHANT_NAME[lv - 1]} 공개`);
  report.bigMoments = report.bigMoments || [];
  report.bigMoments.push({
    tone: "good",
    cls: "chant-moment",
    kicker: `${player.team} 응원단 · ${moved ? "새 팀" : `Lv.${lv}`}`,
    title: `🎵 ${CHANT_NAME[lv - 1]}`,
    lines: [`<span class="chant">${text}</span>`],
  });
  moreComments(player, report, FAN.chant, 2);
}

// 훈련 탭 머리에 붙는 응원가 한 줄
function chantHtml(player) {
  if (!player.chantLv) return "";
  return `<details class="chant-box"><summary>🎵 내 응원가 <small>${CHANT_NAME[player.chantLv - 1]}</small></summary><p class="chant">${chantText(player, player.chantLv)}</p>
    ${player.chantLv < 3 ? `<p class="small">인기가 오르거나 프랜차이즈 스타가 되면 새 버전이 나와요.</p>` : ""}</details>`;
}

FAN.chant = [
  "응원가 중독성 미쳤다 ㅋㅋ",
  "직관 가서 목 터지게 부른다",
  "이거 떼창하면 소름 돋겠다",
  "응원단장 일 잘하네",
  "출근길에 흥얼거리는 중",
  "{name} 타석 기다려지는 이유 하나 추가",
];

// 영구결번 기사에 번호 넣기
