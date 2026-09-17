  // ===== 本地定制：calendar-hub-layout（待办横排）=====
  // 横排后滚轮默认是纵向的，横向滚不动，这里把 deltaY 转成 scrollLeft。
  // 只在真的溢出时才接管，且不干扰横向滚轮（deltaX）和 Shift+滚轮。
  list.addEventListener("wheel", (event) => {
    if (event.deltaX !== 0 || event.deltaY === 0) {
      return;
    }
    if (list.scrollWidth <= list.clientWidth) {
      return;
    }
    event.preventDefault();
    list.scrollLeft += event.deltaY;
  }, { passive: false });
