// =============================================
// franchise.js : 프랜차이즈 스타
// =============================================

// 한 팀에서 6시즌 이상 + 그 팀에서 WAR 12 이상 → 프랜차이즈 스타
// 원소속팀이 FA 때 훨씬 많이 주고, 연봉 협상도 유리함

// 지금 팀에서 연속으로 뛴 시즌 수와 WAR (군 복무는 건너뜀)
function teamTenure(player, team) {
  let seasons = 0;
  let war = 0;
  for (let i = player.history.length - 1; i >= 0; i--) {
    const h = player.history[i];
    if (SERVICE_LEAGUES.includes(h.league)) continue;
    if (h.team !== team) break;
    seasons++;
    war += h.WAR;
  }
  return { seasons, war: round(war, 1) };
}

function isFranchiseHere(player) {
  return !!player.franchise && player.franchise === player.team;
}

function checkFranchise(player, report) {
  if (!PRO_LEAGUES.includes(player.league) || isFranchiseHere(player)) return;
  const t = teamTenure(player, player.team);
  if (t.seasons >= 6 && t.war >= 12) {
    player.franchise = player.team;
    changeFame(player, 10);
    report.specials.push({ key: "franchise" });
  }
}

// FA 계약 직후: 프랜차이즈 스타의 이적·복귀 반응
function franchiseMoveNews(player, oldTeam) {
  if (!player.franchise) return null;
  if (oldTeam === player.franchise && player.team !== oldTeam && player.league === "KBO") {
    changeFame(player, -15);
    return { line: fillText(NEWS.special.franchiseLeave, player, { team: oldTeam }), pool: FAN.franchiseLeave };
  }
  if (player.team === player.franchise && oldTeam !== player.team) {
    changeFame(player, 10);
    return { line: fillText(NEWS.special.homecoming, player, {}), pool: FAN.homecoming };
  }
  return null;
}

// 은퇴할 때: 프랜차이즈 스타는 영구결번
function retireStory(player) {
  if (!player.franchise) return null;
  const war = player.history.filter((h) => h.team === player.franchise).reduce((s, h) => s + h.WAR, 0);
  if (war < 25) return null;
  const award = `영구결번 (${player.franchise})`;
  player.awards[award] = 1;
  return fillText(NEWS.special.retiredNumber, player, { team: player.franchise });
}

// ---------------------------------------------
// 기사·댓글 문구
// ---------------------------------------------

Object.assign(NEWS.special, {
  franchise: "{name}, 이제는 {team}의 얼굴… 명실상부 프랜차이즈 스타",
  franchiseLeave: "{team}의 심장이 떠났다… 프랜차이즈 스타 {name} 이적 충격",
  homecoming: "돌아온 프랜차이즈 스타! {name}, 친정 {team} 복귀",
  retiredNumber: "{team}, {name}의 등번호 {num}번 영구결번 결정",
  position: "{name}, {from}에서 {to}(으)로 포지션 변경",
});

Object.assign(FAN, {
  franchise: ["이 팀은 {name} 없으면 안 됨", "평생 우리 팀에 있어라", "유니폼 마킹은 무조건 {name}", "구단은 얘 잡는 데 돈 아끼지 마라"],
  franchiseLeave: ["배신감 든다 진짜", "유니폼 버려야 하나…", "돈 따라 갔네", "그래도 고마웠다… 근데 서운하다"],
  homecoming: ["돌아와줘서 고맙다 ㅠㅠ", "역시 여기가 집이지", "친정 복귀 미쳤다"],
  position: ["포지션 바꾼 거 신의 한 수 될 듯", "새 포지션 적응 잘하길", "이 결정은 좀 걱정된다", "감독 판단 믿어본다"],
  dh: ["이제 방망이에만 집중하자", "수비 부담 덜었으니 홈런 기대함", "지명타자도 잘하면 레전드지"],
});
