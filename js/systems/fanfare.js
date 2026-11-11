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

// ---------- 나라별 응원가 ----------
// KBO: 응원단장이 만든 한국어 응원가 / 해외 갔다 돌아오면 '돌아온' 버전
// NPB: 일본어 응원가 (이름은 가타카나) + 뜻 / MLB: 등장곡 + 영어 구호 / 마이너: 구장 오르간
const CHANT_RETURN = {
  bat: "돌아왔다 {name}! 바다 건너 돌아온 {team}의 {name}! 날려라~ 오오오 {name}!",
  pit: "돌아왔다 {name}! 마운드의 주인이 돌아왔다! 던져라~ 오오 {name}!",
};
const CHANT_NPB = {
  bat: [
    ["かっとばせー {kana}! {kana}! かっとばせー {kana}!", "날려 버려라~ {name}! {name}!"],
    ["燃えろ {team}の {kana} 夢を乗せて 飛ばせ 遥か彼方へ", "불타라 {team}의 {name}, 꿈을 싣고 날려라 저 멀리"],
    ["海を渡った {kana} 我らの誇り 今こそ決めろ ホームラン!", "바다를 건너온 {name}, 우리의 자랑, 지금 끝내라 홈런!"],
  ],
  pit: [
    ["{kana}! 三振だ! {kana}! 打ち取れ!", "{name}! 삼진이다! {name}! 잡아내라!"],
    ["マウンドの {kana} 燃える{arm} 投げ抜け 最後まで", "마운드의 {name}, 불타는 {armKo}, 끝까지 던져라"],
    ["海を渡った {kana} 我らのエース 勝利を掴め!", "바다를 건너온 {name}, 우리의 에이스, 승리를 잡아라!"],
  ],
};
const NPB_TEAM_JP = {
  요미우리: "巨人",
  한신: "阪神",
  소프트뱅크: "ホークス",
  오릭스: "オリックス",
  지바: "ロッテ",
  주니치: "中日",
  야쿠르트: "ヤクルト",
  라쿠텐: "楽天",
  히로시마: "広島",
  요코하마: "横浜",
  세이부: "西武",
  닛폰햄: "日本ハム",
};
const WALKUP_SONGS = ["Seoul Thunder", "Han River Nights", "Neon Dugout", "Midnight in Busan", "Last Inning Fireworks"]; // 가상의 곡
const CHANT_MLB = {
  bat: ['관중: "Let\'s go, {roman}!" 👏👏 👏👏👏', '외야석: "{ROMAN}! {ROMAN}! {ROMAN}!" · 한인 응원단 태극기 등장', '홈 관중 기립: "M-V-P! M-V-P!"'],
  pit: ['관중: "Let\'s go, {roman}!" 👏👏 👏👏👏', '외야석에 삼진마다 K 카드 🅺🅺🅺 · "{ROMAN}! {ROMAN}!"', '2스트라이크마다 기립 박수 · "M-V-P! M-V-P!"'],
};

function chantRegion(player) {
  if (player.league === "KBO") return player.history.some((h) => ["MLB", "NPB", "MILB"].includes(h.league)) ? "KBOback" : "KBO";
  return { NPB: "NPB", MLB: "MLB", MILB: "MILB" }[player.league] || null;
}

// 지금 받아야 할 응원가 단계 (0 = 아직 없음)
function chantLevelFor(player) {
  const region = chantRegion(player);
  if (!region) return 0; // 1군 응원가는 KBO·NPB·MLB, 마이너는 오르간
  if (region === "MILB") return 1;
  const fame = player.fame || 0;
  if (isFranchiseHere(player) || fame >= 60) return 3;
  if (fame >= 25 || (player.awards["올스타"] || 0) >= 1) return 2;
  return 1;
}

function chantTitle(player, lv) {
  const region = player.chantRegion || chantRegion(player);
  if (region === "KBOback") return "귀환 응원가";
  if (region === "NPB") return ["応援歌 (첫 응원가)", "応援歌 (정식)", "応援歌 (떼창)"][lv - 1];
  if (region === "MLB") return ["등장곡 + 구호", "외야석 구호", "MVP 구호"][lv - 1];
  if (region === "MILB") return "구장 오르간";
  return CHANT_NAME[lv - 1];
}

