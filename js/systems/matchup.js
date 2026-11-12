// =============================================
// matchup.js : 상대 전적 + 천적
// 숙적 후보(nemesis.js)마다 숨은 궁합(aff)이 있음 → 유난히 못 치는 투수, 유난히 잘 치는 투수가 생김
// 통산 25타석 넘으면 관계가 붙음: 천적 (상대가 나를 압도) / 킬러 (내가 상대를 압도)
// 관계 생길 때·뒤집을 때 기사, 후반기 시작 전엔 천적 예고 기사
// =============================================

// 궁합: 대부분은 비슷, 다섯에 하나 꼴로 확 갈림
function matchupAff() {
  if (Math.random() < 0.2) return (Math.random() < 0.55 ? 1 : -1) * (0.22 + Math.random() * 0.2);
  return round(gauss() * 0.06, 3);
}

// 관계 이름 (나 기준). 상대가 투수면 내가 타석, 상대가 타자면 내가 마운드
function matchupTag(n) {
  if (n.tot.PA < 25) return null;
  const ab = Math.max(1, n.tot.PA - n.tot.BB);
  const avg = n.tot.H / ab;
  const vsBat = n.type === "pitcher";
  if (vsBat) return avg <= 0.16 ? "nemesis" : avg >= 0.38 ? "killer" : null;
  return avg >= 0.38 ? "nemesis" : avg <= 0.15 ? "killer" : null;
}

const MATCHUP_TAGS = { nemesis: "천적", killer: "킬러" };

// 시즌 끝 (flow.js afterSeason): 관계 새로 생기거나 뒤집혔는지
function matchupSeason(player, report) {
  if (!report.nemesis || !player.nemeses) return;
  for (const x of report.nemesis) {
    const n = player.nemeses.find((m) => m.name === x.name && m.league === report.league);
    if (!n) continue;
    const tag = matchupTag(n);
    const before = n.tag || null;
    n.tag = tag;
    if (tag === before) continue;
    const ab = Math.max(1, n.tot.PA - n.tot.BB);
    const line = `통산 ${ab}타수 ${n.tot.H}안타 (${fmtRate(n.tot.H / ab)}) ${n.tot.HR}홈런`;
    const vsBat = n.type === "pitcher";
    if (tag === "nemesis") {
      report.news.push(
        vsBat
          ? `${player.name}, ${n.name} 공만 만나면 작아진다… ${line}`
          : `${player.name}, ${n.name}만 나오면 흔들린다… 통산 피안타율 ${fmtRate(n.tot.H / ab)} ${n.tot.HR}피홈런`,
      );
      report.comments = report.comments || [];
      report.comments.push(makeComment(pick(FAN.matchupNemesis), player, { nem: n.name }, "hot"));
    } else if (tag === "killer") {
      report.news.push(`${player.name}, '${n.name} 킬러' 등극… ${line}`);
      report.comments = report.comments || [];
      report.comments.push(makeComment(pick(FAN.matchupKiller), player, { nem: n.name }, "hot"));
    } else if (before === "nemesis") {
      // 천적 극복
      player.nemesisBeaten = (player.nemesisBeaten || 0) + 1;
      report.news.push(`${player.name}, 천적 ${n.name} 넘었다… 올해 맞대결 ${x.H}안타 ${x.HR}홈런`);
      report.bigMoments = report.bigMoments || [];
      report.bigMoments.push({ tone: "good", kicker: "천적 극복", title: `💥 ${n.name}`, lines: [`올해 ${x.PA}타석 ${x.H}안타 ${x.HR}홈런`, line] });
    }
  }
}

// 후반기 시작 전 예고 (flow.js halfBreak)
function matchupPreview(player, ctx) {
  const list = (player.nemeses || []).filter((n) => n.league === player.league && n.status === "active" && n.team !== player.team && n.tag);
  if (!list.length || Math.random() >= 0.6) return;
  const n = pick(list);
  const ab = Math.max(1, n.tot.PA - n.tot.BB);
  const avg = fmtRate(n.tot.H / ab);
  if (n.tag === "nemesis") ctx.report.news.push(`후반기 첫 시리즈 ${n.team} 상대… ${player.name} vs 천적 ${n.name} (통산 ${avg}) 다시 만난다`);
  else ctx.report.news.push(`${n.team}, 후반기 ${player.name} 경계령… '${n.name} 킬러' (통산 ${avg})`);
}

// 숙적 탭 맨 위: 상대 전적표
function matchupTableHtml(player) {
  const list = (player.nemeses || []).filter((n) => n.tot.PA > 0).sort((a, b) => b.tot.PA - a.tot.PA);
  if (!list.length) return "";
  const rows = list
    .map((n) => {
      const ab = Math.max(1, n.tot.PA - n.tot.BB);
      const tag = matchupTag(n);
      const vsBat = n.type === "pitcher";
      return `<tr class="${tag || ""}"><td class="sticky">${n.name}${tag ? ` <span class="mu-tag ${tag}">${MATCHUP_TAGS[tag]}</span>` : ""}</td><td>${n.team.split(" ")[0]}</td><td>${vsBat ? "투수" : "타자"}</td><td>${n.tot.PA}</td><td>${n.tot.H}</td><td><b>${fmtRate(n.tot.H / ab)}</b></td><td>${n.tot.HR}</td><td>${n.tot.K}</td><td>${n.tot.BB}</td></tr>`;
    })
    .join("");
  return `<h4>📋 상대 전적 <small>25타석 넘으면 천적·킬러가 붙어요 · ${player.type === "pitcher" ? "피안타율" : "타율"} 기준</small></h4>
    <div class="table-scroll"><table class="mu-table"><tr><th class="sticky">상대</th><th>팀</th><th></th><th>타석</th><th>안타</th><th>타율</th><th>홈런</th><th>삼진</th><th>볼넷</th></tr>${rows}</table></div>`;
}

Object.assign(FAN, {
  matchupNemesis: ["{nem} 나오면 그냥 대타 써라 ㅋㅋ", "천적은 천적이다", "{nem} 상대로는 답이 없네", "이건 상성 문제임", "{nem} 등판하면 채널 돌린다"],
  matchupKiller: ["{nem} 상대로는 신이네 ㅋㅋ", "{nem} 킬러 ㅇㅈ", "{nem} 또 털리겠네", "상성 미쳤다 ㅋㅋㅋ"],
});

ACHIEVEMENTS.push({ id: "nemesisBeaten", group: "커리어", name: "천적 극복", desc: "천적으로 찍힌 상대를 넘어섬", check: (p) => (p.nemesisBeaten || 0) >= 1 });
