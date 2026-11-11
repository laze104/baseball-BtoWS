// =============================================
// analysis.js : 분석실 (기록 탭 아래)
// - 스트라이크존 9칸 히트맵: 타자는 코스별 타율, 투수는 코스별 피안타율
// - 구종별 약점: 타자는 구종별 타율·헛스윙, 투수는 내 구종별 피안타율·헛스윙
// - 제일 약한 곳 → 추천 집중 훈련 (훈련 탭 체크박스 바로 체크)
// - 스프링캠프 '약점 보완' 프로그램이 analysisTrain 부름 (phases.js)
// 코스별 개인차는 player.zone 에 한 번 굴려서 저장 (매 시즌 조금씩 흔들림)
// =============================================

// 칸 순서: 0~2 높은 코스, 3~5 가운데, 6~8 낮은 코스 / 왼쪽부터 몸쪽·가운데·바깥쪽
const ZONE_NAMES = ["몸쪽 높은", "가운데 높은", "바깥쪽 높은", "몸쪽", "한가운데", "바깥쪽", "몸쪽 낮은", "가운데 낮은", "바깥쪽 낮은"];
const ZONE_BASE_BAT = [0.24, 0.29, 0.22, 0.29, 0.34, 0.27, 0.23, 0.28, 0.19]; // MLB 코스별 타율 대충 이 모양
const ZONE_BASE_PIT = [0.25, 0.31, 0.22, 0.3, 0.36, 0.26, 0.21, 0.27, 0.17];
const BAT_PITCHES = ["포심", "투심", "커터", "슬라이더", "커브", "체인지업", "스플리터"];

function initZone(player) {
  if (player.zone && player.zone.v === 1) return player.zone;
  const roll = (n, sd) => Array.from({ length: n }, () => round(clamp(gauss() * sd, -sd * 2, sd * 2), 3));
  player.zone = { v: 1, bat: roll(9, 0.03), pit: roll(9, 0.03), bp: roll(BAT_PITCHES.length, 0.035), pp: {} };
  return player.zone;
}

// 시즌 끝마다 조금 흔들림 (afterSeason)
function analysisSeason(player) {
  if (isAmateur(player.league) && player.league !== "COLLEGE") return;
  const z = initZone(player);
  const drift = (arr) => arr.map((x) => round(clamp(x * 0.85 + gauss() * 0.012, -0.08, 0.08), 3));
  z.bat = drift(z.bat);
  z.pit = drift(z.pit);
  z.bp = drift(z.bp);
}

function lastLine(player, side) {
  const r = player.lastReport;
  if (!r || !r[side]) return null;
  if (side === "bat" && r.bat.AB >= 80) return r.bat.AVG;
  if (side === "pit" && r.pit.outs >= 60) return r.pit.H / Math.max(1, r.pit.H + r.pit.outs * 0.92); // 피안타율 근사
  return null;
}

// 타자 코스별 타율
function batZones(player) {
  const s = player.stats;
  const lv = LEAGUES[player.league] ? LEAGUES[player.league].level : 55;
  const z = initZone(player);
  const d = (k) => ((s[k] || 50) - lv) * 0.0025;
  const vals = ZONE_BASE_BAT.map((b, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    let v = b + d("contact");
    if (row < 2 && col < 2) v += d("power") * 0.8; // 몸쪽·가운데 높은 공은 힘으로
    if (row === 2 || col === 2) v += d("eye") * 0.9; // 낮은 공·바깥쪽은 참을성
    return v + z.bat[i];
  });
  return fitTo(vals, lastLine(player, "bat"));
}

// 투수 코스별 피안타율
function pitZones(player) {
  const s = player.stats;
  const lv = LEAGUES[player.league] ? LEAGUES[player.league].level : 55;
  const z = initZone(player);
  const d = (k) => ((s[k] || 50) - lv) * 0.0025;
  const vals = ZONE_BASE_PIT.map((b, i) => {
    const row = Math.floor(i / 3);
    let v = b - d("stuff") * 0.6;
    if (row === 0) v -= d("velocity"); // 높은 공은 구속
    if (row === 2) v -= d("breaking"); // 낮은 공은 떨어지는 공
    if (i !== 4) v -= d("control") * 0.7; // 구석은 제구
    return v + z.pit[i];
  });
  return fitTo(vals, lastLine(player, "pit"));
}

// 실제 시즌 기록이 있으면 평균을 거기 맞춤
function fitTo(vals, actual) {
  const out = vals.map((v) => clamp(v, 0.08, 0.5));
  if (actual === null) return out.map((v) => round(v, 3));
  const mean = out.reduce((a, b) => a + b, 0) / out.length;
  return out.map((v) => round(clamp(v + (actual - mean), 0.06, 0.55), 3));
}

