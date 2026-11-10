// =============================================
// body.js : 몸의 이야기 + 코치 새 구종
// 1. 부상 부위 기록: 다쳤던 부위는 또 다칠 확률 높음
// 2. 큰 부상이면 수술(1년 쉬고 완치) vs 재활(빨리 복귀, 35% 재발)
// 3. 30대 중반 스타일 변신 (파이어볼러 → 기교파, 거포 → 교타자)
// 4. 투수 ↔ 타자 전향 (어릴 때 막혔으면)
// 5. 투수코치가 새 구종 알려줌
// =============================================

const INJURY_PARTS = {
  bat: ["햄스트링", "손목", "옆구리", "발목", "허리", "어깨", "무릎", "손가락"],
  pit: ["팔꿈치", "어깨", "옆구리", "허리", "햄스트링", "손가락 물집", "무릎"],
};
// 큰 부상일 때 수술 얘기가 나오는 부위 (팔꿈치 = 토미존)
const SURGERY_PARTS = {
  "팔꿈치": "팔꿈치 인대 접합 수술(토미존)",
  "어깨": "어깨 관절와순 수술",
  "무릎": "무릎 연골 수술",
  "손목": "손목 인대 수술",
  "발목": "발목 인대 수술",
  "햄스트링": "햄스트링 힘줄 봉합 수술",
};

const bodySide = (player) => (player.type === "batter" ? "bat" : player.type === "pitcher" ? "pit" : pick(["bat", "pit"]));

// 부위 고르기: 예전에 다친 부위는 다친 횟수만큼 가중치 +2
function injuryPart(player) {
  const log = player.injuryLog || {};
  const list = INJURY_PARTS[bodySide(player)].map((p) => ({ m: p, w: 1 + (log[p] || 0) * 2 }));
  return weightedPick(list);
}

function logInjury(player, part, severe) {
  if (!player.injuryLog) player.injuryLog = {};
  player.injuryLog[part] = (player.injuryLog[part] || 0) + 1;
  if (!player.injuries) player.injuries = [];
  player.injuries.push({ year: gameYear(player), part, severe });
  if (player.injuries.length > 30) player.injuries.shift();
}

// 추가 부상 위험: 숨긴 통증, 재활 복귀, 나이
function bodyRisk(player) {
  let r = 0;
  if (player.painRisk) r += 0.15;
  if (player.age >= 34) r += 0.02;
  return r;
}

// 재활 선택 뒤 재발이 정해져 있으면 그 부위로 강제 부상 (한 번만)
function forcedInjury(player) {
  if (player.rehab && player.rehab.recur && !player.rehab.done) {
    player.rehab.done = true;
    return player.rehab.part;
  }
  if (player.painRisk && Math.random() < 0.5) {
    const part = player.painRisk;
    player.painRisk = null;
    return part;
  }
  player.painRisk = null;
  return null;
}

// 수술한 다음 시즌: 거의 통째로 쉼
function surgerySeason(player, report) {
  const s = player.surgeryOut;
  player.surgeryOut = null;
  player.surgeryDone = { part: s.part, year: report.year };
  if (player.injuryLog && player.injuryLog[s.part]) player.injuryLog[s.part] = Math.max(0, player.injuryLog[s.part] - 2); // 완치
  report.events.push("수술 재활");
  report.specials.push({ key: "surgeryYear", part: s.part });
  report.injury = { severe: true, glass: false, part: s.part, surgery: true };
  // 토미존 뒤 구속이 오르는 경우도 있음
  if (s.part === "팔꿈치" && player.stats.velocity !== undefined && Math.random() < 0.3) {
    player.stats.velocity = clamp(player.stats.velocity + 2, 1, 99);
    report.specials.push({ key: "tjVelo" });
  }
  return 0.06;
}

// 큰 부상 뒤 수술 여부 (시즌 끝나고)
function maybeSurgeryChoice(player, report) {
  const inj = report.injury;
  if (!inj || !inj.severe || inj.surgery || player.retired || isAmateur(report.league)) return;
  if (!SURGERY_PARTS[inj.part] || player.age >= 38) return;
  const op = SURGERY_PARTS[inj.part];
  pushChoice(player, {
    key: "surgery",
    part: inj.part,
    text: `🏥 정밀 검진 결과 <b>${inj.part}</b> 손상이 생각보다 커요. 의료진 소견:<br>"${op}을 받으면 내년은 통째로 쉬지만 깨끗하게 고칠 수 있어요. 재활로 버티면 빨리 돌아오지만 다시 다칠 수 있어요."`,
    options: [
      { id: "surgery", label: `수술 받는다`, detail: "다음 시즌 거의 통째로 결장 · 완치" },
      { id: "rehab", label: "재활로 버틴다", detail: "다음 시즌 바로 복귀 · 같은 부위 재발 위험 35%" },
    ],
  });
}

