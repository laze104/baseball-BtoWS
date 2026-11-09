// =============================================
// broadcast.js : v16 추가 기능 (OOTP 느낌)
// 1. 가짜 선수 이름 (리더보드·중계 상대용)
// 2. 트래킹 데이터: 구속, 구종, 타구 속도, 홈런 비거리, 타구 방향
// 3. 신기록 팝업 (구속, 비거리)
// 4. 결정적 순간 텍스트 중계
// =============================================

// ---------------------------------------------
// 1. 가짜 이름 (실존 인물 안 쓰려고 흔한 성+이름 조합)
// ---------------------------------------------
const FAKE_NAMES = {
  KBO: {
    last: ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"],
    first: ["민준", "서진", "도현", "지훈", "현우", "재윤", "승민", "태양", "우석", "준혁", "성빈", "동하", "건우", "시후", "유찬", "정우", "하준", "대호", "영재", "무진"],
  },
  NPB: {
    last: ["야마다", "사토", "스즈키", "다카하시", "다나카", "이토", "와타나베", "나카무라", "고바야시", "가토", "모리", "이시카와"],
    first: ["쇼타", "유키", "하루토", "렌", "소마", "다이키", "겐타", "료", "가이토", "히로", "슌", "다쿠야"],
  },
  MLB: {
    last: ["존슨", "윌리엄스", "로드리게스", "밀러", "가르시아", "데이비스", "마르티네스", "앤더슨", "테일러", "토머스", "에르난데스", "무어", "잭슨", "화이트"],
    first: ["마이크", "제이크", "타일러", "카를로스", "라이언", "조시", "케빈", "루이스", "브랜든", "호세", "애런", "닉"],
  },
};

function fakeName(league) {
  const pool = FAKE_NAMES[league === "NPB" || league === "MLB" || league === "MILB" ? (league === "MILB" ? "MLB" : league) : "KBO"];
  return league === "NPB" || league === "MLB" || league === "MILB" ? `${pick(pool.first)} ${pick(pool.last)}` : pick(pool.last) + pick(pool.first);
}

// 상대 팀 하나 (내 팀 빼고)
function otherTeam(player, league) {
  // 고교·대학은 다른 학교
  const pool = league === "HS" ? HIGH_SCHOOLS.map((x) => x.name) : league === "COLLEGE" ? COLLEGES.map((x) => x.name) : TEAMS[league] || TEAMS.KBO;
  const list = pool.filter((t) => t !== player.team && t !== player.school);
  return list.length ? pick(list) : "상대 팀";
}

// ---------------------------------------------
// 2. 트래킹 데이터
// ---------------------------------------------
// 구종 레퍼토리: 스타일 보고 한 번 정하면 커리어 내내 유지됨
const PITCH_KINDS = {
  "포심": { drop: 0 },
  "투심": { drop: 3 },
  "커터": { drop: 5 },
  "슬라이더": { drop: 12 },
  "스위퍼": { drop: 14 },
  "커브": { drop: 25 },
  "체인지업": { drop: 15 },
  "스플리터": { drop: 9 },
  "포크": { drop: 11 },
};

const ARSENAL_BY_STYLE = {
  "파이어볼러": [["슬라이더", "스플리터"], ["커브", "포크"]],
  "제구형": [["체인지업", "커터"], ["투심", "커브"]],
  "기교파": [["커브", "슬라이더", "체인지업"], ["스위퍼", "포크"]],
  "이닝이터": [["투심", "슬라이더"], ["체인지업", "커브"]],
  "이도류": [["스위퍼", "스플리터"], ["커터", "커브"]],
};

function initArsenal(player) {
  if (player.arsenal || player.type === "batter") return;
  const [must, maybe] = ARSENAL_BY_STYLE[player.style] || ARSENAL_BY_STYLE["파이어볼러"];
  const list = ["포심", ...must];
  // 변화구 능력치 좋으면 구종 하나 더
  if ((player.stats.breaking || 50) >= 55 || Math.random() < 0.4) list.push(pick(maybe.filter((p) => !list.includes(p))));
  player.arsenal = list;
}

// 투타 방향: "우투좌타"면 좌타 → 당겨치면 우측
function batSide(player) {
  return (player.hand || "우투우타").charAt(2) === "좌" ? "좌" : "우";
}

