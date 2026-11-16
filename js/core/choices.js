// =============================================
// choices.js : 선택지(메일) 대기열
// 지금 보여줄 선택지는 player.pendingChoice, 그다음은 player.choiceQueue 에 쌓임
// 고른 뒤 처리는 career.js resolveChoice
// =============================================

// 선택지가 여러 개 생기면 줄 세워서 하나씩 보여줌
// 메일 폭탄 방지: 꼭 필요한 메일(드래프트·FA·병역·결정적 순간 등)은 다 오고,
// 곁가지 메일은 한 번에 MAIL_CAP 통까지만. 넘치면 중요도 낮은 것부터 안 옴 (숫자 클수록 중요)
const MAIL_PRIORITY = { life: 1, locker: 2, lockerSide: 2, coachPitch: 2, sns: 3, nemesisMate: 3, routineMake: 3 };
const MAIL_CAP = 2;
const MAIL_TOTAL_CAP = 5; // 전체 쌓인 게 이만큼이면 곁가지 메일은 아예 안 옴

function pushChoice(player, choice) {
  const pr = MAIL_PRIORITY[choice.key];
  if (pr) {
    const pend = [player.pendingChoice, ...player.choiceQueue].filter(Boolean);
    if (pend.length >= MAIL_TOTAL_CAP) return skipMail(player);
    const side = player.choiceQueue.filter((c) => MAIL_PRIORITY[c.key]);
    const sideAll = pend.filter((c) => MAIL_PRIORITY[c.key]).length;
    if (sideAll >= MAIL_CAP) {
      // 대기 중인 곁가지 메일 중 제일 덜 중요한 것보다 중요하면 바꿔 끼움
      const low = side.sort((a, b) => MAIL_PRIORITY[a.key] - MAIL_PRIORITY[b.key])[0];
      if (!low || MAIL_PRIORITY[low.key] >= pr) return skipMail(player);
      player.choiceQueue.splice(player.choiceQueue.indexOf(low), 1);
      skipMail(player);
    }
  }
  if (!player.pendingChoice) player.pendingChoice = choice;
  else player.choiceQueue.push(choice);
}

function skipMail(player) {
  player.mailSkipped = (player.mailSkipped || 0) + 1;
}

function nextChoice(player) {
  player.pendingChoice = player.choiceQueue.shift() || null;
}

// 선택지를 맨 앞에 끼워 넣기 (결정적 순간처럼 바로 보여줘야 할 때)
function pushChoiceFirst(player, choice) {
  if (player.pendingChoice) player.choiceQueue.unshift(player.pendingChoice);
  player.pendingChoice = choice;
}