// 구종별: 타자는 상대 구종별 타율·헛스윙률
function batPitches(player) {
  const s = player.stats;
  const lv = LEAGUES[player.league] ? LEAGUES[player.league].level : 55;
  const z = initZone(player);
  const base = lastLine(player, "bat") || clamp(0.25 + ((s.contact || 50) - lv) * 0.003, 0.18, 0.34);
  return BAT_PITCHES.map((p, i) => {
    const drop = PITCH_KINDS[p].drop;
    const vsSpeed = drop <= 5;
    let avg = base + (vsSpeed ? ((s.power || 50) - lv) * 0.0015 + 0.015 : ((s.eye || 50) - lv) * 0.002 - drop * 0.0012) + z.bp[i];
    let whiff = 0.18 + drop * 0.007 - ((s.contact || 50) - lv) * 0.003 - z.bp[i] * 1.5;
    return { pitch: p, avg: round(clamp(avg, 0.1, 0.45), 3), whiff: round(clamp(whiff, 0.06, 0.48), 3) };
  });
}

// 투수: 내 구종별 피안타율·헛스윙률
function pitPitches(player) {
  initArsenal(player);
  const s = player.stats;
  const lv = LEAGUES[player.league] ? LEAGUES[player.league].level : 55;
  const z = initZone(player);
  const base = lastLine(player, "pit") || clamp(0.26 - ((s.stuff || 50) - lv) * 0.003, 0.17, 0.34);
  return (player.arsenal || ["포심"]).map((p) => {
    if (z.pp[p] === undefined) z.pp[p] = round(gauss() * 0.03, 3);
    const drop = PITCH_KINDS[p] ? PITCH_KINDS[p].drop : 10;
    const key = drop <= 5 ? "velocity" : "breaking";
    const edge = ((s[key] || 50) - lv) * 0.003;
    const avg = base - edge + (drop <= 5 ? 0.02 : -0.01) + z.pp[p];
    const whiff = 0.14 + drop * 0.006 + edge * 1.5 - z.pp[p] * 1.5;
    return { pitch: p, avg: round(clamp(avg, 0.1, 0.45), 3), whiff: round(clamp(whiff, 0.05, 0.5), 3), key };
  });
}

// 제일 약한 곳 + 추천 훈련
function weakSpot(player, side) {
  if (side === "bat") {
    const zs = batZones(player);
    const zi = zs.indexOf(Math.min(...zs));
    const ps = batPitches(player);
    const wp = ps.reduce((a, b) => (b.avg - b.whiff * 0.3 < a.avg - a.whiff * 0.3 ? b : a));
    const row = Math.floor(zi / 3);
    const zoneKey = row === 0 && zi % 3 < 2 ? "contact" : "eye";
    const pitchKey = PITCH_KINDS[wp.pitch].drop <= 5 ? "contact" : "eye";
    const zoneGap = (zs.reduce((a, b) => a + b, 0) / 9 - zs[zi]) / 0.06;
    const pitchGap = (ps.reduce((a, b) => a + b.avg, 0) / ps.length - wp.avg) / 0.04;
    return zoneGap >= pitchGap
      ? { kind: "zone", idx: zi, gap: zoneGap, text: `${ZONE_NAMES[zi]} 코스 (타율 ${fmtRate(zs[zi])})`, key: zoneKey }
      : { kind: "pitch", pitch: wp.pitch, text: `${wp.pitch} 상대 (타율 ${fmtRate(wp.avg)}, 헛스윙 ${Math.round(wp.whiff * 100)}%)`, key: pitchKey };
  }
  const zs = pitZones(player);
  const zi = zs.indexOf(Math.max(...zs));
  const ps = pitPitches(player);
  const wp = ps.reduce((a, b) => (b.avg > a.avg ? b : a));
  const row = Math.floor(zi / 3);
  const zoneKey = zi === 4 || row === 1 ? "stuff" : row === 0 ? "velocity" : row === 2 ? "breaking" : "control";
  const zoneGap = (zs[zi] - zs.reduce((a, b) => a + b, 0) / 9) / 0.06;
  const pitchGap = ps.length > 1 ? (wp.avg - ps.reduce((a, b) => a + b.avg, 0) / ps.length) / 0.03 : 0;
  return zoneGap >= pitchGap
    ? { kind: "zone", idx: zi, gap: zoneGap, text: `${ZONE_NAMES[zi]} 코스 (피안타율 ${fmtRate(zs[zi])})`, key: zoneKey }
    : { kind: "pitch", pitch: wp.pitch, text: `${wp.pitch} (피안타율 ${fmtRate(wp.avg)})`, key: wp.key };
}