// 평균 구속: 구속 능력치 50 → 141km, 70 → 147km, 90 → 152km (불펜은 짧게 던져서 +1.5)
function avgVelo(player, role) {
  const v = player.stats.velocity || 50;
  const age = (currentPlayer && currentPlayer.stats.velocity === v ? currentPlayer.age : 25) || 25;
  const old = age > 33 ? (age - 33) * 0.5 : 0; // 30대 중반부터 구속 떨어짐
  return 127.5 + v * 0.27 + (role === "starter" ? 0 : 1.5) - old;
}

function makeTracking(player, report) {
  initArsenal(player);
  const t = {};
  const b = report.bat;
  if (b && b.PA > 0) {
    const power = player.stats.power || 50;
    const contact = player.stats.contact || 50;
    // 타구 속도 (km/h)
    const ev = 124 + power * 0.28 + contact * 0.03 + gauss() * 1.2;
    t.exitAvg = round(ev, 1);
    t.exitMax = round(ev + 24 + Math.random() * 9 + (power >= 80 ? 3 : 0), 1);
    // 타구 방향: 거포는 당겨치기, 교타자는 고르게
    const pullBase = { "거포": 45, "교타자": 32, "호타준족": 38, "수비형": 35 }[player.style] || 39;
    const pull = clamp(Math.round(pullBase + (power - 60) * 0.15 + gauss() * 2), 25, 60);
    const center = clamp(Math.round(33 + gauss() * 2), 26, 40);
    t.spray = { pull, center, oppo: 100 - pull - center };
    t.side = batSide(player);
    // 홈런 비거리 (m): 홈런마다 하나씩 뽑음
    if (b.HR > 0) {
      const dists = [];
      const dirs = { pull: 0, center: 0, oppo: 0 };
      for (let i = 0; i < b.HR; i++) {
        dists.push(108 + power * 0.22 + Math.random() * 14 + (Math.random() < 0.06 ? 8 : 0));
        const r = Math.random() * 100;
        dirs[r < pull + 18 ? "pull" : r < pull + 18 + center * 0.8 ? "center" : "oppo"]++;
      }
      t.hrMax = Math.round(Math.max(...dists));
      t.hrAvg = Math.round(dists.reduce((s, x) => s + x, 0) / dists.length);
      t.hrDirs = dirs;
    }
  }
  const p = report.pit;
  if (p && p.G > 0) {
    const role = (p.role || "").includes("선발") ? "starter" : "pen";
    const avg = avgVelo(player, role) + gauss() * 0.6;
    t.veloAvg = round(avg, 1);
    t.veloMax = round(avg + 3.5 + Math.random() * 3.5, 1);
    // 구사율: 구속 좋으면 포심 많이, 변화구 좋으면 변화구 많이
    const list = player.arsenal || ["포심", "슬라이더"];
    const fb = clamp(42 + ((player.stats.velocity || 50) - (player.stats.breaking || 50)) * 0.5, 30, 65);
    const rest = list.slice(1).map((name, i) => ({ name, w: (list.length - i) * (0.8 + Math.random() * 0.4) }));
    const sum = rest.reduce((s, x) => s + x.w, 0) || 1;
    t.pitches = [{ name: list[0], pct: Math.round(fb), velo: round(avg, 1) }];
    for (const r of rest) t.pitches.push({ name: r.name, pct: Math.round(((100 - fb) * r.w) / sum), velo: round(avg - PITCH_KINDS[r.name].drop + gauss() * 0.8, 1) });
    // 결정구: 포심 빼고 가장 많이 던진 공
    t.best = rest.length ? t.pitches.slice(1).sort((a, c) => c.pct - a.pct)[0].name : list[0];
  }
  report.track = t;
}

