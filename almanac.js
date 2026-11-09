// =============================================
// almanac.js : v16 기록 연감 탭 (OOTP 연감 느낌)
// 1. 시즌 리그 리더보드 (가짜 선수들 + 나)
// 2. 마일스톤 진행도
// 3. 커리어 하이
// 4. 트래킹 기록 (해마다 최고 구속, 최장 홈런)
// 5. 이 브라우저 역대 기록실
// 6. 명장면 다시 보기
// =============================================

// 리더보드 항목: statRanks의 key랑 같음. step도 statRanks랑 같게 맞춤
const LEADER_KEYS = {
  avg: { step: 0.006, rate: true, get: (r) => r.bat && r.bat.AVG },
  hr:  { step: 2, get: (r) => r.bat && r.bat.HR },
  rbi: { step: 4, get: (r) => r.bat && r.bat.RBI },
  ops: { step: 0.02, rate: true, get: (r) => r.bat && r.bat.OPS },
  sb:  { step: 3, get: (r) => r.bat && r.bat.SB },
  era: { step: 0.15, low: true, dec: 2, get: (r) => r.pit && r.pit.ERA },
  w:   { step: 1, get: (r) => r.pit && r.pit.W },
  k:   { step: 8, get: (r) => r.pit && r.pit.K },
  sv:  { step: 2, get: (r) => r.pit && r.pit.SV },
  hld: { step: 2, get: (r) => r.pit && r.pit.HLD },
  war: { step: 0.4, dec: 1, get: (r) => r.WAR },
};

function fmtLeader(key, v) {
  const k = LEADER_KEYS[key];
  if (k.rate) return fmtRate(v);
  if (k.dec) return v.toFixed(k.dec);
  return Math.round(v);
}

// 상위 5명 만들기. 내 순위(statRanks 결과)는 그대로 지킴
function makeLeaders(player, report) {
  const line = AWARD_LINE[report.league];
  if (!line || !report.ranks) return;
  const lg = report.league;
  const boards = [];
  for (const r of report.ranks) {
    const k = LEADER_KEYS[r.key];
    if (!k) continue;
    const sign = k.low ? -1 : 1; // 평균자책은 낮을수록 좋음 → 부호 뒤집어서 계산
    const mine = sign * k.get(report);
    const top = sign * line[r.key];
    const n = 5;
    const arr = [];
    for (let i = 1; i <= n; i++) arr.push(top - (i - 1) * k.step * (0.7 + Math.random() * 0.6));
    const me = r.rank <= n ? r.rank - 1 : -1;
    if (me >= 0) {
      arr[me] = mine;
      for (let i = me - 1; i >= 0; i--) arr[i] = Math.max(arr[i], arr[i + 1] + k.step * (0.15 + Math.random() * 0.3));
      for (let i = me + 1; i < n; i++) arr[i] = Math.min(arr[i], arr[i - 1] - k.step * (0.15 + Math.random() * 0.3));
    } else {
      // 나보다 다 잘해야 함
      for (let i = n - 1; i >= 0; i--) arr[i] = Math.max(arr[i], mine + (r.rank - 1 - i) * k.step * 0.3, i < n - 1 ? arr[i + 1] + k.step * 0.1 : -Infinity);
    }
    const rows = arr.map((v, i) => ({
      name: i === me ? player.name : fakeName(lg),
      team: i === me ? report.team : pick(TEAMS[lg] || TEAMS.KBO),
      v: Math.max(0, sign * v),
      me: i === me,
    }));
    // 정수 기록은 반올림 (내 기록은 원래 값)
    for (const row of rows) if (!k.rate && !k.dec && !row.me) row.v = Math.round(row.v);
    boards.push({ key: r.key, label: r.label, rank: r.rank, mine: k.get(report), rows });
  }
  report.leaders = boards;
}

// ---------------------------------------------
// 탭 그리기
// ---------------------------------------------
let almanacYear = null; // 리더보드에서 고른 연도

function showAlmanac(player) {
  const box = $("tab-almanac");
  if (!box) return;
  const pro = player.history.filter((h) => !isAmateur(h.league));
  let html = "";
  html += leadersHtml(player);
  html += milestoneHtml(player);
  html += careerHighHtml(player, pro);
  html += trackHistoryHtml(player);
  html += hallHtml(player);
  html += highlightHtml(player);
  box.innerHTML = html || "<p class='empty'>아직 연감에 실을 기록이 없어요.</p>";
}

