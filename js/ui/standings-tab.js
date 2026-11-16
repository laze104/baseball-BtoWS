// =============================================
// standings-tab.js : 순위표 (시즌 결과의 최종 순위 + 역대 순위 탭)
// 역대 순위 탭: 내 팀 순위 기록 + 리그별 연도별 순위 + 팀별 통산
// =============================================

// 지구(리그)별 최종 순위표
function standingTableHtml(report) {
  const s = report.standing;
  const top = s.table[0];
  let html = `<h4>${s.group || LEAGUES[report.league].name} 최종 순위</h4><table class="standings"><tr><th>순위</th><th>팀</th><th>승</th><th>패</th><th>승률</th><th>게임차</th></tr>`;
  s.table.forEach((t, i) => {
    const gb = (top.w - t.w + (t.l - top.l)) / 2;
    const cls = [t.team === report.team ? "mine" : "", t.seed ? "in" : ""].join(" ");
    html += `<tr class="${cls}"><td>${i + 1}</td><td>${t.team}${t.seed ? ` <small class="seed">PS${report.league === "KBO" ? "" : " " + t.seed}</small>` : ""}</td><td>${t.w}</td><td>${t.l}</td><td>${(t.w / (t.w + t.l)).toFixed(3).slice(1)}</td><td>${gb ? gb.toFixed(1) : "-"}</td></tr>`;
  });
  html += "</table>";
  if (report.league === "MLB") html += `<p class="small">MLB: 리그마다 지구 우승 3팀 + 와일드카드 3팀이 포스트시즌에 나가요.</p>`;
  if (report.league === "NPB") html += `<p class="small">NPB: 리그마다 1~3위가 클라이맥스 시리즈에 나가요.</p>`;
  if (report.league === "ABL") html += `<p class="small">호주리그: 11월~1월 겨울 리그, 팀당 40경기. 1~4위가 플레이오프에 나가 클랙스턴 실드를 다퉈요.</p>`;
  return html;
}

// ---------------------------------------------
// 역대 순위 탭
// ---------------------------------------------

const TABLE_LEAGUE = (lg) => (lg === "SANGMU" ? "KBO2" : lg); // 상무는 퓨처스리그로 묶음
// 팀 이름 줄이기: KBO는 앞 단어(KIA, LG), 해외는 뒤 단어(다저스, 양키스)
const shortTeam = (t) => (!t.includes(" ") ? t : TEAMS.KBO.includes(t) || (TEAMS.KBO2 || []).includes(t) ? t.split(" ")[0] : t.split(" ").pop());

// 우승팀: 내가 우승했으면 우리 팀, 아니면 저장된 다른 팀 (결정적 순간 고르기 전엔 비밀)
function seasonChamp(player, h, isLast) {
  const name = CHAMPIONSHIP[h.league];
  if (!name || h.league === "COLLEGE") return null;
  if (isLast && clutchPending(player)) return "?";
  if (h.awards && h.awards.includes(name)) return h.team;
  return h.standing && h.standing.altChamp ? h.standing.altChamp : null;
}

function clutchPending(player) {
  return [player.pendingChoice, ...(player.choiceQueue || [])].some((c) => c && c.key === "clutch" && (c.kind === "seriesHero" || c.kind === "game7"));
}

// 그 시즌 내 조(지구)의 최종 순위
function groupTable(h) {
  const lg = h.league;
  const all = h.standing.all.map(([team, w, l, seed]) => ({ team, w, l, seed }));
  const g = groupOf(lg, h.team);
  return (g ? all.filter((t) => g.teams.includes(t.team)) : all).sort((a, b) => b.w - a.w);
}