// 신기록 체크 (시즌 기사까지 다 만든 뒤에 부름)
function trackRecords(player, report) {
  const t = report.track;
  if (!t) return;
  const rec = player.records || (player.records = {});
  const lg = LEAGUES[report.league] ? LEAGUES[report.league].name : "";
  const moments = [];
  const lines = [];
  if (t.veloMax) {
    const prev = rec.velo || 0;
    if (t.veloMax > prev) {
      rec.velo = t.veloMax;
      rec.veloYear = report.year;
      // 150km 넘고 개인 기록 깼을 때만 크게 보여줌
      if (t.veloMax >= 150 && (prev || t.veloMax >= 153)) {
        const dream = t.veloMax >= 160 ? "꿈의 160km 돌파!" : t.veloMax >= 155 ? "155km 벽을 넘었다!" : "150km대 강속구";
        moments.push({ tone: "gold", kicker: `${report.year} 시즌 · ${lg} 트래킹`, title: `🔥 구속 신기록 ${t.veloMax}km/h`, lines: [dream, prev ? `개인 최고 구속 경신 (이전 ${prev}km/h)` : "전광판에 찍힌 숫자에 관중석이 술렁였어요"] });
        lines.push(`${player.name}, 전광판에 ${t.veloMax}km/h… ${t.veloMax >= 160 ? "꿈의 160km 찍었다" : "개인 최고 구속 경신"}`);
      }
    }
  }
  if (t.hrMax) {
    const prev = rec.hrDist || 0;
    if (t.hrMax > prev) {
      rec.hrDist = t.hrMax;
      rec.hrDistYear = report.year;
      if (t.hrMax >= 140) {
        const big = t.hrMax >= 150 ? "장외 홈런! 공이 경기장 밖으로 사라졌어요" : "관중석 상단에 꽂힌 초대형 홈런";
        moments.push({ tone: "gold", kicker: `${report.year} 시즌 · 비거리 측정`, title: `💥 ${t.hrMax}m 초대형 홈런`, lines: [big, prev ? `개인 최장 비거리 경신 (이전 ${prev}m)` : `타구 속도 ${t.exitMax}km/h`] });
        lines.push(`${player.name}, 비거리 ${t.hrMax}m ${t.hrMax >= 150 ? "장외 홈런" : "대형 아치"}… "공이 안 보였다"`);
      }
    }
  }
  if (t.exitMax && t.exitMax > (rec.exit || 0)) rec.exit = t.exitMax;
  if (moments.length) {
    report.bigMoments = (report.bigMoments || []).concat(moments);
    addReaction(player, report, lines, FAN.record, {});
  }
}

FAN.record = ["와 전광판 숫자 실화냐", "저게 사람이 던지는 공임?", "구단 유튜브 조회수 터진다", "이건 진짜 리그 최상위 툴임", "스카우트들 줄 서겠네 ㅋㅋ", "존나 빠르다 진짜", "타구 소리부터 다름"];

// 시즌 결과 탭에 붙는 트래킹 표
function trackingHtml(report) {
  const t = report.track;
  if (!t || (!t.exitAvg && !t.veloAvg)) return "";
  let html = `<h4>📡 트래킹 데이터</h4>`;
  if (t.veloAvg) {
    html += `<p class="chips"><span>평균 구속 ${t.veloAvg}km/h</span><span class="top">최고 구속 ${t.veloMax}km/h</span><span>결정구 ${t.best}</span></p>`;
    html += `<table><tr><th>구종</th><th>구사율</th><th>평균 구속</th></tr>${t.pitches.map((x) => `<tr><td>${x.name}</td><td><span class="pbar" style="--w:${x.pct}%"></span>${x.pct}%</td><td>${x.velo}km/h</td></tr>`).join("")}</table>`;
  }
  if (t.exitAvg) {
    html += `<p class="chips"><span>평균 타구 속도 ${t.exitAvg}km/h</span><span>최고 타구 속도 ${t.exitMax}km/h</span>${t.hrMax ? `<span class="top">최장 홈런 ${t.hrMax}m</span><span>홈런 평균 ${t.hrAvg}m</span>` : ""}</p>`;
    html += sprayHtml(t);
  }
  return html;
}

