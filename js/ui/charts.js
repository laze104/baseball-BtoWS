// =============================================
// charts.js : 선 그래프 (홈런왕 레이스, 시즌 페이스, 커리어)
// SVG 직접 그림. 선 2px, 끝점 라벨, 점에 마우스 올리면 값 (title)
// 색은 다크 배경(#26392b)에서 색약 검사 통과한 3색만 씀: 나 / 경쟁자 / 기준선
// =============================================

const CHART_COLORS = { me: "#b5850f", rival: "#4f97d1", ref: "#d4694f" };

// series: [{ name, color, values, dash }] · xs: x축 글자 · fmt: 값 글자
function lineChartSvg(series, xs, fmt, label) {
  const W = 340;
  const H = 190;
  const L = 34;
  const R = 70;
  const T = 12;
  const B = 24;
  const n = xs.length;
  const all = series.flatMap((s) => s.values.filter((v) => v !== null && v !== undefined));
  let lo = Math.min(0, ...all);
  let hi = Math.max(...all, 1);
  const step = niceStep((hi - lo) / 4);
  hi = Math.ceil(hi / step) * step;
  lo = Math.floor(lo / step) * step;
  const x = (i) => (n === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (v) => T + ((hi - v) * (H - T - B)) / (hi - lo || 1);
  let svg = `<svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">`;
  for (let v = lo; v <= hi + 1e-9; v += step) {
    svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="axis">${fmt(round(v, 3))}</text>`;
  }
  const every = Math.ceil(n / 8);
  xs.forEach((t, i) => {
    if (i % every === 0 || i === n - 1) svg += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" class="axis">${t}</text>`;
  });
  const ends = [];
  for (const s of series) {
    const pts = s.values.map((v, i) => (v === null || v === undefined ? null : [x(i), y(v), v, i])).filter(Boolean);
    if (!pts.length) continue;
    svg += `<polyline points="${pts.map((p) => `${p[0]},${p[1]}`).join(" ")}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${s.dash ? ' stroke-dasharray="5 4"' : ""}/>`;
    for (const p of pts) {
      if (!s.dash) svg += `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${s.color}" stroke="#26392b" stroke-width="2"/>`;
      svg += `<circle cx="${p[0]}" cy="${p[1]}" r="11" class="hit"><title>${s.name} · ${xs[p[3]]}: ${fmt(p[2])}</title></circle>`;
    }
    const last = pts[pts.length - 1];
    ends.push({ y: last[1], x: last[0], text: `${fmt(last[2])}`, color: s.color });
  }
  // 끝 라벨: 겹치면 아래로 조금 밀고 짧은 선으로 이어 줌
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++)
    if (ends[i].y - ends[i - 1].y < 13) ends[i].ly = ends[i - 1].ly !== undefined ? ends[i - 1].ly + 13 : ends[i - 1].y + 13;
  for (const e of ends) {
    const ly = e.ly !== undefined ? e.ly : e.y;
    if (ly !== e.y) svg += `<line x1="${e.x + 5}" y1="${e.y}" x2="${e.x + 12}" y2="${ly}" stroke="${e.color}" stroke-width="1"/>`;
    svg += `<text x="${e.x + 14}" y="${ly + 4}" class="end">${e.text}</text>`;
  }
  return svg + "</svg>";
}