function chantText(player, lv) {
  const side = player.type === "pitcher" ? "pit" : "bat";
  const region = player.chantRegion || chantRegion(player);
  const team = player.team.split(" ")[0];
  const fill = (t) => t.replaceAll("{name}", player.name).replaceAll("{team}", team).replaceAll("{num}", player.number);
  if (region === "NPB") {
    const left = (player.hand || "우투").charAt(0) === "좌";
    const [jp, ko] = CHANT_NPB[side][lv - 1];
    const kana = toKatakana(player.name);
    const jpTeam = NPB_TEAM_JP[team] || team;
    const jpText = jp
      .replaceAll("{kana}", kana)
      .replaceAll("{team}", jpTeam)
      .replaceAll("{arm}", left ? "左腕" : "右腕");
    return `${jpText}<br><small>(${fill(ko).replaceAll("{armKo}", left ? "왼팔" : "오른팔")})</small>`;
  }
  if (region === "MLB" || region === "MILB") {
    const roman = romanSurname(player.name);
    if (!player.walkup) player.walkup = pick(WALKUP_SONGS);
    if (region === "MILB") return `🎹 구장 오르간: "빠바밤 빰 빰~ ${roman}!" (관중 박수 짝짝)`;
    return `🎧 등장곡 "${player.walkup}" · ${CHANT_MLB[side][lv - 1].replaceAll("{roman}", roman).replaceAll("{ROMAN}", roman.toUpperCase())}`;
  }
  if (region === "KBOback") return fill(CHANT_RETURN[side]);
  return fill(CHANT_LYRICS[side][lv - 1]);
}

function chantSeason(player, report) {
  const lv = chantLevelFor(player);
  if (!lv) return;
  const region = chantRegion(player);
  const moved = (player.chantTeam && player.chantTeam !== player.team) || (player.chantRegion && player.chantRegion !== region);
  if (moved) player.chantLv = 0; // 팀이나 나라 바뀌면 새로
  if (lv <= (player.chantLv || 0)) return;
  if (region === "KBOback" && player.chantLv) return; // 귀환 응원가는 한 번
  player.chantLv = lv;
  player.chantTeam = player.team;
  player.chantRegion = region;
  const text = chantText(player, lv);
  const who =
    { NPB: `${player.team} 응원단`, MLB: `${player.team} 홈구장`, MILB: `${player.team} 구장`, KBOback: `${player.team} 응원단` }[region] ||
    `${player.team} 응원단`;
  report.news.push(
    region === "NPB"
      ? `${player.team} 응원단, ${player.name} 일본어 응원가 공개… 가사에 이름이 '${toKatakana(player.name)}'`
      : region === "MLB"
        ? `${player.name} 타석마다 "${romanSurname(player.name)}!" 구호… 현지 팬들 이름 외웠다`
        : region === "KBOback"
          ? `${player.team} 응원단, '돌아온 ${player.name}' 응원가 공개`
          : `${who}, ${player.name} ${chantTitle(player, lv)} 공개`,
  );
  report.bigMoments = report.bigMoments || [];
  report.bigMoments.push({
    tone: "good",
    cls: "chant-moment",
    kicker: `${who} · ${moved ? "새 버전" : `Lv.${lv}`}`,
    title: `🎵 ${chantTitle(player, lv)}`,
    lines: [`<span class="chant">${text}</span>`],
  });
  moreComments(player, report, region === "NPB" ? FAN.chantNpb : region === "MLB" ? FAN.chantMlb : region === "KBOback" ? FAN.chantBack : FAN.chant, 2);
}

// 훈련 탭 머리에 붙는 응원가 한 줄
function chantHtml(player) {
  if (!player.chantLv) return "";
  return `<details class="chant-box"><summary>🎵 내 응원가 <small>${chantTitle(player, player.chantLv)}</small></summary><p class="chant">${chantText(player, player.chantLv)}</p>
    ${player.chantLv < 3 && player.chantRegion !== "MILB" && player.chantRegion !== "KBOback" ? `<p class="small">인기가 오르거나 프랜차이즈 스타가 되면 새 버전이 나와요.</p>` : ""}</details>`;
}