// 타구 방향 부채꼴 그림 (왼쪽부터 좌측·중앙·우측)
function sprayHtml(t) {
  const s = t.spray;
  // 우타자는 당겨치면 좌측, 좌타자는 우측
  const left = t.side === "우" ? s.pull : s.oppo;
  const right = t.side === "우" ? s.oppo : s.pull;
  const hr = t.hrDirs || { pull: 0, center: 0, oppo: 0 };
  const hrL = t.side === "우" ? hr.pull : hr.oppo;
  const hrR = t.side === "우" ? hr.oppo : hr.pull;
  const op = (v) => (0.15 + v / 80).toFixed(2);
  // 홈플레이트 (100,110), 반지름 95짜리 부채꼴을 3칸으로
  const pt = (deg, r) => [100 + r * Math.cos((deg * Math.PI) / 180), 110 - r * Math.sin((deg * Math.PI) / 180)].map((v) => v.toFixed(1)).join(",");
  const wedge = (a, b, v) => `<path d="M100,110 L${pt(a, 95)} A95,95 0 0,1 ${pt(b, 95)} Z" fill="#e8b931" fill-opacity="${op(v)}" stroke="#14281c" stroke-width="1.5"/>`;
  const label = (deg, v, n) => `<text x="${pt(deg, 60).split(",")[0]}" y="${pt(deg, 60).split(",")[1]}" text-anchor="middle" font-size="13" font-weight="bold" fill="#f1f5f2">${v}%</text>${n ? `<text x="${pt(deg, 82).split(",")[0]}" y="${pt(deg, 82).split(",")[1]}" text-anchor="middle" font-size="10" fill="#ffd36b">HR ${n}</text>` : ""}`;
  return `<div class="spray"><svg viewBox="0 0 200 120" role="img" aria-label="타구 방향 분포">
    ${wedge(135, 105, left)}${wedge(105, 75, s.center)}${wedge(75, 45, right)}
    ${label(120, left, hrL)}${label(90, s.center, hr.center)}${label(60, right, hrR)}
    <circle cx="100" cy="110" r="3" fill="#f1f5f2"/></svg>
    <p class="small">${t.side}타자 · 당겨친 타구 ${s.pull}% · 가운데 ${s.center}% · 밀어친 타구 ${s.oppo}%</p></div>`;
}

