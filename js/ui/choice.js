// =============================================
// choice.js : 선택지(메일) 화면과 고른 뒤 반응 댓글
// =============================================

// 선택지별 팬 반응 댓글 묶음
function reactionPool(key, option, player) {
  const side = sidePool(key, option, player); // 몸·딜레마·라커룸·논란 등 (flow.js)
  if (side) return side;
  if (key === "fa" || key === "agent") return FAN.contract;
  if (key === "press") return pressPool(player.lastPressTone); // 기자회견 답변 말투별 (press.js)
  if (key === "clutch") return player.lastClutch ? FAN.clutchGood : FAN.clutchBad;
  if (key === "draftSign") return option.id === "college" ? FAN.college : FAN.draft;
  if (key === "undrafted" && option.id === "COLLEGE") return FAN.college;
  if (key === "collegePick") return FAN.college;
  if (key === "managerTalk" || key === "closerOffer") return FAN.good;
  if (key === "posting") {
    if (option.id === "stay") return FAN.good;
    return player.pendingChoice && player.pendingChoice.key === "postingOffer" ? FAN.posting : FAN.postingFail;
  }
  if (key === "postingOffer" || key === "overseasOffer") return option.offer ? FAN.posting : FAN.good;
  if (key === "national") return option.id === "join" ? FAN.national : FAN.nationalSkip;
  if (key === "military") return option.id === "delay" ? FAN.good : FAN.military;
  if (key === "life") return option.mood === "bad" ? FAN.lifeBad : FAN.lifeGood;
  if (key === "position") return option.id === "accept" ? FAN.position : FAN.good;
  if (key === "mlbDirect") return option.id === "go" ? FAN.mlbDirect : FAN.good;
  return FAN.good;
}

// 진로 선택지 (드래프트 미지명, FA 제안, 국가대표 등)
function showChoice(player) {
  const choice = player.pendingChoice;
  choicePanel.hidden = !choice;
  seasonPanel.hidden = !!choice;
  if (!choice) return;
  if (choice.key === "clutch") {
    // 결정적 순간은 중계 화면처럼 (broadcast.js)
    if (prepClutch(player, choice)) savePlayer(player);
    choicePanel.innerHTML = clutchBoardHtml(player, choice);
  } else {
    choicePanel.innerHTML = mailboxHtml(player); // 메일함 형식 (mail.js)
  }
  for (const option of choice.options) {
    const button = document.createElement("button");
    button.className = "choice";
    button.innerHTML = option.detail ? `${option.label}<small>${option.detail}</small>` : option.label;
    button.addEventListener("click", () => {
      const key = choice.key;
      const awardsBefore = player.lastReport ? player.lastReport.awards.length : 0;
      logMail(player, choice, option); // 답장한 메일 보관 (mail.js)
      const cur = player.cur ? player.cur.report : null;
      const bigBefore = cur && cur.bigMoments ? cur.bigMoments.length : 0;
      const news = resolveChoice(player, option.id);
      const moments = choiceBigMoments(player, choice, option, news, awardsBefore);
      moments.push(...takeArbMoment(player)); // 연봉조정 판정 (contract.js)
      if (cur && cur.bigMoments && cur.bigMoments.length > bigBefore) moments.push(...cur.bigMoments.splice(bigBefore)); // 시즌 중 트레이드 같은 건 바로 보여줌
      moments.push(...memeAfterClutch(player, choice, news)); // 밈 생기기·뒤집기 (meme.js)
      if (!player.retired) news.push(...fandomMove(player, null)); // FA·트레이드로 팀 옮겼으면 팬심 (fandom.js)
      if (!player.retired) news.push(...checkAchievements(player).map((n) => `🏅 업적 달성: ${n}`));
      if (player.retired) {
        localStorage.removeItem(SAVE_KEY);
        showRetired(player);
        return;
      }
      addReaction(player, player.cur ? player.cur.report : player.lastReport, news, reactionPool(key, option, player), {
        team: player.team,
        nick: player.nickname || "",
      });
      savePlayer(player);
      // 화면 그리다 에러 나도 중계·결과 팝업은 떠야 함
      try {
        showPlayer(player);
      } catch (e) {
        console.error("화면 그리기 실패", e);
      }
      showBigMoments(moments);
    });
    choicePanel.appendChild(button);
  }
}
