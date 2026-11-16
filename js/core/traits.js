// =============================================
// traits.js : 숨은 특성 (화면에는 절대 안 보여줌)
// 늦깎이·해외 체질·유리몸·계절 체질. 선수를 만들 때 정해짐 (player.js initHidden, initTraits)
// =============================================

const SEASON_TRAITS = {
  spring: { months: [3, 4, 5], nick: "봄의 사나이", label: "시즌 초반" },
  summer: { months: [6, 7, 8], nick: "여름 사나이", label: "한여름" },
  fall: { months: [9, 10], nick: "가을 사나이", label: "시즌 막판" },
};

// 계절 특성은 컨디션 +1 (그 시기에 몰아서 잘함)
function seasonTraitMod(player) {
  return player.hidden && player.hidden.season && !isAmateur(player.league) ? 1 : 0;
}

// 시즌 시작 전 컨디션 보정
function hiddenMod(player, report) {
  let mod = 0;
  const h = player.hidden || {};
  // 해외 체질: NPB·MLB·마이너에서 실력 이상으로 통함 (류현진, 이정후처럼)
  if (h.overseas && ["NPB", "MLB", "MILB"].includes(player.league)) mod += 6;
  // 회춘 기간
  if (player.revival > 0) {
    mod += 4;
    player.revival--;
    report.events.push("제2의 전성기");
  }
  return mod;
}

// 시즌 뒤: 늦게 꽃피는 선수는 30대에 갑자기 각성함 (노경은처럼)
function maybeRevival(player, report) {
  if (player.revivalUsed || player.age < 31 || player.age > 38 || isAmateur(player.league)) return;
  const h = player.hidden || {};
  const chance = h.lateBloom ? 0.3 : 0.004;
  if (Math.random() >= chance) return;
  player.revivalUsed = true;
  player.revival = 3;
  const keys = Object.keys(player.stats);
  for (const key of keys) player.stats[key] = clamp(player.stats[key] + randomInt(3, 7), 1, 99);
  report.events.push("회춘");
  report.specials.push({ key: "revival" });
  report.bigMoments = report.bigMoments || [];
  report.bigMoments.push({
    tone: "gold",
    kicker: "믿을 수 없는 일",
    title: "🔥 회춘!",
    lines: [`${koreanAge(player.age)}세에 찾아온 제2의 전성기`, "모든 능력치가 크게 올랐어요"],
  });
}

// 회춘 기간과 셰프는 노화를 늦춤
function adjustGrowthBase(player, base) {
  if (player.revival > 0 && base < 0.3) return 0.3;
  if (hasItem(player, "chef") && base < 0) return base * 0.75;
  return base;
}

// ---------------------------------------------
// 기사·댓글 문구
// ---------------------------------------------

Object.assign(NEWS.special, {
  revival: "{name}, 나이를 거꾸로 먹나… 제2의 전성기 활짝",
});

Object.assign(FAN, {
  revival: [
    "회춘 ㄷㄷ 이게 되네",
    "나이는 숫자에 불과하다는 걸 증명함",
    "작년이랑 다른 사람 아님?",
    "은퇴하라던 사람들 다 어디 감",
    "이 나이에 커리어하이 실화냐",
  ],
});