// ---------------------------------------------
// 4. 결정적 순간 텍스트 중계
// ---------------------------------------------
// nem: 상대가 숙적이면 그 선수로 중계함 (nemesis.js)
function buildPbp(player, choice, optionId, ok, nem) {
  const lr = player.lastReport;
  const lg = (lr && lr.league) || player.league;
  const opp = nem ? nem.team : otherTeam(player, lg);
  const tag = nem && nem.stage >= 2 ? ` (숙적 · ${NEMESIS_STAGES[nem.stage]})` : "";
  const lines = [`🎙️ ${choice.stage}`, choice.situation];
  const nohit = choice.situation.includes("노히트노런");
  const cycle = choice.situation.includes("사이클링");
  const level = LEAGUES[lg] ? LEAGUES[lg].level : 58;

  if (choice.side === "bat") {
    const pitcher = (nem ? nem.name : fakeName(lg)) + tag;
    const v = round(140 + (level - 35) * 0.25 + Math.random() * 4, 0); // 상대 투수 구속은 리그 수준 따라감
    const power = player.stats.power || 50;
    const dist = Math.round(112 + power * 0.22 + Math.random() * 10);
    const pullSide = batSide(player) === "우" ? "좌측" : "우측";
    lines.push(`마운드엔 ${opp} ${pitcher}. 오늘 최고 ${v}km/h를 찍었어요.`);
    if (optionId === "first") {
      lines.push(`${player.name}, 초구를 기다리지 않습니다…`);
      lines.push(`초구 ${v - 1}km/h 직구, 몸쪽으로 들어옵니다. 배트가 나갑니다!`);
    } else if (optionId === "wait") {
      lines.push(`초구 바깥쪽 슬라이더, 볼.`);
      lines.push(`2구 ${v}km/h 직구, 스트라이크. 3구 파울, 뒤로 넘어갑니다.`);
      lines.push(`4구 떨어지는 포크… 참아냅니다! 볼. 풀카운트까지 왔어요.`);
      lines.push(`5구 파울, 6구 파울. 끈질기게 버팁니다. 7구…`);
    } else {
      lines.push(`초구 크게 헛스윙! 노리는 공이 분명합니다.`);
      lines.push(`2구 유인구, 볼. 3구 ${v + 1}km/h 직구가 높게 들어옵니다…`);
    }
    if (ok) {
      if (cycle) lines.push(`우중간을 가릅니다! 2루 돌아 3루까지! 세이프!! 사이클링 히트 완성!`);
      else if (optionId === "big") lines.push(`큽니다! 큽니다!! 넘어갑니다!!! 비거리 ${dist}m, 경기장이 뒤집혔어요!`);
      else lines.push(`${optionId === "wait" ? "끝내 받아친 타구" : "깨끗하게 맞은 타구"}가 ${optionId === "first" ? pullSide : "중견수 앞"}으로 굴러갑니다! 주자 홈인!! 해결사 ${player.name}!`);
    } else {
      if (optionId === "big") lines.push(`헛스윙 삼진… ${player.name}, 고개를 떨굽니다.`);
      else lines.push(pick([`높이 뜬 타구… 유격수가 자리 잡고 잡아냅니다.`, `2루수 정면 땅볼… 1루에서 아웃.`, `잘 맞았지만 우익수 정면! 아쉽습니다.`]));
    }
  } else {
    const batter = (nem ? nem.name : fakeName(lg)) + tag;
    const list = player.arsenal || ["포심", "슬라이더"];
    const brk = list[1] || "슬라이더";
    const vmax = round(avgVelo(player, "pen") + 3 + Math.random() * 3, 1);
    lines.push(`타석엔 ${opp} 중심 타자 ${batter}. 올 시즌 홈런 ${randomInt(18, 38)}개를 친 강타자예요.`);
    if (optionId === "heat") {
      lines.push(`초구 ${round(vmax - 2, 1)}km/h 포심, 파울! 2구도 포심, 헛스윙!`);
      lines.push(`볼카운트 0-2. 포수는 다시 직구 사인을 냅니다…`);
      lines.push(`전광판에 ${vmax}km/h!`);
    } else if (optionId === "break") {
      lines.push(`초구 포심 스트라이크. 2구 ${brk}, 볼.`);
      lines.push(`3구 ${brk}가 떨어집니다… 헛스윙! 1-2.`);
      lines.push(`마지막은 결정구 ${brk}…`);
    } else if (optionId === "edge") {
      lines.push(`바깥쪽 꽉 찬 포심, 루킹 스트라이크. 몸쪽 ${brk}, 볼.`);
      lines.push(`풀카운트. 한 개도 가운데로 안 줍니다…`);
    } else {
      lines.push(`포수가 미트를 한가운데에 놓습니다. 정면 승부!`);
      lines.push(`초구 ${vmax}km/h 한가운데, 파울! 관중석이 들썩입니다.`);
    }
    if (ok) {
      if (nohit) lines.push(`삼진!!! 노히트노런!!! 포수가 마운드로 달려옵니다!`);
      else if (optionId === "big") lines.push(`한가운데 ${vmax}km/h! 헛스윙 삼진!! ${player.name} 포효합니다!`);
      else if (optionId === "heat") lines.push(`방망이가 밀립니다! 힘없는 내야 뜬공, 아웃!`);
      else if (optionId === "break") lines.push(`헛스윙 삼진!! ${brk}에 방망이가 허공을 가릅니다!`);
      else lines.push(`바깥쪽 끝에 걸칩니다! 루킹 삼진! 타자는 얼어붙었어요.`);
    } else {
      if (optionId === "big") lines.push(`가운데 몰렸다… 큽니다, 넘어갑니다. 통한의 피홈런.`);
      else lines.push(pick([`${optionId === "heat" ? "포심" : brk} 공략당합니다! 좌중간 안타, 주자 홈인…`, `빗맞은 타구가 내야를 넘어갑니다… 주자 홈인.`, `볼넷… 그리고 다음 타자에게 적시타를 맞습니다.`]));
    }
  }
  return lines;
}

// 명장면 보관 (연감에서 다시 볼 수 있음, 최근 20개)
function saveHighlight(player, choice, ok, title, pbp) {
  const list = player.highlights || (player.highlights = []);
  const lr = player.lastReport;
  list.push({ year: lr ? lr.year : gameYear(player), team: lr ? lr.team : player.team, stage: choice.stage, ok, title, pbp });
  if (list.length > 20) list.shift();
}
