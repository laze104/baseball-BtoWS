// =============================================
// clutch.js : 결정적 순간 (없는 시즌도 있음)
// 우승 결정전·기록 도전 타석에서 직접 고름. 고르기 전까지 결과는 숨김
// =============================================

// 끝난 시즌에 이미 들어간 기록에 상을 더함
function lateAward(player, name) {
  player.awards[name] = (player.awards[name] || 0) + 1;
  const h = player.history[player.history.length - 1];
  if (h && !h.awards.includes(name)) h.awards.push(name);
  const r = player.lastReport;
  if (r && h && r.year === h.year && !r.awards.includes(name)) r.awards.push(name);
}

const CLUTCH_OPTIONS = {
  bat: [
    { id: "first", label: "초구부터 노린다", stat: "contact", base: 0 },
    { id: "wait", label: "끝까지 공을 본다", stat: "eye", base: 0.05 },
    { id: "big", label: "한 방을 노린다 (홈런 스윙)", stat: "power", base: -0.12, big: true },
  ],
  pit: [
    { id: "heat", label: "직구로 정면 승부", stat: "velocity", base: 0 },
    { id: "break", label: "결정구 변화구", stat: "breaking", base: 0 },
    { id: "edge", label: "구석구석 제구", stat: "control", base: 0.03 },
    { id: "big", label: "가운데로 꽂는다 (삼진 아니면 장타)", stat: "stuff", base: -0.12, big: true },
  ],
};

function clutchChance(player, side, opt, level) {
  const stat = player.stats[opt.stat] || 50;
  const nerve = side === "bat" ? player.stats.clutch : player.stats.mental;
  const analyst = hasItem(player, "analyst") ? 0.05 : 0; // 개인 전력분석관
  return clamp(0.42 + (stat - level) / 50 + ((nerve || 50) - 50) / 120 + opt.base + analyst, 0.08, 0.9);
}

