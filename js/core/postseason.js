// =============================================
// postseason.js : 포스트시즌 기록 (정규시즌 기록과 따로 쌓음)
// =============================================

// 라운드마다 실제 경기 수만큼 시뮬레이션, 상대가 강해서 리그 수준 +3
const PS_BO = {
  KBO: { 4: 2, 3: 5, 2: 5, 1: 7 },
  NPB: { 3: 3, 2: 6, 1: 7 },
  MLB: { 4: 3, 3: 5, 2: 7, 1: 7 },
  ABL: { 2: 3, 1: 3 },
  INDIE: { 2: 3, 1: 3 },
  KBO2: { 2: 1, 1: 1 },
  SANGMU: { 2: 1, 1: 1 },
};

function seriesGames(bo) {
  if (bo <= 1) return 1;
  if (bo === 2) return randomInt(1, 2); // 와일드카드: 1위 팀은 1승만 하면 됨
  const need = Math.ceil(bo / 2);
  return randomInt(need, bo);
}

function postseasonStats(player, report, mod) {
  const ps = report.postseason;
  if (!ps || !ps.length || report.noPostseason) return; // 부상·2군이면 가을야구 못 뜀
  mod += report.psMod || 0; // 진통제 맞고 출전 (injury.js)
  const bo = PS_BO[report.league] || {};
  const games = ps.reduce((s, g) => s + seriesGames(bo[g.round] || 5), 0);
  const level = LEAGUES[report.league].level + 3;
  const env = LEAGUE_ENV[report.league];
  const fall = player.hidden && player.hidden.season === "fall" ? 5 : 0; // 가을 체질
  if (report.bat && report.bat.G) {
    const big = ((player.stats.clutch || 50) - 50) / 10; // 큰 경기는 클러치가 더 중요함
    const pa = clamp(report.bat.PA / report.bat.G, 1, 4.6);
    const pos = player.position.split(" 겸 ").pop();
    report.psBat = simBattingSeason(player.stats, level, games, pa, mod + fall + big, pos, env);
  }
  if (report.pit && report.pit.G) {
    const big = ((player.stats.mental || 50) - 50) / 10;
    const role = report.pit.role.includes("선발") ? "starter" : report.pit.role.includes("마무리") ? "closer" : "setup";
    const apps = role === "starter" ? Math.max(1, Math.round(games / 4.2)) : Math.max(1, Math.round(games * 0.55));
    report.psPit = simPitchingSeason(player.stats, level, role, apps, mod + fall + big, env);
  }
  report.psWAR = round((report.psBat ? report.psBat.WAR : 0) + (report.psPit ? report.psPit.WAR : 0), 1);
  // 가을에 미친 활약이면 팬 반응
  const b = report.psBat,
    p = report.psPit;
  if ((b && b.PA >= 12 && b.OPS >= 1.0) || (p && p.outs >= 18 && p.ERA <= 1.5)) report.specials.push({ key: "autumnHot" });
}

// 기록 탭 맨 아래 포스트시즌 통산
function psTotals(player) {
  const list = (player.history || []).filter((h) => h.psBat || h.psPit);
  if (!list.length) return null;
  return careerTotals({ history: list.map((h) => ({ league: h.league, bat: h.psBat, pit: h.psPit, WAR: h.psWAR || 0 })) });
}

function psStatHtml(report) {
  const b = report.psBat,
    p = report.psPit;
  let html = "";
  if (b) html += `<p class="small">🍂 가을야구 타격: ${b.G}경기 타율 ${fmtRate(b.AVG)} · ${b.HR}홈런 ${b.RBI}타점 · OPS ${fmtRate(b.OPS)}</p>`;
  if (p)
    html += `<p class="small">🍂 가을야구 투구: ${p.G}경기 ${fmtInnings(p.outs)}이닝 ${p.W}승 ${p.L}패${p.SV ? ` ${p.SV}세이브` : ""}${p.HLD ? ` ${p.HLD}홀드` : ""} · 평균자책 ${p.ERA.toFixed(2)} · ${p.K}삼진</p>`;
  return html;
}
