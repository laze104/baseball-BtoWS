// =============================================
// national.js : 국가대표 (U-18, 아시안게임, 프리미어12, WBC, 올림픽)
// 시즌이 끝나면 내년 대회 예비 명단 발표 → 참가할지 팀에 집중할지 선택
// =============================================

// 내년에 열리는 대회 중 이 선수가 뽑힐 수 있는 대회 찾기
function findNationalEvent(player) {
  if (player.nationalRetired) return null; // 국가대표 은퇴 선언
  const year = gameYear(player); // 이미 한 살 먹은 뒤라 "다음 시즌" 연도
  const ovr = getOvrs(player).best;
  for (const ev of NATIONAL_EVENTS) {
    if (!ev.years(year)) continue;
    if (ev.minAge && player.age < ev.minAge) continue;
    if (ev.maxAge && player.age > ev.maxAge) continue;
    if (ev.hsOnly) {
      if (player.league === "HS" && ovr >= 50) return ev;
      continue;
    }
    if (ev.id === "asian") {
      // 아시안게임은 국내 리그 선수 위주
      if (["KBO", "KBO2", "SANGMU"].includes(player.league) && ovr >= LEAGUES.KBO.level + 1) return ev;
      continue;
    }
    if (TOP_LEAGUES.includes(player.league) && ovr >= LEAGUES.KBO.level + 4) return ev;
  }
  return null;
}

function callNationalTeam(player, report) {
  if (player.retired || (player.pendingChoice && player.pendingChoice.key === "forcedRetire")) return;
  const ev = findNationalEvent(player);
  if (!ev) return;
  report.specials.push({ key: "nationalCall", event: ev.name });
  player.nationalPower = Math.random(); // 이번 대표팀 전력 (소집 때 정해서 미리 보여줌)
  const odds = NATIONAL_ODDS[ev.id];
  pushChoice(player, {
    key: "national",
    eventId: ev.id,
    eventName: ev.name,
    text:
      `${gameYear(player)} ${ev.name} 대표팀 예비 명단에 이름이 올랐어요! 태극마크를 달까요, 소속팀에 집중할까요?` +
      `<br><span class="small">대표팀 전력 평가: <b>${teamPowerLabel(player.nationalPower)}</b> · ${odds ? odds.note : ""}</span>`,
    options: [
      { id: "join", label: "태극마크 단다", detail: "메달 도전, 명성 UP / 시즌 피로(-2)와 부상 위험" },
      { id: "skip", label: "소속팀에 집중", detail: "시즌 컨디션 +2 / 일부 팬은 아쉬워해요" },
      ...(canRetireNational(player) ? [{ id: "nretire", label: "국가대표 은퇴 선언", detail: "앞으로 대표팀에 뽑히지 않아요 · 팬들은 박수를 보내요" }] : []),
    ],
  });
}

// 대회 결과
function playNationalEvent(player, report) {
  const ev = NATIONAL_EVENTS.find((e) => e.id === player.nationalPlan);
  const ovr = getOvrs(player).best;
  const level = ev.hsOnly ? 45 : LEAGUES.KBO.level;
  const nat = nationalStats(player, ev, report); // 대회 기록 (extra.js)
  const result = nationalResult(player, ev, ovr - level, nat.bonus);
  const odds = NATIONAL_ODDS[ev.id];
  const podium = odds.podium.includes(result);

  player.awards["국가대표"] = (player.awards["국가대표"] || 0) + 1;
  report.events.push(`${ev.name} 출전`);
  report.national = { name: ev.name, result };
  nat.rec.result = result;
  player.nationalHistory = player.nationalHistory || [];
  player.nationalHistory.push(nat.rec);
  if (podium) {
    const name = `${ev.name} ${result}`;
    player.awards[name] = (player.awards[name] || 0) + 1;
    report.awards.push(name);
    report.specials.push({ key: "medal", award: name });
    // 아시안게임 금메달, 올림픽 메달은 병역 특례
    if ((ev.id === "asian" && result === "금메달") || ev.id === "olympic") grantExemption(player, report, name);
  } else {
    report.specials.push({ key: "nationalFail", event: ev.name, result });
  }
  player.nationalPower = null;
  // 큰 무대 경험: 멘탈과 클러치가 조금 오름
  for (const key of ["mental", "clutch"]) {
    if (player.stats[key] !== undefined) player.stats[key] = clamp(player.stats[key] + 1, 1, 99);
  }
}

