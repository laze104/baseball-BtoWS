// =============================================
// injury.js : 시즌 중 부상 (4구간 시즌)
// 1. 전반기·후반기마다 부상 굴림: 부위 + 정도(경미/중간/큰) + 빠지는 날
// 2. 리그별 명단: KBO 부상자 명단(등록일수 30일까지 인정), MLB IL, NPB 1군 말소
// 3. 쉬는 기간이 다음 구간으로 넘어가면 재활 단계 고르기 (조기 복귀 / 단계별 / 완벽 회복)
// 4. 조기 복귀하면 재발 위험 ↑ / 시즌 끝까지 못 돌아오면 가을야구 진통제 투혼 고르기
// 아마추어·독립리그는 예전처럼 시즌 시작에 한 번 (extra.js rollInjury)
// =============================================

const HALF_DAYS = 93; // 시즌 186일의 반
const IL_CREDIT = 30; // KBO 부상자 명단: 1군 등록일수로 쳐주는 최대 일수

const INJ_GRADES = {
  minor: { label: "경미", days: [10, 20] },
  mid: { label: "중간", days: [25, 55] },
  major: { label: "큰 부상", days: [60, 140] },
};

// 부위별 진단명 (경미 / 중간 / 큰 부상)
const INJ_DIAG = {
  "햄스트링": ["햄스트링 뭉침", "햄스트링 미세 손상", "햄스트링 부분 파열"],
  "손목": ["손목 염좌", "손목 인대 손상", "유구골 골절"],
  "옆구리": ["옆구리 근육 뭉침", "내복사근 손상", "옆구리 근육 파열"],
  "발목": ["발목 염좌", "발목 인대 손상", "발목 인대 파열"],
  "허리": ["허리 통증", "허리 디스크 증세", "요추 염좌"],
  "어깨": ["어깨 뭉침", "어깨 염증", "회전근개 손상"],
  "무릎": ["무릎 타박", "무릎 염증", "무릎 연골 손상"],
  "손가락": ["손가락 타박", "손가락 인대 손상", "손가락 골절"],
  "팔꿈치": ["팔꿈치 뻐근함", "팔꿈치 염증", "팔꿈치 인대 손상"],
  "손가락 물집": ["손가락 물집", "손가락 물집 악화", "손톱 들림"],
};

function injDiag(part, grade) {
  const list = INJ_DIAG[part];
  const i = { minor: 0, mid: 1, major: 2 }[grade];
  return list ? list[i] : `${part} 부상`;
}

// 리그마다 명단 이름이 다름
function ilName(player, grade) {
  const lg = player.league;
  if (lg === "MLB") return grade === "major" ? "60일 부상자 명단(IL)" : player.type === "pitcher" ? "15일 부상자 명단(IL)" : "10일 부상자 명단(IL)";
  if (lg === "NPB") return "1군 등록 말소";
  if (lg === "KBO") return "부상자 명단";
  return "재활군";
}

function rehabSteps(league) {
  if (league === "MLB") return "재활 → 마이너 재활 경기 → 복귀";
  if (league === "NPB") return "재활 → 2군 실전 → 1군 재등록";
  if (league === "MILB") return "재활 → 루키리그 재활 경기 → 복귀";
  return "재활군 → 퓨처스 실전 → 1군 콜업";
}

function pickGrade(player, forced) {
  const glass = player.hidden && player.hidden.glass;
  const x = Math.random();
  if (forced) return x < 0.5 ? "mid" : "major";
  if (glass) return x < 0.3 ? "minor" : x < 0.67 ? "mid" : "major";
  return x < 0.5 ? "minor" : x < 0.82 ? "mid" : "major";
}

// 새 부상 하나 (onset: 이번 구간 며칠째에 다쳤는지)
function newInjury(player, ctx, half, part, grade, onset, again) {
  const r = ctx.report;
  const [a, b] = INJ_GRADES[grade].days;
  const days = randomInt(a, b);
  const inHalf = Math.min(HALF_DAYS - onset, days);
  const inj = { part, grade, diag: injDiag(part, grade), days, left: days - inHalf, half, il: ilName(player, grade), again: !!again };
  ctx.inj = inj;
  logInjury(player, part, grade === "major"); // body.js
  const glass = player.hidden && player.hidden.glass;
  r.events.push(grade === "major" ? "장기 부상" : "부상");
  const worst = r.injury;
  if (!worst || (grade === "major" && !worst.severe)) r.injury = { severe: grade === "major", glass, part, again: (player.injuryLog[part] || 0) >= 2 };
  const when = half === 0 ? `${[4, 5, 6][Math.min(2, Math.floor(onset / 31))]}월` : `${[7, 8, 9][Math.min(2, Math.floor(onset / 31))]}월`;
  const lead = again ? `${player.name}, ${part} 부상 재발… ` : `${player.name}, ${when} `;
  r.news.push(`${lead}${inj.diag} 진단… ${inj.il} 등재 (회복 ${days}일 예상)`);
  r.toasts.push({ icon: "🏥", text: `${inj.diag} · ${inj.il}` });
  if (again) r.specials.push({ key: "reinjury", part });
  if (grade === "major") {
    r.bigMoments = r.bigMoments || [];
    r.bigMoments.push({
      tone: "bad",
      kicker: when + " 부상",
      title: `🏥 ${inj.diag}`,
      lines: [`${inj.il} 등재`, `회복까지 ${days}일 예상`, glass ? "또 다쳤어요… 몸이 안 따라줘요" : "재활 계획은 구간이 끝나면 정해요"],
    });
  }
  return inHalf;
}