function leadersHtml(player) {
  const seasons = player.history.filter((h) => h.leaders && h.leaders.length);
  if (!seasons.length) return `<h4>📊 리그 리더보드</h4><p class="small">KBO·NPB·MLB 1군 시즌을 치르면 리그 기록 순위표가 실려요.</p>`;
  let h = seasons.find((x) => x.year === almanacYear) || seasons[seasons.length - 1];
  let html = `<h4>📊 리그 리더보드 <select id="almanac-year">${seasons.map((x) => `<option value="${x.year}" ${x === h ? "selected" : ""}>${x.year} ${LEAGUES[x.league].name}</option>`).join("")}</select></h4><div class="leaders">`;
  for (const b of h.leaders) {
    html += `<div class="leader"><b>${b.label}</b><ol>`;
    b.rows.forEach((row) => {
      html += `<li class="${row.me ? "mine" : ""}"><span>${row.name}<small>${row.team.split(" ")[0]}</small></span><em>${fmtLeader(b.key, row.v)}</em></li>`;
    });
    html += "</ol>";
    if (b.rank > b.rows.length) html += `<p class="me-rank">… ${b.rank > 30 ? "30위 밖" : b.rank + "위"} ${player.name} ${fmtLeader(b.key, b.mine)}</p>`;
    html += "</div>";
  }
  html += `</div><p class="small">${h.year}년 ${h.team} · 다른 선수 이름은 게임이 만든 가상의 선수예요.</p>`;
  return html;
}

document.getElementById("tab-almanac").addEventListener("change", (event) => {
  if (event.target.id !== "almanac-year") return;
  almanacYear = Number(event.target.value);
  showAlmanac(currentPlayer);
});

// 마일스톤
const MILESTONES = {
  bat: [
    { label: "안타", key: "H", steps: [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000] },
    { label: "홈런", key: "HR", steps: [100, 200, 300, 400, 500, 600, 700, 800] },
    { label: "타점", key: "RBI", steps: [500, 1000, 1500, 2000] },
    { label: "도루", key: "SB", steps: [100, 200, 300, 400, 500] },
  ],
  pit: [
    { label: "승리", key: "W", steps: [50, 100, 150, 200, 250, 300] },
    { label: "탈삼진", key: "pK", steps: [500, 1000, 1500, 2000, 2500, 3000, 4000] },
    { label: "세이브", key: "SV", steps: [100, 200, 300, 400, 500] },
    { label: "홀드", key: "HLD", steps: [50, 100, 150, 200] },
  ],
};

function milestoneHtml(player) {
  const t = careerTotals(player);
  const sides = [];
  if (t.PA) sides.push("bat");
  if (t.outs) sides.push("pit");
  if (!sides.length) return "";
  let html = `<h4>🎯 마일스톤 <small>(프로 통산)</small></h4><ul class="miles">`;
  for (const side of sides) {
    for (const m of MILESTONES[side]) {
      const v = t[m.key] || 0;
      const done = m.steps.filter((s) => v >= s);
      const next = m.steps.find((s) => v < s);
      const prev = done.length ? done[done.length - 1] : 0;
      const pct = next ? Math.round(((v - prev) / (next - prev)) * 100) : 100;
      html += `<li><span>${m.label} <b>${v}</b></span><span class="vbar"><i style="width:${pct}%" class="${next ? "" : "in"}"></i></span><small>${next ? `${next}${m.label === "안타" ? "안타" : ""}까지 ${next - v}` : "전부 달성!"}${done.length ? ` · ✔ ${prev}` : ""}</small></li>`;
    }
  }
  return html + "</ul>";
}

// 커리어 하이 (규정타석·규정이닝 채운 시즌만 비율 기록에 씀)
function careerHighHtml(player, pro) {
  if (!pro.length) return "";
  const best = (list, fn, low) => list.reduce((b, h) => (fn(h) === undefined ? b : !b || (low ? fn(h) < fn(b) : fn(h) > fn(b)) ? h : b), null);
  const rows = [];
  const bats = pro.filter((h) => h.bat && h.bat.PA);
  const qb = bats.filter((h) => h.bat.PA >= (LEAGUES[h.league] ? LEAGUES[h.league].games : 100) * 3.1);
  const pits = pro.filter((h) => h.pit && h.pit.G);
  const qp = pits.filter((h) => h.pit.outs / 3 >= (LEAGUES[h.league] ? LEAGUES[h.league].games : 100));
  const add = (label, h, text) => h && rows.push(`<tr><td>${label}</td><td><b>${text}</b></td><td>${h.year} ${h.team.split(" ")[0]}</td></tr>`);
  let h;
  if ((h = best(qb, (x) => x.bat.AVG))) add("타율", h, fmtRate(h.bat.AVG));
  if ((h = best(bats, (x) => x.bat.HR))) add("홈런", h, h.bat.HR);
  if ((h = best(bats, (x) => x.bat.RBI))) add("타점", h, h.bat.RBI);
  if ((h = best(bats, (x) => x.bat.SB)) && h.bat.SB) add("도루", h, h.bat.SB);
  if ((h = best(qb, (x) => x.bat.OPS))) add("OPS", h, fmtRate(h.bat.OPS));
  if ((h = best(qp, (x) => x.pit.ERA, true))) add("평균자책", h, h.pit.ERA.toFixed(2));
  if ((h = best(pits, (x) => x.pit.W)) && h.pit.W) add("승리", h, h.pit.W);
  if ((h = best(pits, (x) => x.pit.K))) add("탈삼진", h, h.pit.K);
  if ((h = best(pits, (x) => x.pit.SV)) && h.pit.SV) add("세이브", h, h.pit.SV);
  if ((h = best(pro, (x) => x.WAR))) add("WAR", h, h.WAR);
  if (!rows.length) return "";
  return `<h4>⭐ 커리어 하이</h4><table class="highs"><tr><th>기록</th><th>최고</th><th>시즌</th></tr>${rows.join("")}</table>`;
}

