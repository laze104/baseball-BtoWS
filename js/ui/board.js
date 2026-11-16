// =============================================
// board.js : 반응 탭 (커뮤니티 댓글창)
// =============================================

function commentHtml(c, best) {
  const who = c.ip ? `${c.nick}<span class="ip">(${c.ip})</span>` : `<b class="fixed">${c.nick}</b>${c.lv ? `<span class="lv">Lv.${c.lv}</span>` : ""}`;
  return `<li class="${best ? "best" : ""}">
    <div class="c-head">${best ? `<span class="best-tag">${c.lv ? "포텐" : "BEST"}</span>` : ""}${who}<span class="c-time">${c.time}</span></div>
    <div class="c-body">${c.text}</div>
    <div class="c-foot"><span class="up">▲ ${c.likes}</span><span class="down">▼ ${c.dislikes}</span></div>
    ${!best && c.replies && c.replies.length ? `<ul class="replies">${c.replies.map((r) => `<li><div class="c-head">${r.ip ? `${r.nick}<span class="ip">(${r.ip})</span>` : `<b class="fixed">${r.nick}</b>`}${r.op ? '<span class="op">글쓴이</span>' : ""}<span class="c-time">${r.time}</span></div><div class="c-body">${r.text}</div></li>`).join("")}</ul>` : ""}
  </li>`;
}

function showBoard(player, report) {
  const box = $("tab-board");
  if (!report || !report.comments) {
    box.innerHTML = "<p class='empty'>아직 반응이 없어요.</p>";
    return;
  }
  const comments = report.comments;
  const best = [...comments]
    .filter((c) => c.likes >= 50)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 2);
  const views = 1000 + comments.length * randomInt(300, 900);
  // 갤러리형(dc) / 커뮤형(fm) 게시판 (news.js applySkin)
  const fm = report.skin === "fm";
  const post = report.post || { title: report.news[0], body: "이번 시즌 어떻게 봄?" };
  const link = report.news[0] ? `<p class="post-link" onclick="openArticle(0)">📰 [기사] ${report.news[0]}</p>` : "";
  let html = fandomHtml(player) + memeHtml(player) + `<div class="board ${fm ? "fm" : ""}">`; // 팬심·밈 (fandom.js, meme.js)
  html += `
    <div class="board-title">${fm ? "⚾ 야구 게시판 <small>인기글</small>" : "⚾ 야구 갤러리 <small>개념글</small>"}</div>
    <div class="post">
      <div class="post-title">${post.title}</div>
      <div class="post-meta">${post.author ? (post.author.lv ? `${post.author.nick} <span class="lv">Lv.${post.author.lv}</span>` : `ㅇㅇ(${post.author.ip})`) : "ㅇㅇ"} · 조회 ${views.toLocaleString()} · 추천 ${randomInt(10, 300)} · 댓글 ${comments.length}</div>
      <div class="post-body"><p>${post.body}</p>${link}</div>
    </div>
    <div class="comment-count">전체 댓글 <b>${comments.length}</b>개</div>
    <ul class="comments">${best.map((c) => commentHtml(c, true)).join("")}${comments.map((c) => commentHtml(c, false)).join("")}</ul>
  </div>`;
  box.innerHTML = html;
}