// ---------- 한글 이름 → 가타카나 / 로마자 ----------
const HG_INIT = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const HG_VOWEL = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const HG_FINAL = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];

function hangulParts(ch) {
  const c = ch.charCodeAt(0) - 0xac00;
  if (c < 0 || c > 11171) return null;
  return { i: HG_INIT[Math.floor(c / 588)], v: HG_VOWEL[Math.floor((c % 588) / 28)], f: HG_FINAL[c % 28] };
}

// 가타카나: 성은 청음, 이름은 탁음 (김민준 → キム・ミンジュン)
const KANA_ROW = {
  "": "アイウエオ",
  k: "カキクケコ",
  g: "ガギグゲゴ",
  s: "サシスセソ",
  n: "ナニヌネノ",
  h: "ハヒフヘホ",
  p: "パピプペポ",
  b: "バビブベボ",
  m: "マミムメモ",
  r: "ラリルレロ",
};
const KANA_SPECIAL = {
  j: ["ジャ", "ジ", "ジュ", "ジェ", "ジョ"],
  ch: ["チャ", "チ", "チュ", "チェ", "チョ"],
  t: ["タ", "ティ", "トゥ", "テ", "ト"],
  d: ["ダ", "ディ", "ドゥ", "デ", "ド"],
};
const KANA_FINAL = { k: "ク", n: "ン", ng: "ン", m: "ム", l: "ル", p: "プ", t: "ッ" };
const KANA_CONS = {
  ㄱ: ["k", "g"],
  ㄲ: ["k", "k"],
  ㄴ: ["n", "n"],
  ㄷ: ["t", "d"],
  ㄸ: ["t", "t"],
  ㄹ: ["r", "r"],
  ㅁ: ["m", "m"],
  ㅂ: ["p", "b"],
  ㅃ: ["p", "p"],
  ㅅ: ["s", "s"],
  ㅆ: ["s", "s"],
  ㅇ: ["", ""],
  ㅈ: ["ch", "j"],
  ㅉ: ["ch", "ch"],
  ㅊ: ["ch", "ch"],
  ㅋ: ["k", "k"],
  ㅌ: ["t", "t"],
  ㅍ: ["p", "p"],
  ㅎ: ["h", "h"],
};

function kanaOf(cons, vowel) {
  const row = KANA_SPECIAL[cons] || KANA_ROW[cons] || KANA_ROW[""];
  const col = (k) => row["aiueo".indexOf(k)];
  const v = { ae: "e", eo: "o", eu: "u", oe: "we", yae: "ye", yeo: "yo" }[vowel] || vowel;
  if ("aiueo".includes(v) && v.length === 1) return col(v);
  if (v[0] === "y") {
    if (cons === "") return { ya: "ヤ", yu: "ユ", yo: "ヨ", ye: "イェ" }[v];
    if (KANA_SPECIAL[cons]) return col(v[1]);
    return col("i") + { a: "ャ", u: "ュ", o: "ョ", e: "ェ" }[v[1]];
  }
  if (v[0] === "w" || v === "ui") {
    if (cons === "") return { wa: "ワ", wo: "ウォ", we: "ウェ", wi: "ウィ", ui: "ウィ" }[v];
    if (KANA_SPECIAL[cons]) return col(v === "ui" ? "i" : v[1]); // 최 → チェ
    return col("u") + { wa: "ァ", wo: "ォ", we: "ェ", wi: "ィ", ui: "ィ" }[v];
  }
  return col("a");
}

function toKatakana(name) {
  const chars = [...name];
  const out = chars.map((ch, idx) => {
    const p = hangulParts(ch);
    if (!p) return ch;
    const mid = idx > 0; // 성만 청음, 이름은 탁음 (이정후 → イ・ジョンフ)
    const cons = KANA_CONS[p.i][mid ? 1 : 0];
    return kanaOf(cons, p.v) + (KANA_FINAL[p.f] || "");
  });
  return chars.length >= 2 ? `${out[0]}・${out.slice(1).join("")}` : out.join("");
}