function standingsTabHtml(player, pick) {
  const seasons = player.history.filter((h) => h.standing);
  if (!seasons.length) return "<p class='empty'>아직 순위 기록이 없어요. (고교는 주말리그라 빠짐)</p>";
  const last = player.history[player.history.length - 1];
  let html =
    "<h4>내 팀 역대 순위</h4><div class='scroll'><table class='stat-table rank-table'><tr><th class='sticky'>연도</th><th>리그</th><th>팀</th><th>순위</th><th>승-패</th><th>승률</th><th>가을</th><th>우승팀</th></tr>";
  for (const h of seasons) {
    const s = h.standing;
    const champ = seasonChamp(player, h, h === last);
    const mine = champ === h.team;
    html += `<tr class="${s.rank === 1 ? "first" : ""}"><td class="sticky">${h.year || ""}</td><td>${(s.group || LEAGUES[h.league].name).replace("아메리칸리그 ", "AL ").replace("내셔널리그 ", "NL ").replace(" 리그", "")}</td><td>${shortTeam(h.team)}</td>
      <td><b>${s.rank}</b>/${s.teams}</td><td>${s.w}-${s.l}</td><td>${fmtRate(s.w / (s.w + s.l))}</td>
      <td>${s.seed ? "●" : "-"}</td><td>${champ ? (mine ? "🏆 우리 팀" : champ === "?" ? "결정 전" : shortTeam(champ)) : "-"}</td></tr>`;
  }
  html += "</table></div>";

  // 리그별 버튼
  const leagues = [...new Set(seasons.filter((h) => h.standing.all).map((h) => TABLE_LEAGUE(h.league)))];
  if (!leagues.length) return html + "<p class='small'>리그 전체 순위는 v15부터 치른 시즌만 저장돼요.</p>";
  const lg = leagues.includes(pick) ? pick : leagues.includes(TABLE_LEAGUE(player.league)) ? TABLE_LEAGUE(player.league) : leagues[leagues.length - 1];
  html += `<h4>리그별 역대 순위</h4><p class="chips league-pick">${leagues.map((l) => `<button class="${l === lg ? "on" : ""}" data-lg="${l}">${LEAGUES[l].name}</button>`).join("")}</p>`;
  const list = seasons.filter((h) => h.standing.all && TABLE_LEAGUE(h.league) === lg);

  // 연도별 최종 순위 (내 조·지구 기준)
  const width = Math.max(...list.map((h) => groupTable(h).length));
  html += `<div class="scroll"><table class="stat-table rank-table rank-hist"><tr><th class="sticky">연도</th>${Array.from({ length: width }, (_, i) => `<th>${i + 1}위</th>`).join("")}<th>우승</th></tr>`;
  for (const h of list) {
    const champ = seasonChamp(player, h, h === last);
    html += `<tr><td class="sticky">${h.year}${h.standing.group ? `<br><small>${h.standing.group}</small>` : ""}</td>${groupTable(h)
      .map((t) => `<td class="${t.team === h.team ? "me" : ""}">${shortTeam(t.team)}<br><small>${t.w}-${t.l}${t.seed ? " ●" : ""}</small></td>`)
      .join("")}${"<td></td>".repeat(width - groupTable(h).length)}
      <td>${champ ? (champ === "?" ? "?" : `🏆 ${shortTeam(champ)}`) : "-"}</td></tr>`;
  }
  html += "</table></div><p class='small'>● 가을야구(포스트시즌) 진출 · 금색 칸이 우리 팀 · MLB·NPB·퓨처스는 그해 우리 조·지구 기준</p>";

  // 팀별 통산 (그 리그 전체 팀)
  const teams = {};
  // MLB·NPB처럼 팀이 많으면 내가 있던 조·지구 팀만
  const seen = new Set(list.flatMap((h) => groupTable(h).map((t) => t.team)));
  for (const h of list) {
    const champ = seasonChamp(player, h, h === last);
    const all = h.standing.all.map(([team, w, l, seed]) => ({ team, w, l, seed }));
    for (const t of all) {
      if (!seen.has(t.team) && champ !== t.team) continue;
      const g = groupOf(h.league, t.team);
      const rank = (g ? all.filter((x) => g.teams.includes(x.team)) : all).sort((a, b) => b.w - a.w).findIndex((x) => x.team === t.team) + 1;
      const r = teams[t.team] || (teams[t.team] = { n: 0, rank: 0, first: 0, ps: 0, champ: 0, w: 0, l: 0 });
      r.n++;
      r.rank += rank;
      r.w += t.w;
      r.l += t.l;
      if (rank === 1) r.first++;
      if (t.seed) r.ps++;
      if (champ === t.team) r.champ++;
    }
  }
  const rows = Object.entries(teams).sort((a, b) => b[1].champ - a[1].champ || a[1].rank / a[1].n - b[1].rank / b[1].n);
  html += `<h4>팀별 통산 <small>(${list.length}시즌)</small></h4><div class="scroll"><table class="stat-table rank-table"><tr><th class="sticky">팀</th><th>평균 순위</th><th>1위</th><th>가을야구</th><th>우승</th><th>승률</th></tr>`;
  for (const [team, r] of rows) {
    html += `<tr class="${team === player.team ? "me-row" : ""}"><td class="sticky">${shortTeam(team)}</td><td>${(r.rank / r.n).toFixed(1)}</td><td>${r.first}</td><td>${r.ps}</td><td>${r.champ ? `🏆 ${r.champ}` : "-"}</td><td>${fmtRate(r.w / (r.w + r.l))}</td></tr>`;
  }
  return html + "</table></div>";
}

function showStandings(player, pick) {
  const box = $("tab-rank");
  if (!box) return;
  box.innerHTML = standingsTabHtml(player, pick);
  box.onclick = (e) => {
    const lg = e.target.dataset && e.target.dataset.lg;
    if (lg) showStandings(player, lg);
  };
}