// 해마다 트래킹 기록
function trackHistoryHtml(player) {
  const list = player.history.filter((h) => h.track && (h.track.veloMax || h.track.exitMax));
  if (!list.length) return "";
  const rec = player.records || {};
  let html = `<h4>📡 트래킹 기록</h4><p class="chips">${rec.velo ? `<span class="top">개인 최고 구속 ${rec.velo}km/h (${rec.veloYear})</span>` : ""}${rec.hrDist ? `<span class="top">최장 홈런 ${rec.hrDist}m (${rec.hrDistYear})</span>` : ""}${rec.exit ? `<span>최고 타구 속도 ${rec.exit}km/h</span>` : ""}</p>`;
  const velo = list.filter((h) => h.track.veloMax);
  if (velo.length) {
    const lo = 135;
    const hi = Math.max(...velo.map((h) => h.track.veloMax), 160);
    html += `<p class="small">해마다 최고 구속</p><ul class="velo-bars">${velo.map((h) => `<li><span>${h.year}</span><span class="vbar"><i style="width:${Math.round(((h.track.veloMax - lo) / (hi - lo)) * 100)}%" class="${h.track.veloMax === rec.velo ? "in" : ""}"></i></span><b>${h.track.veloMax}</b></li>`).join("")}</ul>`;
  }
  const hrs = list.filter((h) => h.track.hrMax);
  if (hrs.length) {
    html += `<p class="small">해마다 최장 홈런</p><ul class="velo-bars">${hrs.map((h) => `<li><span>${h.year}</span><span class="vbar"><i style="width:${Math.round(((h.track.hrMax - 100) / 55) * 100)}%" class="${h.track.hrMax === rec.hrDist ? "in" : ""}"></i></span><b>${h.track.hrMax}m</b></li>`).join("")}</ul>`;
  }
  return html;
}

// 이 브라우저에서 은퇴한 선수들 + 지금 선수
function hallHtml(player) {
  const past = loadRanking();
  const me = careerTotals(player);
  const sum = (r, fn) => (r.history ? r.history.filter((h) => !isAmateur(h.league)).reduce((s, h) => s + (fn(h) || 0), 0) : null);
  const people = past.map((r) => ({ name: r.name, WAR: r.WAR, HR: r.HR, W: r.W, SV: r.SV, H: sum(r, (h) => h.bat && h.bat.H), K: sum(r, (h) => h.pit && h.pit.K) }));
  people.push({ name: player.name, WAR: me.WAR, HR: me.HR, W: me.W, SV: me.SV, H: me.H, K: me.pK, now: true });
  const cats = [["통산 WAR", "WAR"], ["홈런", "HR"], ["안타", "H"], ["승리", "W"], ["세이브", "SV"], ["탈삼진", "K"]];
  let html = `<h4>🏛️ 역대 기록실 <small>(이 브라우저에서 키운 선수들)</small></h4><div class="leaders">`;
  for (const [label, key] of cats) {
    const list = people.filter((p) => p[key] !== null && p[key] > 0).sort((a, b) => b[key] - a[key]);
    if (!list.length) continue;
    const myIdx = list.findIndex((p) => p.now);
    html += `<div class="leader"><b>${label}</b><ol>${list.slice(0, 5).map((p) => `<li class="${p.now ? "mine" : ""}"><span>${p.name}${p.now ? "<small>현역</small>" : ""}</span><em>${p[key]}</em></li>`).join("")}</ol>${myIdx >= 5 ? `<p class="me-rank">… ${myIdx + 1}위 ${player.name} ${list[myIdx][key]}</p>` : ""}</div>`;
  }
  html += "</div>";
  if (!past.length) html += `<p class="small">아직 은퇴한 선수가 없어요. 이 선수가 첫 번째 기록 보유자예요.</p>`;
  return html;
}

function highlightHtml(player) {
  const list = player.highlights || [];
  if (!list.length) return "";
  return `<h4>🎙️ 명장면 다시 보기</h4>${[...list].reverse().map((h) => `<details class="hl ${h.ok ? "ok" : "fail"}"><summary>${h.year} · ${h.stage} <b>${h.title}</b></summary>${h.pbp.map((l) => `<p>${l}</p>`).join("")}</details>`).join("")}`;
}