// 성씨 로마자 (현지 중계에서 부르는 이름)
const SURNAME_ROMAN = {
  김: "Kim",
  이: "Lee",
  박: "Park",
  최: "Choi",
  정: "Jung",
  강: "Kang",
  조: "Cho",
  윤: "Yoon",
  장: "Jang",
  임: "Lim",
  한: "Han",
  오: "Oh",
  서: "Seo",
  신: "Shin",
  권: "Kwon",
  황: "Hwang",
  안: "Ahn",
  송: "Song",
  류: "Ryu",
  유: "Yoo",
  전: "Jeon",
  홍: "Hong",
  고: "Ko",
  문: "Moon",
  양: "Yang",
  손: "Son",
  배: "Bae",
  백: "Baek",
  허: "Heo",
  남: "Nam",
  심: "Shim",
  노: "Noh",
  하: "Ha",
  곽: "Kwak",
  성: "Sung",
  차: "Cha",
  주: "Joo",
  우: "Woo",
  구: "Koo",
  민: "Min",
  진: "Jin",
  나: "Na",
  지: "Ji",
  엄: "Um",
  채: "Chae",
  원: "Won",
  천: "Chun",
  방: "Bang",
  공: "Kong",
  현: "Hyun",
  함: "Ham",
  변: "Byun",
  염: "Yeom",
  여: "Yeo",
  추: "Choo",
  도: "Do",
  소: "So",
  석: "Seok",
  선: "Sun",
  설: "Seol",
  마: "Ma",
  길: "Gil",
  연: "Yeon",
  위: "Wi",
  표: "Pyo",
  명: "Myung",
  기: "Ki",
  반: "Ban",
  라: "Ra",
  왕: "Wang",
  금: "Keum",
  옥: "Ok",
  육: "Yook",
  인: "In",
  맹: "Maeng",
  제: "Je",
  모: "Mo",
  탁: "Tak",
  국: "Kook",
  어: "Eo",
  은: "Eun",
  편: "Pyun",
  용: "Yong",
};

function romanSyllable(ch, first) {
  const p = hangulParts(ch);
  if (!p) return ch;
  const init = {
    ㄱ: "g",
    ㄲ: "kk",
    ㄴ: "n",
    ㄷ: "d",
    ㄸ: "tt",
    ㄹ: first ? "r" : "r",
    ㅁ: "m",
    ㅂ: "b",
    ㅃ: "pp",
    ㅅ: "s",
    ㅆ: "ss",
    ㅇ: "",
    ㅈ: "j",
    ㅉ: "jj",
    ㅊ: "ch",
    ㅋ: "k",
    ㅌ: "t",
    ㅍ: "p",
    ㅎ: "h",
  }[p.i];
  return init + p.v + p.f;
}

function romanSurname(name) {
  const s = [...name][0];
  if (SURNAME_ROMAN[s]) return SURNAME_ROMAN[s];
  const r = romanSyllable(s, true);
  return r.charAt(0).toUpperCase() + r.slice(1);
}

Object.assign(FAN, {
  chantNpb: [
    "일본어 응원가 ㄷㄷ 이름 가타카나로 나오는 거 신기하다",
    "{name} 일본 응원단이 더 잘 부르네 ㅋㅋ",
    "현지 팬들 떼창 영상 소름",
    "가사 번역 보니까 울컥한다",
  ],
  chantMlb: ["Let's go 구호 현지 팬들이 외쳐 주네 ㅠㅠ", "MLB 구장에서 한국 이름 연호 실화냐", "등장곡 선곡 센스 ㅋㅋ", "한인 응원단 태극기 보니까 뭉클"],
  chantBack: ["돌아온 {name} 응원가 듣자마자 눈물 남", "역시 응원가는 한국이지", "귀환 응원가 첫 떼창 가즈아", "다시 이 노래 부를 줄이야 ㅠㅠ"],
});

FAN.chant = [
  "응원가 중독성 미쳤다 ㅋㅋ",
  "직관 가서 목 터지게 부른다",
  "이거 떼창하면 소름 돋겠다",
  "응원단장 일 잘하네",
  "출근길에 흥얼거리는 중",
  "{name} 타석 기다려지는 이유 하나 추가",
];

// 영구결번 기사에 번호 넣기