// ---------------------------------------------
// 대회별 현실 난이도
// 실제 한국 성적 참고: WBC 최고 준우승(09), 13·17·23 1라운드 탈락 / 프리미어12 15 우승·19 준우승·24 조별 탈락
// 올림픽 08 금·20 4위 / 아시안게임은 거의 매번 금 / U-18은 메달 자주, 우승은 가끔
// 표는 좋은 결과부터, 숫자 = 평균 전력·평균 기여일 때 확률
// ---------------------------------------------
const NATIONAL_ODDS = {
  u18: {
    podium: ["금메달", "은메달", "동메달"],
    note: "메달은 자주 따지만 우승은 쉽지 않아요",
    table: [
      ["금메달", 0.15],
      ["은메달", 0.22],
      ["동메달", 0.2],
      ["슈퍼라운드 탈락", 0.23],
      ["예선 탈락", 0.2],
    ],
  },
  asian: {
    podium: ["금메달", "은메달", "동메달"],
    note: "금메달이 당연하다는 분위기라 부담이 커요",
    table: [
      ["금메달", 0.72],
      ["은메달", 0.16],
      ["동메달", 0.09],
      ["노메달", 0.03],
    ],
  },
  premier: {
    podium: ["금메달", "은메달", "동메달"],
    note: "일본·대만·미국이 강해서 메달도 장담 못 해요",
    table: [
      ["금메달", 0.1],
      ["은메달", 0.15],
      ["동메달", 0.15],
      ["슈퍼라운드 탈락", 0.25],
      ["예선 탈락", 0.35],
    ],
  },
  wbc: {
    podium: ["우승", "준우승", "4강"],
    note: "메이저리거가 총출동하는 무대라 1라운드 통과도 어려워요",
    table: [
      ["우승", 0.04],
      ["준우승", 0.06],
      ["4강", 0.12],
      ["8강 탈락", 0.28],
      ["1라운드 탈락", 0.5],
    ],
  },
  olympic: {
    podium: ["금메달", "은메달", "동메달"],
    note: "메달 따면 병역 특례, 하지만 일본·미국 벽이 높아요",
    table: [
      ["금메달", 0.12],
      ["은메달", 0.13],
      ["동메달", 0.18],
      ["4위", 0.17],
      ["예선 탈락", 0.4],
    ],
  },
};

// 전력 평가 문구 (소집 팝업에 뜸)
function teamPowerLabel(power) {
  if (power >= 0.85) return "역대급 드림팀";
  if (power >= 0.6) return "우승 후보";
  if (power >= 0.3) return "무난한 전력";
  return "세대교체 중 · 약체 평가";
}

// 결과 = 대표팀 전력 + 내 기여 (한 명이 바꿀 수 있는 건 일부뿐)
// gap: 내 능력치 - 기준선, bonus: 대회 기록 보너스 (-3~4)
function nationalResult(player, ev, gap, bonus) {
  const odds = NATIONAL_ODDS[ev.id];
  const power = player.nationalPower != null ? player.nationalPower : Math.random(); // 옛 저장은 여기서 굴림
  const mine = clamp((gap - 10) * 0.002 + bonus * 0.008, -0.04, 0.05); // 뽑힌 선수 평균 gap ≈ 10, 슈퍼스타도 +5%p까지만
  const q = clamp(power + mine, 0, 0.999);
  // 나쁜 결과부터 누적해서 q가 어디 떨어지는지 봄
  let cum = 0;
  for (const [result, p] of odds.table.slice().reverse()) {
    cum += p;
    if (q < cum) return result;
  }
  return odds.table[0][0];
}
