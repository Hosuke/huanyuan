/** 名相、校勘頁的即時篩選：[data-filter] 輸入框過濾 [data-filter-text] 條目。 */
const input = document.querySelector<HTMLInputElement>('[data-filter]');
const items = document.querySelectorAll<HTMLElement>('[data-filter-text]');
const count = document.querySelector<HTMLElement>('[data-filter-count]');
const empty = document.querySelector<HTMLElement>('[data-filter-empty]');
const chips = document.querySelectorAll<HTMLButtonElement>('[data-filter-tag]');
let tag = '';

function apply() {
  const q = input?.value.trim().toLowerCase() ?? '';
  let n = 0;
  items.forEach((el) => {
    const text = (el.dataset.filterText ?? '').toLowerCase();
    const ok = (!q || text.includes(q)) && (!tag || el.dataset.tag === tag);
    el.hidden = !ok;
    if (ok) n++;
  });
  if (count) count.textContent = `${n} 條`;
  if (empty) empty.hidden = n > 0;
}

input?.addEventListener('input', apply);

/** 以 hash 定位到被篩掉的條目時，清除篩選再定位。 */
function reveal() {
  const id = decodeURIComponent(location.hash.slice(1));
  const el = id ? document.getElementById(id) : null;
  if (!el || !el.hidden) return;
  if (input) input.value = '';
  tag = '';
  chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
  apply();
  el.scrollIntoView({ block: 'center' });
}
window.addEventListener('hashchange', reveal);
chips.forEach((chip) =>
  chip.addEventListener('click', () => {
    tag = chip.getAttribute('aria-pressed') === 'true' ? '' : (chip.dataset.filterTag ?? '');
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filterTag === tag && tag !== '')));
    apply();
  }),
);