// 캠프 '약점 보완' 프로그램: 약점 칸 보정 + 관련 능력치 +1
function analysisTrain(player) {
  const side = player.type === "pitcher" ? "pit" : player.type === "batter" ? "bat" : Math.random() < 0.5 ? "bat" : "pit";
  const w = weakSpot(player, side);
  const z = initZone(player);
  const fix = 0.02 + Math.random() * 0.015;
  if (w.kind === "zone") z[side][w.idx] = round(z[side][w.idx] + (side === "bat" ? fix : -fix), 3);
  else if (side === "bat") z.bp[BAT_PITCHES.indexOf(w.pitch)] = round(z.bp[BAT_PITCHES.indexOf(w.pitch)] + fix, 3);
  else z.pp[w.pitch] = round((z.pp[w.pitch] || 0) - fix, 3);
  statUp(player, w.key, 1);
  const name = (side === "bat" ? BATTER_STATS : PITCHER_STATS)[w.key];
  return `📊 분석실이 찾은 약점 '${w.text}' 집중 훈련. 그쪽 숫자가 확실히 나아졌어요 (${name} +1)`;
}

// ---------- 화면 ----------
// 색: 한 가지 색 진하기로만 (높을수록 진함). 숫자를 칸에 직접 써서 색 못 봐도 읽힘
function zoneGridHtml(vals, title, note) {
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const cells = vals
    .map((v, i) => {
      const t = hi > lo ? (v - lo) / (hi - lo) : 0.5;
      return `<div class="zcell" style="--a:${(0.12 + t * 0.68).toFixed(2)}" title="${ZONE_NAMES[i]}: ${fmtRate(v)}">${fmtRate(v)}</div>`;
    })
    .join("");
  return `<div class="zone-box"><h4>${title}</h4><div class="zone-grid" role="img" aria-label="${title}">${cells}</div>
    <p class="zone-axis"><span>몸쪽</span><span>바깥쪽</span></p><p class="small">${note}</p></div>`;
}

function pitchTableHtml(rows, title, avgLabel) {
  return `<h4>${title}</h4><table class="pitch-table"><tr><th>구종</th><th>${avgLabel}</th><th>헛스윙률</th></tr>${rows
    .map((r) => `<tr><td>${r.pitch}</td><td>${fmtRate(r.avg)}</td><td>${Math.round(r.whiff * 100)}%</td></tr>`)
    .join("")}</table>`;
}

function analysisSideHtml(player, side) {
  const w = weakSpot(player, side);
  const names = side === "bat" ? BATTER_STATS : PITCHER_STATS;
  let html = `<section class="analysis-side"><h3>${side === "bat" ? "🏏 타자 분석" : "⚾ 투수 분석"}</h3>`;
  if (side === "bat") {
    html += zoneGridHtml(batZones(player), "코스별 타율", "포수 뒤에서 본 모습 · 진할수록 잘 침");
    html += pitchTableHtml(batPitches(player), "상대 구종별", "타율");
  } else {
    html += zoneGridHtml(pitZones(player), "코스별 피안타율", "포수 뒤에서 본 모습 · 진할수록 많이 맞음");
    html += pitchTableHtml(pitPitches(player), "내 구종별", "피안타율");
  }
  const share = w.kind === "zone" && side === "bat" ? clamp(Math.round(13 + w.gap * 4), 13, 30) : null; // 약한 코스일수록 상대가 더 던짐
  html += `<div class="weak-box"><p>🔍 상대 전력분석팀이 노리는 곳: <b>${w.text}</b>${
    share ? `<br><small>상대 배터리가 이 코스로 던진 비율 ${share}% (보통 11%)</small>` : ""
  }</p><p>추천 집중 훈련: <b>${names[w.key]}</b> <button class="secondary" data-focus="${w.key}">훈련 탭에서 체크하기</button></p></div></section>`;
  return html;
}

function showAnalysis(player) {
  const box = $("tab-analysis");
  if (!box) return;
  if (["HS"].includes(player.league) && player.age < 18) {
    box.innerHTML = "<p class='empty'>분석실은 고3부터 열려요. 전력분석원이 아직 안 붙었어요.</p>";
    return;
  }
  let html = `<h3>📊 분석실 <small>전력분석팀 리포트</small></h3>`;
  if (player.type !== "pitcher") html += analysisSideHtml(player, "bat");
  if (player.type !== "batter") html += analysisSideHtml(player, "pit");
  html += `<p class="small">지난 시즌 기록과 능력치로 계산했어요. 스프링캠프 '약점 보완 (분석실)'을 고르면 제일 약한 곳을 집중 훈련해요.</p>`;
  box.innerHTML = html;
}
