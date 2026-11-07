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
  if (player.retired || player.pendingChoice && player.pendingChoice.key === "forcedRetire") return;
  const ev = findNationalEvent(player);
  if (!ev) return;
  report.specials.push({ key: "nationalCall", event: ev.name });
  pushChoice(player, {
    key: "national",
    eventId: ev.id,
    eventName: ev.name,
    text: `${gameYear(player)} ${ev.name} 대표팀 예비 명단에 이름이 올랐어요! 태극마크를 달까요, 소속팀에 집중할까요?`,
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
  const score = ovr - level + randomInt(-10, 10);
  let result;
  if (score >= 14) result = "금메달";
  else if (score >= 9) result = "은메달";
  else if (score >= 5) result = "동메달";
  else result = "예선 탈락";

  player.awards["국가대표"] = (player.awards["국가대표"] || 0) + 1;
  report.events.push(`${ev.name} 출전`);
  report.national = { name: ev.name, result };
  if (result !== "예선 탈락") {
    const name = `${ev.name} ${result}`;
    player.awards[name] = (player.awards[name] || 0) + 1;
    report.awards.push(name);
    report.specials.push({ key: "medal", award: name });
    // 아시안게임 금메달, 올림픽 메달은 병역 특례
    if ((ev.id === "asian" && result === "금메달") || ev.id === "olympic") grantExemption(player, report, name);
  } else {
    report.specials.push({ key: "nationalFail", event: ev.name });
  }
  // 큰 무대 경험: 멘탈과 클러치가 조금 오름
  for (const key of ["mental", "clutch"]) {
    if (player.stats[key] !== undefined) player.stats[key] = clamp(player.stats[key] + 1, 1, 99);
  }
}
