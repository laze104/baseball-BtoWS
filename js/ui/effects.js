// =============================================
// effects.js : 화면 연출 (토스트, 숫자 카운트업)
// =============================================

// 시즌 끝 토스트 (작은 기록): 하나씩 4초
function showToasts(list) {
  const box = $("toasts");
  if (!box || !list || !list.length) return;
  list.forEach((t, i) => {
    setTimeout(
      () => {
        const el = document.createElement("div");
        el.className = "toast";
        el.innerHTML = `<span>${t.icon}</span>${t.text}`;
        box.appendChild(el);
        setTimeout(() => el.remove(), 4200);
      },
      600 + i * 900,
    );
  });
}

// 큰 팝업 안 숫자 카운트업 (data-count)
function runCountUps(root) {
  for (const el of root.querySelectorAll("[data-count]")) {
    const to = Number(el.dataset.count);
    const start = performance.now();
    const dur = 1200;
    const tick = (now) => {
      const k = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); // 끝에서 천천히
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
