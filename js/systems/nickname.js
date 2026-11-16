// =============================================
// nickname.js : 별명 (커뮤니티가 붙여줌)
// 별명 규칙은 data/events.js NICKNAME_RULES
// =============================================

function updateNickname(player, report) {
  const index = NICKNAME_RULES.findIndex((rule) => rule.when(player, report));
  if (index < 0) return;
  const nick = fillText(NICKNAME_RULES[index].nick, player, {});
  if (nick === player.nickname) return;
  // 이미 별명이 있으면 더 강한(위쪽) 별명이거나 반반 확률로만 바뀜
  const current = NICKNAME_RULES.findIndex((rule) => fillText(rule.nick, player, {}) === player.nickname);
  if (player.nickname && current >= 0 && index > current && Math.random() < 0.5) return;
  player.nickname = nick;
  player.nicknames = [...new Set([...(player.nicknames || []), nick])];
  report.specials.push({ key: "nickname", nick });
}

// 조건 없이 바로 별명 붙이기 (역사적 시즌 등에서 부름)
function giveNickname(player, report, nick) {
  if (player.nickname === nick) return;
  player.nickname = nick;
  player.nicknames = [...new Set([...(player.nicknames || []), nick])];
  report.specials.push({ key: "nickname", nick });
}

// ---------------------------------------------
// 기사 문구
// ---------------------------------------------

Object.assign(NEWS.special, {
  nickname: "팬들이 붙여준 별명 '{nick}'… {name}의 반응은?",
});
