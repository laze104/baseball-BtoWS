// =============================================
// saber.js : 세이버 지표 + 스카우트 리포트 불확실성
// 1. wRC+, wOBA, K%, BB%, ISO (타자) / FIP, K%, BB%, K/9 (투수)
// 2. 아마추어 때는 능력치를 범위로 보여줌 (프로 가까워질수록 정확)
// =============================================

// ---------------------------------------------
// 1. 세이버 지표
// ---------------------------------------------
// 리그별 기준값: 시뮬레이션 돌려서 맞춘 값 (리그 평균 타자 = wRC+ 100, FIP ≒ 평균자책)
// woba = 리그 평균 wOBA, fip = FIP 상수 / env = 맞출 때 쓴 LEAGUE_ENV (시대가 바뀌면 비율로 보정)
const SABER_BASE = {
  HS: { woba: 0.318, fip: 1.91 },
  COLLEGE: { woba: 0.32, fip: 1.93 },
  INDIE: { woba: 0.328, fip: 2.47 },
  ABL: { woba: 0.323, fip: 2.24 },
  KBO2: { woba: 0.328, fip: 2.59 },
  SANGMU: { woba: 0.328, fip: 2.61 },
  KBO: { woba: 0.331, fip: 2.12 },
  NPB: { woba: 0.289, fip: 2.04 },
  MLB: { woba: 0.31, fip: 1.71 },
  MILB: { woba: 0.326, fip: 2.01 },
};
const SABER_ENV0 = JSON.parse(JSON.stringify(LEAGUE_ENV)); // 시대 변화 전 원래 환경

function lgSaber(lg) {
  const base = SABER_BASE[lg] || SABER_BASE.KBO;
  const env0 = SABER_ENV0[lg] || NEUTRAL_ENV;
  const env = LEAGUE_ENV[lg] || env0;
  return { woba: base.woba * (env.ops / env0.ops), fip: base.fip + (env.era - env0.era) };
}

function wobaOf(b) {
  if (!b || !b.PA) return 0;
  const single = b.H - b.D - b.T - b.HR;
  return (0.69 * b.BB + 0.89 * single + 1.27 * b.D + 1.62 * b.T + 2.1 * b.HR) / b.PA;
}

// wRC+ = 리그 평균 대비 득점 생산력 (100이 평균, 150이면 50% 더 생산)
function wrcPlus(b, lg) {
  if (!b || !b.PA) return null;
  return Math.round(100 + ((wobaOf(b) - lgSaber(lg).woba) / 1.2 / 0.115) * 100);
}

function fipOf(p, lg) {
  if (!p || !p.outs) return null;
  return (13 * p.HR + 3 * p.BB - 2 * p.K) / (p.outs / 3) + lgSaber(lg).fip;
}

// 시즌 기록에 붙여서 저장 (그 해 리그 환경 기준으로 남김)
function addSaber(report) {
  const lg = report.league;
  const b = report.bat;
  if (b && b.PA) {
    b.wOBA = round(wobaOf(b), 3);
    b.wRC = wrcPlus(b, lg);
    b.Kp = b.K / b.PA;
    b.BBp = b.BB / b.PA;
  }
  const p = report.pit;
  if (p && p.outs) {
    p.FIP = round(fipOf(p, lg), 2);
    const bf = p.outs + p.H + p.BB; // 상대 타자 수 (대충)
    p.Kp = p.K / bf;
    p.BBp = p.BB / bf;
  }
}

// 예전 시즌 기록엔 없으니 그 자리에서 계산
const seasonWrc = (h) => (h.bat ? (h.bat.wRC !== undefined ? h.bat.wRC : wrcPlus(h.bat, h.league)) : null);
const seasonFip = (h) => (h.pit ? (h.pit.FIP !== undefined ? h.pit.FIP : fipOf(h.pit, h.league)) : null);

// 통산: 시즌별 값을 타석·이닝으로 가중 평균
function saberTotals(list) {
  let wPA = 0,
    wSum = 0,
    fOuts = 0,
    fSum = 0;
  for (const h of list) {
    const w = seasonWrc(h);
    if (w !== null && h.bat.PA) {
      wPA += h.bat.PA;
      wSum += w * h.bat.PA;
    }
    const f = seasonFip(h);
    if (f !== null && h.pit.outs) {
      fOuts += h.pit.outs;
      fSum += f * h.pit.outs;
    }
  }
  return { wRC: wPA ? Math.round(wSum / wPA) : null, FIP: fOuts ? fSum / fOuts : null };
}

const pct = (v) => (v === undefined || v === null || Number.isNaN(v) ? "-" : `${(v * 100).toFixed(1)}%`);
const fipTxt = (v) => (v === undefined || v === null || Number.isNaN(v) ? "-" : Number(v).toFixed(2));

// 기록표 칸 (main.js batRow / pitRow 뒤에 붙음)
function batSaberCells(b) {
  const k = b.Kp !== undefined ? b.Kp : b.PA ? b.K / b.PA : null;
  const bb = b.BBp !== undefined ? b.BBp : b.PA ? b.BB / b.PA : null;
  const w = b.wRC !== undefined && b.wRC !== null ? b.wRC : "-";
  return `<td class="saber">${w}</td><td>${pct(k)}</td><td>${pct(bb)}</td>`;
}
function pitSaberCells(p) {
  const bf = p.outs + p.H + p.BB;
  const k = p.Kp !== undefined ? p.Kp : bf ? p.K / bf : null;
  const bb = p.BBp !== undefined ? p.BBp : bf ? p.BB / bf : null;
  return `<td class="saber">${fipTxt(p.FIP)}</td><td>${pct(k)}</td><td>${pct(bb)}</td>`;
}