function resolveSurgery(player, choice, option) {
  if (option.id === "surgery") {
    player.surgeryOut = { part: choice.part };
    player.rehab = null;
    return [`${player.name}, ${SURGERY_PARTS[choice.part]} 결정… "1년 쉬더라도 제대로 고치겠다"`];
  }
  player.rehab = { part: choice.part, recur: Math.random() < 0.35, done: false };
  player.nextMod = (player.nextMod || 0) - 1;
  return [`${player.name}, 수술 대신 재활 택했다… 개막전 복귀 목표`];
}

// 수술 복귀 시즌에 WAR 3 넘기면 '수술 극복'
function surgeryComeback(player, report) {
  const d = player.surgeryDone;
  if (!d || d.back || report.year <= d.year) return;
  d.back = true;
  if (report.WAR >= 3) {
    player.surgeryComeback = true;
    report.news.push(`${player.name}, ${d.part} 수술 이겨내고 완벽 부활! WAR ${report.WAR}`);
  }
}

// ---------------------------------------------
// 3. 스타일 변신 (33세 이상, 한 번만)
// ---------------------------------------------
const STYLE_SHIFTS = {
  "파이어볼러": {
    to: "기교파",
    stat: "velocity",
    text: "구속이 예전 같지 않아요. 투수코치가 '이제 힘 말고 머리로 던지자'고 해요.",
    plus: { breaking: 3, control: 2 },
    minus: { velocity: 1 },
  },
  "거포": {
    to: "교타자",
    stat: "power",
    text: "타구 비거리가 줄었어요. 타격코치가 '짧게 잡고 맞히는 쪽으로 가 보자'고 해요.",
    plus: { contact: 3, eye: 2 },
    minus: { power: 1 },
  },
  "호타준족": {
    to: "교타자",
    stat: "speed",
    text: "다리가 예전 같지 않아요. 코치진이 '뛰는 야구 말고 출루로 먹고살자'고 해요.",
    plus: { contact: 2, eye: 3 },
    minus: { speed: 1 },
  },
};

function maybeStyleChange(player, report) {
  const s = STYLE_SHIFTS[player.style];
  if (!s || player.styleShifted || player.retired || player.age < 33 || isAmateur(player.league) || player.type === "twoway") return;
  const drop = report.gains && report.gains[s.stat] < 0;
  if (!drop && Math.random() >= 0.15) return;
  if ([player.pendingChoice, ...player.choiceQueue].some((c) => c && c.key === "styleChange")) return;
  pushChoice(player, {
    key: "styleChange",
    to: s.to,
    text: `🔧 ${koreanAge(player.age)}세. ${s.text}`,
    options: [
      {
        id: "change",
        label: `${s.to}(으)로 변신한다`,
        detail:
          Object.entries(s.plus)
            .map(([k, v]) => `${statLabel(k)} +${v}`)
            .join(", ") +
          " · " +
          Object.entries(s.minus)
            .map(([k, v]) => `${statLabel(k)} -${v}`)
            .join(", "),
      },
      { id: "keep", label: "내 스타일 끝까지 간다", detail: "자존심 · 팬 여론 +1" },
    ],
  });
}

function statLabel(key) {
  return BATTER_STATS[key] || PITCHER_STATS[key] || key;
}

function resolveStyleChange(player, choice, option) {
  if (option.id === "keep") {
    player.styleShifted = "keep";
    changeFame(player, 1);
    return [`${player.name}, "내 야구는 안 바꾼다" 정면 돌파`];
  }
  const s = STYLE_SHIFTS[player.style];
  const from = player.style;
  for (const [k, v] of Object.entries(s.plus)) if (player.stats[k] !== undefined) player.stats[k] = clamp(player.stats[k] + v, 1, 99);
  for (const [k, v] of Object.entries(s.minus)) if (player.stats[k] !== undefined) player.stats[k] = clamp(player.stats[k] - v, 1, 99);
  player.style = s.to;
  player.styleShifted = from;
  return [`${player.name}, ${from}에서 ${s.to}로 변신… "살아남으려면 바꿔야 했다"`];
}

// ---------------------------------------------
// 4. 투수 ↔ 타자 전향 (26세 이하, 2시즌 연속 막힘, 한 번만)
// ---------------------------------------------
function maybeConversion(player, report) {
  if (player.converted || player.retired || player.type === "twoway" || player.age > 26) return;
  if (!["KBO", "KBO2"].includes(player.league)) return;
  const last2 = player.history.slice(-2);
  // 막힘 = 2시즌 연속 2군이거나 1군에서 WAR 0.5 미만
  if (last2.length < 2 || last2.some((h) => !(h.league === "KBO2" || (h.league === "KBO" && h.WAR < 0.5)))) return;
  if (getOvrs(player).best >= LEAGUES.KBO.level + 2 || Math.random() >= 0.25) return;
  const toBat = player.type === "pitcher";
  pushChoice(player, {
    key: "convert",
    to: toBat ? "batter" : "pitcher",
    text: toBat
      ? `🔄 감독실 호출. "투수로는 솔직히 한계가 보여. 고교 때 방망이도 곧잘 쳤다며? <b>타자로 전향</b>해 볼래? 처음부터 다시 시작하는 거다."`
      : `🔄 감독실 호출. "어깨는 진짜 좋은데 방망이가 안 따라와. <b>투수로 전향</b>해 볼래? 강견이면 불펜에서 통할 수도 있다."`,
    options: [
      { id: "convert", label: toBat ? "타자로 전향한다" : "투수로 전향한다", detail: "능력치 새로 계산 · 첫 시즌 적응 -2 · 인생 역전 가능" },
      { id: "stay", label: "지금 자리에서 버틴다", detail: "다음 시즌 각오 +1" },
    ],
  });
}