function maybeClutch(player, report) {
  if (player.retired || (!report.bat && !report.pit)) return;
  const lg = report.league;
  let moment = null;

  if (report.cupFinal) {
    moment = { kind: "hsFinal", stage: `${report.cupFinal} 결승` };
  } else if (CHAMPIONSHIP[lg] && PS_ROUNDS[lg] && report.standing && report.standing.seed && !report.noPostseason) {
    const fin = FINAL_SERIES[lg];
    const champion = report.awards.includes(CHAMPIONSHIP[lg]);
    const ps = report.postseason || [];
    const last = ps[ps.length - 1];
    const lostFinal = last && last.round === 1 && !last.won;
    // 우승이 걸린 경기: 7전 4선승제면 4~7차전 중 하나 (7차전까지 가는 건 드묾)
    const need = (fin.bo + 1) / 2;
    const n = pick(champion ? fin.win : fin.lose);
    const stage = fin.bo === 1 ? `${fin.name} (단판)` : `${fin.name} ${n}차전`;
    const note = fin.bo === 1 ? "단판 승부, 이기면 우승" : n === fin.bo ? `운명의 ${n}차전` : `시리즈 ${need - 1}승 ${n - need}패, 이기면 우승`;
    if (champion) {
      // 우승한 해는 무조건 우승 결정 경기를 내가 직접 치름 (선택하기 전까지 우승은 비밀)
      moment = { kind: "seriesHero", stage, series: fin.name, note };
      holdChampion(player, report, CHAMPIONSHIP[lg]);
    } else if (lostFinal && Math.random() < 0.5) {
      moment = { kind: "game7", stage, series: fin.name, note };
    }
    if (last && moment) last.pending = true;
  }
  if (!moment && PRO_LEAGUES.concat(["HS", "COLLEGE"]).includes(lg) && Math.random() < 0.25) {
    moment = { kind: "regular", stage: "정규시즌 분수령" };
  }
  if (!moment) return;

  const side = report.bat && report.pit ? pick(["bat", "pit"]) : report.bat ? "bat" : "pit";
  const level = LEAGUES[lg].level;
  let situation;
  if (moment.kind === "regular") {
    // 노히트노런·사이클링 히트는 정말 드묾 (KBO 역사에서 손에 꼽을 정도)
    // 리그 수준보다 한참 잘하는 선발 투수 / 타자에게만, 그것도 시즌에 1~2% 정도로 찾아옴
    const gap = (getOvrs(player)[side === "bat" ? "bat" : "pit"] || 0) - level;
    const starter = report.pit && report.pit.role && report.pit.role.includes("선발");
    if (side === "pit" && starter && Math.random() < clamp((gap - 4) * 0.002, 0, 0.02)) {
      situation = "노히트노런까지 아웃카운트 하나! 상대 4번 타자예요.";
    } else if (side === "bat" && Math.random() < clamp((gap - 4) * 0.002, 0, 0.02)) {
      situation = "사이클링 히트까지 3루타 하나! 마지막 타석이에요.";
    } else {
      situation =
        side === "bat"
          ? pick([
              "9회말 2사 1·2루, 한 점 차로 지고 있어요.",
              "연장 11회말 무사 3루, 끝내기 찬스예요.",
              "8회말 1사 만루, 동점 주자가 3루에 있어요.",
              "순위 싸움 맞대결, 0-0 9회말 선두 타자예요.",
            ])
          : pick([
              "1점 차 9회 2사 만루, 풀카운트예요.",
              "순위 싸움 맞대결, 8회 무사 2·3루 위기예요.",
              "7회까지 1실점 호투, 8회 1사 1·3루 위기예요.",
              "연장 10회 2사 2루, 상대 중심 타선이에요.",
            ]);
    }
  } else {
    const head = moment.note ? `${moment.note}. ` : "";
    situation =
      head +
      (side === "bat"
        ? pick([
            "9회말 2사 2·3루, 한 점 차로 지고 있어요. 타석에 당신이 섭니다.",
            "8회초 1사 만루, 동점 상황이에요.",
            "연장 10회말 1사 2루, 끝내기 찬스예요.",
            "7회 2사 1·3루, 상대 에이스가 내려가고 필승조가 올라왔어요.",
            "0-0으로 맞선 9회초, 선두 타자로 나섭니다.",
          ])
        : pick([
            "9회 2사 만루, 한 점 차 리드. 마운드에 당신이 섭니다.",
            "8회 무사 1·2루, 두 점 차 리드에서 등판해요.",
            "연장 11회 1사 3루, 상대 중심 타선이에요.",
            "6회 1사 2·3루, 선발이 무너지고 급히 올라왔어요.",
            "9회 선두 타자 볼넷, 한 점 차 리드예요.",
          ]));
  }
  const opts = CLUTCH_OPTIONS[side].filter((o) => player.stats[o.stat] !== undefined);
  pushChoiceFirst(player, {
    key: "clutch",
    tend: pickTend(side, opts), // 상대 성향 (boxscore.js 수싸움)
    kind: moment.kind,
    stage: moment.stage,
    side,
    level,
    situation,
    text: `⚡ 결정적 순간! [${moment.stage}] ${situation} 어떻게 할까요?`,
    options: opts.map((o) => ({
      id: o.id,
      label: o.label,
      detail: `${o.big ? "성공하면 대박, 실패하면 역적 · " : ""}성공 가능성 ${chanceLabel(clutchChance(player, side, o, level))}`,
    })),
  });
}

function pendingFinal(r) {
  const cups = r ? r.hsTournaments || r.collegeCups : null;
  return cups ? cups.find((x) => x.result === "결승 진출") : null;
}

