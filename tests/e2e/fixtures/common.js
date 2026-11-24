// Shared by the fixtures: fills `target` with `count` paragraphs of a fixed
// 40 px height, so the expected content height is known exactly.
window.addParagraphs = (target, count, from = 0) => {
  const fragment = document.createDocumentFragment();
  for (let i = from; i < from + count; i++) {
    const p = document.createElement('p');
    p.className = 'row';
    p.textContent = `Paragraph ${i + 1}`;
    fragment.appendChild(p);
  }
  target.appendChild(fragment);
};