function niceStep(raw) {
  if (raw <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

function chartLegend(series) {
  return `<p class="legend">${series.map((s) => `<span class="key" style="--c:${s.color}"${s.dash ? ' data-dash="1"' : ""}></span>${s.name}`).join(" ")}</p>`;
}

// 표로도 보기 (색 못 구분해도 값 확인)
function chartTable(series, xs, fmt) {
  return `<details class="chart-table"><summary>표로 보기</summary><table><tr><th></th>${xs.map((x) => `<th>${x}</th>`).join("")}</tr>${series
    .map((s) => `<tr><td>${s.name}</td>${s.values.map((v) => `<td>${v === null || v === undefined ? "-" : fmt(v)}</td>`).join("")}</tr>`)
    .join("")}</table></details>`;
}

function lineChartHtml(title, series, xs, fmt) {
  return `<h4>${title}</h4>${series.length > 1 ? chartLegend(series) : ""}${lineChartSvg(series, xs, fmt, title)}${chartTable(series, xs, fmt)}`;
}

// ---------- 시즌 진행 중: 누적 홈런(탈삼진) vs 타이틀 페이스 ----------
function raceKey(report) {
  if (report.bat && report.bat.PA >= 100) return { key: "hr", label: "홈런", get: (d) => d.HR || 0 };
  if (report.pit && report.pit.outs >= 60 && report.pit.GS) return { key: "k", label: "탈삼진", get: (d) => d.K || 0 };
  return null;
}

function cumulative(arr) {
  let acc = 0;
  return arr.map((v) => (acc += v));
}

function paceChartHtml(player, ctx) {
  const rk = raceKey(ctx.report);
  const line = AWARD_LINE[player.league];
  if (!rk || !line) return "";
  const months = monthsOf(player.league) || [4, 5, 6, 7, 8, 9];
  const mine = cumulative(ctx.monthsData.map(rk.get));
  const values = months.map((m, i) => (i < mine.length ? mine[i] : null));
  const pace = months.map((m, i) => Math.round((line[rk.key] * (i + 1)) / months.length));
  const series = [
    { name: player.name, color: CHART_COLORS.me, values },
    { name: `${rk.label}왕 페이스`, color: CHART_COLORS.ref, values: pace, dash: true },
  ];
  return lineChartHtml(
    `누적 ${rk.label}`,
    series,
    months.map((m) => `${m}월`),
    (v) => Math.round(v),
  );
}

// ---------- 시즌 끝: 홈런왕(탈삼진왕) 레이스 ----------
function makeRace(player, report) {
  const rk = raceKey(report);
  if (!rk || !report.monthsData || !report.leaders) return;
  const board = report.leaders.find((b) => b.key === rk.key);
  if (!board) return;
  const other = board.rows.find((r) => !r.me);
  if (!other) return;
  const mine = cumulative(report.monthsData.map(rk.get));
  const w = report.monthsData.map(() => clamp(1 + gauss() * 0.15, 0.6, 1.5));
  const theirs = cumulative(splitCount(Math.round(other.v), w));
  report.race = {
    label: rk.label,
    months: report.monthsData.map((d) => d.m),
    me: { name: player.name, cum: mine },
    rival: { name: `${other.name} (${other.team})`, cum: theirs },
    myRank: board.rank,
  };
}

function raceChartHtml(report) {
  const r = report.race;
  if (!r) return "";
  const series = [
    { name: r.me.name, color: CHART_COLORS.me, values: r.me.cum },
    { name: r.rival.name, color: CHART_COLORS.rival, values: r.rival.cum },
  ];
  const head = r.myRank === 1 ? `🏆 ${r.label}왕 레이스 승리` : `${r.label}왕 레이스 <small>최종 ${r.myRank > 30 ? "30위 밖" : r.myRank + "위"}</small>`;
  return lineChartHtml(
    head,
    series,
    r.months.map((m) => `${m}월`),
    (v) => Math.round(v),
  );
}

// ---------- 통산 기록 탭: 커리어 그래프 ----------
function careerChartsHtml(player) {
  const list = player.history.filter((h) => !isAmateur(h.league) && (h.bat || h.pit));
  if (list.length < 2) return "";
  const xs = list.map((h) => `${String(h.year).slice(2)}`);
  let html = `<div class="career-charts">`;
  html += lineChartHtml("시즌별 WAR", [{ name: "WAR", color: CHART_COLORS.me, values: list.map((h) => h.WAR) }], xs, (v) => (+v).toFixed(1));
  const bat = list.filter((h) => h.bat && h.bat.PA >= 100).length >= 2;
  if (bat) {
    html += lineChartHtml(
      "시즌별 OPS",
      [{ name: "OPS", color: CHART_COLORS.rival, values: list.map((h) => (h.bat && h.bat.PA >= 100 ? h.bat.OPS : null)) }],
      xs,
      fmtRate,
    );
  }
  const pit = list.filter((h) => h.pit && h.pit.outs >= 60).length >= 2;
  if (pit) {
    html += lineChartHtml(
      "시즌별 평균자책 (낮을수록 좋음)",
      [{ name: "평균자책", color: CHART_COLORS.ref, values: list.map((h) => (h.pit && h.pit.outs >= 60 ? h.pit.ERA : null)) }],
      xs,
      (v) => (+v).toFixed(2),
    );
  }
  return html + `<p class="small">가로축은 연도 (뒤 두 자리). 점에 마우스를 올리면 값이 보여요.</p></div>`;
}