function resolveClutch(player, choice, option) {
  const opt = CLUTCH_OPTIONS[choice.side].find((o) => o.id === option.id);
  // 기본은 능력치, 상대 성향 읽으면 보너스 (boxscore.js)
  // 숨긴 부상 안고 뛰면 -10%p (dilemma.js)
  const success = Math.random() < clutchChance(player, choice.side, opt, choice.level) + tendBonus(choice, option.id) - (choice.pain ? 0.1 : 0);
  player.lastClutch = success;
  // 포스트시즌 마지막 시리즈 결과 확정
  const lr = player.lastReport;
  const lastPs = lr && lr.postseason ? lr.postseason[lr.postseason.length - 1] : null;
  if (lastPs && lastPs.pending) {
    lastPs.pending = false;
    lastPs.won = success;
  }
  const news = [];
  const nerve = choice.side === "bat" ? "clutch" : "mental";
  const r = player.lastReport;

  if (success) {
    changeFame(player, opt.big ? 10 : 6);
    if (player.stats[nerve] !== undefined) player.stats[nerve] = clamp(player.stats[nerve] + 1, 1, 99);
    const hero =
      choice.side === "bat"
        ? opt.big
          ? `${player.name}, ${choice.stage} 끝내기 홈런! 경기장이 뒤집혔다`
          : `${player.name}, ${choice.stage} 결승타! 해결사 본능`
        : opt.big
          ? `${player.name}, ${choice.stage} 삼구삼진으로 경기 끝! 포효`
          : `${player.name}, ${choice.stage} 위기 탈출… 마운드의 수호신`;
    if (choice.situation.includes("사이클링")) news.push(`${player.name}, 마지막 타석 3루타! 사이클링 히트 완성`);
    else if (choice.situation.includes("노히트노런")) news.push(`${player.name}, 마지막 타자 삼진! 노히트노런 달성`);
    else news.push(hero);
    if (choice.kind === "hsFinal") {
      const t = pendingFinal(r);
      const name = choice.stage.replace(" 결승", "");
      if (t) t.result = "우승";
      lateAward(player, `${name} 우승`);
      news.push(`${r && r.collegeCups ? r.team : player.school}, ${name} 우승!`);
    } else if (choice.kind === "game7") {
      lateAward(player, CHAMPIONSHIP[player.history[player.history.length - 1].league]);
      news.push(`${player.team}, ${choice.stage}에서 우승 확정! ${player.name} 우승 반지 품었다`);
    } else if (choice.kind === "seriesHero") {
      lateAward(player, CHAMPIONSHIP[player.history[player.history.length - 1].league]);
      lateAward(player, `${choice.series || choice.stage.replace(" 우승 결정전", "")} 최우수선수`);
      news.push(`${player.team} 우승! ${player.name}, 시리즈 최우수선수까지`);
    } else if (choice.situation.includes("사이클링")) {
      lateAward(player, "사이클링 히트");
    } else if (choice.situation.includes("노히트노런")) {
      lateAward(player, "노히트노런");
    }
  } else {
    changeFame(player, opt.big ? -6 : -3);
    news.push(
      choice.side === "bat"
        ? `${choice.stage}, ${player.name} ${opt.big ? "헛스윙 삼진" : "범타"}… 고개 숙였다`
        : `${choice.stage}, ${player.name} ${opt.big ? "통한의 끝내기 피홈런" : "결승점 허용"}… 아쉬움 삼켰다`,
    );
    if (choice.kind === "hsFinal") {
      const t = pendingFinal(r);
      if (t) t.result = "준우승";
      news.push(`${r && r.collegeCups ? r.team : player.school}, ${choice.stage.replace(" 결승", "")} 준우승`);
    } else if (choice.kind === "game7" || choice.kind === "seriesHero") {
      news.push(`${player.team}, ${choice.series || choice.stage.replace(" 우승 결정전", "")} 준우승`);
    }
  }
  return news;
}

// 결정적 순간을 고르기 전까지 우승 소식을 숨김 (시즌 결과·기사·기록에서 잠시 빼기)
function holdChampion(player, report, name) {
  const i = report.awards.indexOf(name);
  if (i >= 0) report.awards.splice(i, 1);
  if (player.awards[name] > 1) player.awards[name]--;
  else delete player.awards[name];
  const h = player.history[player.history.length - 1];
  if (h) h.awards = h.awards.filter((a, k) => a !== name || k !== h.awards.indexOf(name));
  report.specials = report.specials.filter((sp) => !(sp.key === "champion" && sp.award === name));
  if (report.news) report.news = report.news.filter((n) => !n.includes(name));
}

// ---------------------------------------------
// 댓글 문구
// ---------------------------------------------

Object.assign(FAN, {
  clutchGood: ["소름 돋았다 진짜", "이게 스타지", "{name} 클러치 미쳤다", "오늘 야구 본 사람 승리자", "하이라이트 100번 돌려봄"],
  clutchBad: ["그걸 왜 거기서…", "새가슴 인증", "중요할 때 꼭 이러더라", "괜찮아 다음에 잘하면 돼", "오늘은 잠 못 잘 듯"],
});
