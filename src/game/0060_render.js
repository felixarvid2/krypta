function render() {
  const lk = lkBegin();
  try { renderWorld(W, VH, px); if (lk) lkProject(); } finally { if (lk) lkEnd(); }
  renderPost();
}