// 구간 시작 (flow.js beforeHalf): 넘어온 부상 + 새 부상 → 이번 구간에 빠지는 날
function halfInjury(player, ctx, half) {
  const r = ctx.report;
  let out = 0;
  const carry = ctx.inj && ctx.inj.left > 0 ? ctx.inj : null;
  if (carry) {
    out = Math.min(HALF_DAYS, carry.left);
    carry.left -= out;
    if (carry.left <= 0) {
      const rehab = carry.path === "steps" ? rehabGameLine(player) : "";
      r.news.push(`${player.name}, ${carry.diag} 털고 복귀${rehab ? ` (${rehab})` : ""}`);
      if (carry.recur && out < HALF_DAYS - 10) {
        // 조기 복귀했는데 또 다침
        out += newInjury(player, ctx, half, carry.part, "mid", Math.min(HALF_DAYS - 3, out + randomInt(5, 25)), true);
      }
    }
  }
  if (ctx.injChance && out < HALF_DAYS - 5) {
    const forced = half === 0 ? forcedInjury(player) : null; // 재활 재발·숨긴 통증 (body.js)
    const glass = player.hidden && player.hidden.glass;
    let chance = ctx.injChance * 0.65;
    if (glass) chance = chance * 2.4 + 0.04;
    if (forced || Math.random() < chance) {
      const part = forced || injuryPart(player);
      const onset = randomInt(out, HALF_DAYS - 3);
      out += newInjury(player, ctx, half, part, pickGrade(player, forced), onset, !!forced);
    }
  }
  ctx.injDays = (ctx.injDays || 0) + out;
  return out;
}

// 단계별 재활: 퓨처스(마이너) 실전 몇 경기
function rehabGameLine(player) {
  const g = randomInt(2, 4);
  const word = player.league === "MLB" ? "마이너 재활 경기" : player.league === "NPB" ? "2군 실전" : "퓨처스 실전";
  if (player.type === "pitcher") return `${word} ${g}경기 ${randomInt(3, 7)}이닝 ${randomInt(0, 3)}실점`;
  const ab = g * 3 + randomInt(0, 2);
  return `${word} ${g}경기 ${ab}타수 ${randomInt(1, Math.ceil(ab / 2))}안타`;
}

// 구간 끝 (flow.js halfBreak): 쉬는 기간이 다음으로 넘어가면 선택
function injuryBreak(player, ctx, half) {
  const inj = ctx.inj;
  if (!inj || inj.left <= 0 || inj.asked === half) return false;
  inj.asked = half;
  if (half === 0) {
    pushChoice(player, {
      key: "rehabPath",
      mailFrom: "트레이너실",
      mailSubject: `[재활 계획] ${inj.diag}`,
      text: `🩺 ${inj.diag}로 ${inj.il}에 올라 있어요. 후반기에도 ${inj.left}일쯤 더 쉬어야 한다는 소견이에요.<br>재활 순서는 보통 <b>${rehabSteps(player.league)}</b>예요. 어떻게 갈까요?`,
      options: [
        { id: "early", label: "빨리 돌아가겠다 (조기 복귀)", detail: `쉬는 날 ↓ (${Math.round(inj.left * 0.55)}일쯤) · 재발 위험 높음 · 복귀 직후 컨디션 -1` },
        { id: "steps", label: "단계 밟아서 복귀", detail: `${rehabSteps(player.league)} · 재발 위험 낮음` },
        { id: "full", label: "완벽하게 낫고 돌아가겠다", detail: `쉬는 날 ↑ (${Math.round(inj.left * 1.3)}일쯤) · 재발 거의 없음 · 복귀 후 컨디션 +1` },
      ],
    });
    return true;
  }
  // 정규시즌 끝까지 못 돌아옴
  const s = ctx.report.standing;
  if (s && s.seed) {
    pushChoice(player, {
      key: "psReturn",
      mailFrom: "구단 의료진",
      mailSubject: "가을야구 엔트리 관련",
      text: `🍂 팀이 ${s.psLabel || "포스트시즌"}에 나가요. 그런데 ${inj.diag}이 아직 ${inj.left}일쯤 더 쉬어야 한대요.<br>의료진: "주사 맞고 뛸 수는 있어요. 다만 더 나빠질 수도 있어요."`,
      options: [
        { id: "play", label: "진통제 맞고 가을야구 나간다", detail: "포스트시즌 출전 (컨디션 -2) · 부상 악화 위험 35%" },
        { id: "rest", label: "무리 안 한다. 내년을 준비", detail: "포스트시즌 엔트리 제외" },
      ],
    });
    return true;
  }
  ctx.report.news.push(`${player.name}, ${inj.diag}로 시즌 아웃… "내년 개막 맞춰 돌아오겠다"`);
  return false;
}

