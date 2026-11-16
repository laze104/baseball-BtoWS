// =============================================
// position.js : 포지션 변경
// =============================================

// - 훈련 탭에서 비시즌마다 1번 직접 바꿀 수 있음
// - 나이·팀 사정에 따라 감독이 먼저 제안하기도 함
const DH = "지명타자";
POSITION_FOCUS[DH] = ["contact", "power"];
const HARD_POSITIONS = ["포수", "유격수"]; // 수비 55 이상만 갈 수 있음

// 이 선수가 갈 수 있는 포지션 목록
function positionOptions(player) {
  if (player.type === "batter") return [...POSITIONS.batter, DH];
  if (player.type === "pitcher") return POSITIONS.pitcher;
  return POSITIONS.twoway;
}

// 포지션을 바꾸면 OVR이 얼마가 될지
function ovrAt(player, position) {
  return getOvrs({ ...player, position }).best;
}

// 바꿀 수 없는 이유 (없으면 "")
function positionBlock(player, position) {
  if (position === player.position) return "지금 포지션";
  if (player.positionChangedAt === player.season) return "이번 비시즌엔 이미 바꿨어요";
  if (HARD_POSITIONS.includes(position) && (player.stats.defense || 0) < 55) return "수비 55 이상 필요";
  return "";
}

function changePosition(player, position, byTeam) {
  const from = player.position;
  player.position = position;
  player.positionChangedAt = player.season;
  // 지명타자가 아닌 새 수비 위치는 한 시즌 적응 기간 (팀이 부탁한 경우는 지원을 받아 괜찮음)
  player.positionAdjust = position !== DH && !byTeam;
  return fillText(NEWS.special.position, player, { from, to: position });
}

// 감독·코치의 포지션 제안 (시즌 뒤 가끔)
function maybePositionOffer(player, report) {
  if (player.retired || isAmateur(player.league) || isServing(player) || player.type === "twoway") return;
  const pending = [player.pendingChoice, ...player.choiceQueue].filter(Boolean);
  if (pending.some((c) => c.key === "forcedRetire" || c.key === "position")) return;
  const ovr = getOvrs(player).best;
  let offer = null;

  if (player.type === "batter") {
    const glove = (player.stats.defense + player.stats.arm) / 2;
    if (player.position !== DH && player.age >= 32 && (glove < 55 || Math.random() < 0.35)) {
      offer = {
        to: DH,
        text: `${koreanAge(player.age)}세, 수비 범위가 예전 같지 않아요. 감독이 지명타자 전향을 제안해요. (지명타자는 수비 능력치가 OVR에서 빠지지만 WAR 보정이 낮아요)`,
      };
    } else if (player.position !== DH && Math.random() < 0.08) {
      const choices = POSITIONS.batter.filter((p) => p !== player.position && !(HARD_POSITIONS.includes(p) && player.stats.defense < 55));
      const to = pick(choices);
      offer = { to, byTeam: true, text: `팀 주전 ${to}가 부상과 이적으로 빠졌어요. 감독이 "네가 ${to}를 맡아줄 수 있겠나?"라고 묻네요.` };
    }
  } else if (player.type === "pitcher") {
    const stamina = player.stats.stamina;
    if (player.position === "선발" && (player.age >= 33 || stamina < 45) && Math.random() < 0.5) {
      offer = { to: "불펜", text: "체력이 예전 같지 않아요. 코치진이 불펜(필승조·마무리) 전환을 제안해요." };
    } else if (player.position === "불펜" && stamina >= 60 && ovr >= LEAGUES[player.league].level && Math.random() < 0.3) {
      offer = { to: "선발", byTeam: true, text: "선발 로테이션에 구멍이 났어요. 감독이 선발 전환을 부탁해요." };
    }
  }
  if (!offer) return;
  const now = getOvrs(player).best;
  const next = ovrAt(player, offer.to);
  pushChoice(player, {
    key: "position",
    to: offer.to,
    byTeam: !!offer.byTeam,
    text: offer.text,
    options: [
      { id: "accept", label: `${offer.to}(으)로 바꾼다`, detail: `OVR ${now} → ${next}${offer.byTeam ? " · 감독 신뢰 UP" : ""}` },
      { id: "decline", label: `${player.position} 그대로`, detail: offer.byTeam ? "팀 사정 외면… 여론 조금 ↓" : "지금 자리에서 버텨본다" },
    ],
  });
}

function resolvePositionChoice(player, choice, option) {
  if (option.id === "decline") {
    if (choice.byTeam) changeFame(player, -3);
    return [`${player.name}, 포지션 변경 제안 고사 "지금 자리에서 증명하겠다"`];
  }
  const line = changePosition(player, choice.to, choice.byTeam);
  if (choice.byTeam) {
    changeFame(player, 5);
    player.nextMod = (player.nextMod || 0) + 1;
  }
  // 이번 비시즌에 또 바꿀 수 있도록 (제안은 별개)
  player.positionChangedAt = null;
  return [line];
}