function resolveConversion(player, choice, option) {
  if (option.id === "stay") {
    player.converted = { refused: true };
    player.nextMod = (player.nextMod || 0) + 1;
    return [`${player.name}, 전향 제안 고사… "여기서 승부 보겠다"`];
  }
  const s = player.stats;
  const r = () => randomInt(-3, 3);
  // 원래 능력치 평균 근처에서 시작. 숨은 재능(apt)이 크면 인생 역전 가능
  const vals = Object.values(s);
  const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
  const apt = randomInt(-4, 6);
  const c = (v) => clamp(Math.round(mean + (v - mean) * 0.5 + apt), 25, 80);
  let stats;
  if (choice.to === "batter") {
    stats = {
      contact: c((s.control + s.mental) / 2 - 6 + r()),
      power: c((s.stuff + s.velocity) / 2 - 6 + r()),
      eye: c(s.control - 8 + r()),
      speed: c(s.stamina - 4 + r()),
      defense: c(s.fielding + r()),
      arm: c(s.velocity + r()),
      clutch: c(s.mental + r()),
    };
    player.position = pick(["외야수", "1루수", "3루수"]);
    player.style = "거포";
    player.arsenal = null;
  } else {
    stats = {
      velocity: c(s.arm + 2 + r()),
      control: c(s.eye - 8 + r()),
      breaking: c(s.contact - 8 + r()),
      stamina: c(s.speed - 6 + r()),
      mental: c(s.clutch + r()),
      fielding: c(s.defense + r()),
      stuff: c(s.power - 4 + r()),
    };
    player.position = "불펜";
    player.style = "파이어볼러";
    player.arsenal = null;
  }
  const from = player.type;
  player.type = choice.to;
  player.stats = stats;
  if (choice.to === "pitcher") initArsenal(player);
  player.lastFocus = null;
  player.lineup = null;
  player.role = null;
  player.starterPromise = false;
  player.converted = { from, year: gameYear(player) };
  player.nextMod = (player.nextMod || 0) - 2;
  return [`${player.name}, ${from === "pitcher" ? "마운드 내려와 타석으로" : "방망이 내려놓고 마운드로"}… 야구 인생 건 전향`];
}

// ---------------------------------------------
// 5. 투수코치가 새 구종
// ---------------------------------------------
function maybeCoachPitch(player, report) {
  if (player.retired || isAmateur(player.league) || !report.pit || player.type === "batter") return;
  initArsenal(player);
  const list = player.arsenal || [];
  if (list.length >= 5 || Math.random() >= 0.12) return;
  const cand = Object.keys(PITCH_KINDS).filter((p) => !list.includes(p));
  if (!cand.length) return;
  const pitch = pick(cand);
  const coach = fakeName("KBO");
  pushChoice(player, {
    key: "coachPitch",
    pitch,
    text: `🎯 ${coach} 투수코치가 불펜에서 그립 하나를 보여줬어요.<br>"<b>${pitch}</b> 한번 배워 볼래? 손에 맞으면 무기 된다. 대신 캠프 내내 이것만 던져야 해."`,
    options: [
      { id: "learn", label: `${pitch} 배운다`, detail: "구종 추가 · 변화 +2, 구위 +1 · 다음 시즌 적응 -1" },
      { id: "refine", label: "지금 구종부터 다듬는다", detail: "변화 +1" },
    ],
  });
}

function resolveCoachPitch(player, choice, option) {
  const s = player.stats;
  if (option.id === "learn") {
    player.arsenal = [...(player.arsenal || ["포심"]), choice.pitch];
    if (s.breaking !== undefined) s.breaking = clamp(s.breaking + 2, 1, 99);
    if (s.stuff !== undefined) s.stuff = clamp(s.stuff + 1, 1, 99);
    player.nextMod = (player.nextMod || 0) - 1;
    player.learnedPitches = (player.learnedPitches || 0) + 1;
    return [`${player.name}, 비시즌 신무기 ${choice.pitch} 장착… "코치님이 손에 쥐여 준 공"`];
  }
  if (s.breaking !== undefined) s.breaking = clamp(s.breaking + 1, 1, 99);
  return [`${player.name}, "새 공보다 내 공부터" 기존 구종 완성도 높인다`];
}