function resolveRehabPath(player, choice, option) {
  const ctx = player.cur;
  if (!ctx || !ctx.inj) return [];
  const inj = ctx.inj;
  const id = option.id;
  inj.path = id;
  inj.left = Math.max(5, Math.round(inj.left * { early: 0.55, steps: 1, full: 1.3 }[id]));
  inj.recur = Math.random() < { early: 0.35, steps: 0.1, full: 0.03 }[id];
  if (id === "early") ctx.partMod = (ctx.partMod || 0) - 1;
  if (id === "full") ctx.partMod = (ctx.partMod || 0) + 1;
  player.lastRehab = id;
  if (id === "early") return [`${player.name}, ${inj.diag} 조기 복귀 강행… "팀이 급하다"`];
  if (id === "full") return [`${player.name}, 서두르지 않는다… "완전히 낫고 돌아가겠다"`];
  return [`${player.name}, ${rehabSteps(player.league)} 순서로 재활 시작`];
}

function resolvePsReturn(player, choice, option) {
  const ctx = player.cur;
  const r = ctx ? ctx.report : player.lastReport;
  if (!r) return [];
  player.lastRehab = option.id === "play" ? "ps" : "rest";
  if (option.id === "rest") {
    r.noPostseason = true;
    r.events.push("가을야구 결장");
    return [`${player.name}, 포스트시즌 엔트리 제외… 부상 회복에 집중`];
  }
  r.psMod = -2;
  r.events.push("진통제 투혼");
  const inj = ctx && ctx.inj;
  if (inj && Math.random() < 0.35) {
    // 악화 → 시즌 끝나고 수술 얘기 나옴 (body.js maybeSurgeryChoice)
    r.injury = { severe: true, glass: false, part: inj.part, again: true };
    logInjury(player, inj.part, true);
    return [`${player.name}, 진통제 맞고 가을야구 출전… 그러나 ${inj.part} 상태 악화`];
  }
  return [`${player.name}, 진통제 투혼… "이 무대는 놓칠 수 없다"`];
}

// 시즌 끝 (finishPhased): 부상·2군 날짜로 1군 등록일수 계산
function seasonDays(player, ctx) {
  const r = ctx.report;
  const inj = Math.min(KBO_SEASON_DAYS, ctx.injDays || 0);
  const down = Math.min(KBO_SEASON_DAYS - inj, r.downDays || 0);
  r.injDays = inj;
  const played = KBO_SEASON_DAYS - inj - down;
  if (player.surgeryDone && player.surgeryDone.year === r.year) return; // 수술 시즌은 예전 계산
  ctx.gameFactor = round(ctx.gameFactor * (played / KBO_SEASON_DAYS), 2);
  if (r.league === "KBO") r.regDays = played + Math.min(IL_CREDIT, inj); // 부상자 명단은 30일까지 등록일수 인정
}

// 시즌 진행 화면에 지금 부상 상태
function injuryStatusHtml(ctx) {
  const inj = ctx.inj;
  if (!inj || inj.left <= 0) return "";
  return `<p class="inj-status">🏥 <b>${inj.diag}</b> · ${inj.il} · 복귀까지 ${inj.left}일쯤${inj.path ? ` · ${{ early: "조기 복귀", steps: "단계별 재활", full: "완벽 회복" }[inj.path]}` : ""}</p>`;
}

Object.assign(MAIL_SENDERS, {
  rehabPath: { from: "트레이너실", icon: "🩺", subject: "재활 계획" },
  psReturn: { from: "구단 의료진", icon: "🏥", subject: "가을야구 엔트리" },
});

Object.assign(FAN, {
  rehabEarly: ["빨리 오는 건 좋은데 또 다치면 ㅈ된다", "조기 복귀 불안하다 ㅠㅠ", "팀이 급하긴 하지", "무리하지 마라 진짜"],
  rehabSteps: ["천천히 와라 기다린다", "재활 잘해라", "퓨처스 경기 영상 올라오면 본다"],
  rehabFull: ["길게 보는 게 맞다", "완전히 낫고 와라", "이번엔 제대로 고치자", "후반기 기대한다"],
  psPlay: ["진통제 투혼 ㄷㄷ", "이게 프로지 눈물 난다", "무리하다 선수 생명 끝날까 무섭다", "가을에 미친놈 하나 나와라"],
  psRest: ["아쉽지만 몸이 먼저다", "내년에 건강하게 보자", "빈자리 크다 ㅠㅠ"],
});

function injuryPool(player) {
  return { early: FAN.rehabEarly, steps: FAN.rehabSteps, full: FAN.rehabFull, ps: FAN.psPlay, rest: FAN.psRest }[player.lastRehab];
}

ACHIEVEMENTS.push({
  id: "psPainkiller",
  group: "커리어",
  name: "진통제 투혼",
  desc: "부상을 안고 가을야구 출전",
  check: (p) => p.history.some((h) => (h.events || []).includes("진통제 투혼")),
});
