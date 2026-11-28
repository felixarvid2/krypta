function render() {
  const lk = lkBegin();
  w29Begin(); // version 29 (VÄRLD): väggar, golv och tak i grafikkortet i den här bildrutan?
  try { renderWorld(W, VH, px); if (lk) lkProject(); } finally { if (lk) lkEnd(); W29.cur = false; }
  renderPost();
}
