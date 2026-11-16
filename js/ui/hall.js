// =============================================
// hall.js : 업적 도감, 명예의 전당, 은퇴 화면, 역대 랭킹
// =============================================

function showAchievements(box) {
  const got = loadAchievements();
  const done = ACHIEVEMENTS.filter((a) => got[a.id]).length;
  let html = `<p class="ach-count">달성 <b>${done}</b> / ${ACHIEVEMENTS.length} <small>(모든 선수 합산, 이 브라우저에 저장)</small></p>`;
  const groups = [...new Set(ACHIEVEMENTS.map((a) => a.group))];
  for (const g of groups) {
    html += `<h4>${g}</h4><ul class="ach">`;
    for (const a of ACHIEVEMENTS.filter((x) => x.group === g)) {
      const info = got[a.id];
      html += `<li class="${info ? "on" : ""}"><b>${info ? "🏅" : "🔒"} ${a.name}</b><small>${a.desc}</small>${info ? `<small class="by">${info.year}년 · ${info.by}</small>` : ""}</li>`;
    }
    html += "</ul>";
  }
  box.innerHTML = html;
}

// 명예의 전당 표
function hofHallHtml() {
  const hall = loadHof();
  if (!hall.length) return "<p class='small'>아직 헌액된 선수가 없어요. 첫 번째 주인공이 돼 보세요.</p>";
  let html = "<table><tr><th>헌액</th><th>이름</th><th>득표</th><th>WAR</th><th>MVP</th></tr>";
  for (const h of [...hall].sort((a, b) => b.pct - a.pct)) {
    html += `<tr><td>${h.year}</td><td>${h.name}${h.nickname ? ` <small>'${h.nickname}'</small>` : ""}</td><td>${h.pct}%</td><td>${h.WAR}</td><td>${h.MVP}</td></tr>`;
  }
  return html + "</table>";
}

// ---------- 은퇴 화면 ----------
function showRetired(player) {
  const t = careerTotals(player);
  const awardList =
    Object.entries(player.awards)
      .map(([k, v]) => `${k} ${v}회`)
      .join(", ") || "없음";
  let html = `<h2>${player.name} 은퇴</h2>
    <p>${player.school} 출신 · ${gameYear(player)}년 ${koreanAge(player.age)}세 은퇴 · 최고 OVR ${player.bestOvr}</p>
    <p>통산 WAR <b>${t.WAR}</b> · 모은 재산 <b>${fmtMoney(player.money)}</b> · FA로 번 돈 <b>${player.faDeals ? `${fmtMoney(player.faEarned)} (${player.faDeals}번 계약)` : "없음"}</b>${player.agentFees ? ` · 에이전트 수수료 ${fmtMoney(player.agentFees)}` : ""}</p>
    ${player.nickname ? `<p>별명: '${player.nickname}' · 팬 여론 ${fameLabel(player.fame || 0)}</p>` : ""}
    ${player.retireNews ? `<p>📰 ${player.retireNews}</p>` : ""}
    ${player.myManagers && player.myManagers.length ? `<p>함께한 감독: ${player.myManagers.join(", ")}</p>` : ""}`;
  if (t.AB) html += `<p>타격: 타율 ${fmtRate(t.AVG)} · ${t.HR}홈런 · ${t.RBI}타점 · OPS ${fmtRate(t.OPS)}</p>`;
  if (t.outs) html += `<p>투구: ${t.W}승 ${t.L}패 ${t.SV}세이브 ${t.HLD}홀드 · 평균자책 ${t.ERA.toFixed(2)} · ${t.pK}탈삼진</p>`;
  html += `<p>수상: ${awardList}</p>`;
  html += `<details class="retire-record" open><summary>📊 시즌별·통산 기록</summary>${recordHtml(player)}</details>`;
  $("retire-summary").innerHTML = html;

  const ranking = loadRanking();
  let table = "<table><tr><th>#</th><th>이름</th><th>통산 WAR</th><th>MVP</th><th>우승</th><th>재산</th></tr>";
  ranking.slice(0, 10).forEach((r, i) => {
    const me = r.name === player.name && r.WAR === careerTotals(player).WAR;
    table += `<tr class="rank-row${me ? " mine" : ""}" data-rank="${i}"><td>${i + 1}</td><td>${r.name}${r.banned ? " ⛔" : ""}${r.history ? " 🔍" : ""}</td><td><b>${r.WAR}</b></td><td>${r.MVP}</td><td>${r.champs}</td><td>${r.money !== undefined ? fmtMoney(r.money) : "-"}</td></tr>`;
  });
  $("ranking").innerHTML = table + `</table><p class="small">선수 이름을 누르면 통산 기록을 볼 수 있어요.</p><div id="ranking-detail"></div>`;

  // 명예의 전당 투표 결과
  const hof = player.hof;
  if (hof && hof.banned) {
    $("hof-result").innerHTML = `<h3>명예의 전당 투표</h3><p>⛔ 승부조작으로 영구 제명돼서 후보 자격이 없어요.</p>`;
  } else if (hof && hof.eligible === false) {
    $("hof-result").innerHTML = `<h3>명예의 전당 투표</h3><p>프로 ${hof.proYears}시즌이라 후보 자격(프로 10시즌)이 없어요.</p>`;
  } else if (hof) {
    const bars = hof.ballots
      .map(
        (b) =>
          `<div class="ballot"><span>${b.year}</span><span class="vbar"><i style="width:${b.pct}%" class="${b.pct >= 75 ? "in" : ""}"></i><em></em></span><b>${b.pct}%</b></div>`,
      )
      .join("");
    const verdict = hof.inducted
      ? `🏛️ <b>${hof.ballot === 1 ? "첫 투표에서" : `${hof.ballot}번째 투표에서`} 명예의 전당 헌액!</b>`
      : hof.dropped
        ? "득표율 5% 미만으로 후보에서 빠졌어요."
        : "10번의 투표에서 끝내 75%를 넘지 못했어요.";
    $("hof-result").innerHTML = `<h3>명예의 전당 투표 <small>(은퇴 5년 뒤부터, 75% 이상 헌액)</small></h3><p>${verdict}</p><div class="ballots">${bars}</div>`;
  }
  $("hof-hall").innerHTML = hofHallHtml();
  showAchievements($("ach-retired"));

  createScreen.hidden = true;
  playerScreen.hidden = true;
  retiredScreen.hidden = false;
}

// 역대 랭킹에서 선수를 누르면 그 선수의 시즌별·통산 기록
$("ranking").addEventListener("click", (event) => {
  const row = event.target.closest(".rank-row");
  if (!row) return;
  const r = loadRanking()[Number(row.dataset.rank)];
  const box = $("ranking-detail");
  if (!r) return;
  if (box.dataset.open === row.dataset.rank) {
    box.innerHTML = "";
    box.dataset.open = "";
    return;
  } // 한 번 더 누르면 닫기
  box.dataset.open = row.dataset.rank;
  if (!r.history) {
    box.innerHTML = `<p class="small">${r.name}: 예전 버전에서 은퇴한 선수라 시즌별 기록이 없어요.</p>`;
    return;
  }
  const past = { history: r.history, awards: r.awards || {}, nicknames: r.nicknames || [] };
  box.innerHTML = `<div class="rank-detail"><h4>${r.name}${r.nickname ? ` '${r.nickname}'` : ""} <small>${r.school || ""} · 통산 WAR ${r.WAR}${r.hof ? " · 🏛️ 명예의 전당" : ""}</small></h4>${recordHtml(past, true)}</div>`;
  box.scrollIntoView({ behavior: "smooth", block: "start" });
});