// 시즌 결과 탭의 세이버 한 줄
function batSaberRow(b) {
  if (!b || !b.PA) return "";
  const iso = b.SLG - b.AVG;
  return `<tr><th>wRC+</th><th>wOBA</th><th>K%</th><th>BB%</th><th>ISO</th><th>BB/K</th></tr>
    <tr><td class="saber">${b.wRC !== undefined ? b.wRC : "-"}</td><td>${b.wOBA !== undefined ? fmtRate(b.wOBA) : "-"}</td><td>${pct(b.Kp)}</td><td>${pct(b.BBp)}</td><td>${fmtRate(iso)}</td><td>${b.K ? (b.BB / b.K).toFixed(2) : "-"}</td></tr>`;
}
function pitSaberRow(p) {
  if (!p || !p.outs) return "";
  const ip = p.outs / 3;
  return `<tr><th>FIP</th><th>K%</th><th>BB%</th><th>K-BB%</th><th>BB/9</th><th>HR/9</th></tr>
    <tr><td class="saber">${fipTxt(p.FIP)}</td><td>${pct(p.Kp)}</td><td>${pct(p.BBp)}</td><td>${p.Kp !== undefined ? pct(p.Kp - p.BBp) : "-"}</td><td>${((p.BB * 9) / ip).toFixed(1)}</td><td>${((p.HR * 9) / ip).toFixed(1)}</td></tr>`;
}

const SABER_NOTE = "wRC+는 리그 평균 타자를 100으로 놓은 득점 생산력, FIP는 수비 빼고 투수 혼자 책임지는 것(삼진·볼넷·홈런)으로 본 평균자책이에요.";

// ---------------------------------------------
// 2. 스카우트 리포트 불확실성
// 고교 1학년 ±5 → 2학년 ±4 → 3학년 ±3 → 대학 ±2 → 독립·호주리그 ±2 → 프로 정확
// 범위 안에 진짜 값이 꼭 들어감. 시즌마다 스카우트 의견이 새로 바뀜
// ---------------------------------------------
function fogWidth(player) {
  if (player.league === "HS") return clamp(21 - player.age, 3, 5);
  if (["COLLEGE", "INDIE", "ABL"].includes(player.league)) return 2;
  return 0;
}

function fogBias(player) {
  const w = fogWidth(player);
  if (!w) return null;
  const f = player.fog;
  if (f && f.season === player.season && f.w === w) return f.b;
  const b = {};
  for (const key of Object.keys(player.stats)) b[key] = randomInt(-w, w);
  player.fog = { season: player.season, w, b };
  return b;
}

// 능력치 범위 (낮은 값, 높은 값)
function fogRange(player, key) {
  const v = player.stats[key];
  const w = fogWidth(player);
  if (!w) return [v, v];
  const c = v + fogBias(player)[key];
  return [clamp(c - w, 1, 99), clamp(c + w, 1, 99)];
}

// OVR 범위: 능력치 범위의 아래쪽·위쪽으로 각각 계산
function fogOvr(player, statNames, position) {
  const lo = {},
    hi = {};
  for (const key of Object.keys(player.stats)) [lo[key], hi[key]] = fogRange(player, key);
  return [calcOvr(lo, statNames, position), calcOvr(hi, statNames, position)];
}

function fogOvrText(player, ovr, position) {
  if (!fogWidth(player)) return `OVR ${ovr}`;
  const names = player.type === "pitcher" || (position || "").match(/선발|불펜/) ? PITCHER_STATS : BATTER_STATS;
  const [lo, hi] = fogOvr(player, names, position || player.position.split(" 겸 ").pop());
  return `OVR ${lo}~${hi}`;
}

// 선수 카드 능력치 목록 (범위 버전)
function fogStatListHtml(player, title, statNames, position, gains) {
  const [lo, hi] = fogOvr(player, statNames, position);
  let html = `<h3>${title} <span class="${ovrClass(hi)}">OVR ${lo}~${hi}</span></h3><ul class="stats fog">`;
  for (const [key, label] of Object.entries(statNames)) {
    const [a, b] = fogRange(player, key);
    const g = gains[key] || 0;
    const arrow = g > 0 ? `<span class="gain">▲</span>` : g < 0 ? `<span class="loss">▼</span>` : "";
    html += `<li><span>${label}</span><span class="bar range" style="--lo:${a};--hi:${b}"></span><b>${a}~${b}${arrow}</b></li>`;
  }
  return html + "</ul>";
}

function fogNote(player) {
  const w = fogWidth(player);
  if (!w) return "";
  return `<p class="small fog-note">🔍 아직 아마추어라 능력치는 스카우트 리포트 범위(±${w})로만 보여요. 프로에 가까워질수록 정확해져요.</p>`;
}

// 드래프트 점수도 범위로 (OVR이 범위라서)
function fogDraft(player, o) {
  const w = fogWidth(player);
  if (!w) return null;
  const ovr = getOvrs(player).best;
  const ovrs = getOvrs(player);
  const pos = player.position.split(" 겸 ");
  const names = ovrs.pit !== null && (ovrs.bat === null || ovrs.pit >= ovrs.bat) ? PITCHER_STATS : BATTER_STATS;
  const [lo, hi] = fogOvr(player, names, names === PITCHER_STATS ? pos[0] : pos[pos.length - 1]);
  const center = Math.round((lo + hi) / 2);
  const s = o.score + (center - ovr);
  return { lo: s - w, hi: s + w };
}
