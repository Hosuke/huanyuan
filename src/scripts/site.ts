import { applyPrefs, loadPrefs, setPref, type Prefs } from './store';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/* ---------- 閱讀設定 ---------- */
const prefsBtn = document.querySelector<HTMLButtonElement>('[data-open-prefs]');
const prefsPanel = document.querySelector<HTMLElement>('#prefs-panel');

function paintPrefs(prefs: Prefs) {
  document.querySelectorAll<HTMLElement>('[data-pref]').forEach((group) => {
    const key = group.dataset.pref as keyof Prefs;
    group.querySelectorAll<HTMLButtonElement>('button[data-value]').forEach((b) => {
      b.setAttribute('aria-pressed', String(prefs[key] === b.dataset.value));
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-toggle-pref]').forEach((b) => {
    const [key, on] = (b.dataset.togglePref ?? '').split(':') as [keyof Prefs, string];
    b.setAttribute('aria-pressed', String(prefs[key] === on));
  });
}

function closePrefs() {
  if (!prefsPanel || prefsPanel.hidden) return;
  prefsPanel.hidden = true;
  prefsBtn?.setAttribute('aria-expanded', 'false');
}

prefsBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!prefsPanel) return;
  prefsPanel.hidden = !prefsPanel.hidden;
  prefsBtn.setAttribute('aria-expanded', String(!prefsPanel.hidden));
});

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const choice = target.closest<HTMLButtonElement>('[data-pref] button[data-value]');
  if (choice) {
    const key = choice.closest<HTMLElement>('[data-pref]')!.dataset.pref as keyof Prefs;
    paintPrefs(setPref(key, choice.dataset.value as never));
    return;
  }
  // 頁內快捷開關，如「並列白話」：data-toggle-pref="parallel:on"，另一值取該偏好的對反。
  const toggle = target.closest<HTMLButtonElement>('[data-toggle-pref]');
  if (toggle) {
    const [key, on, off] = (toggle.dataset.togglePref ?? '').split(':') as [keyof Prefs, string, string];
    const prefs = loadPrefs();
    paintPrefs(setPref(key, (prefs[key] === on ? off : on) as never));
    return;
  }
  if (prefsPanel && !prefsPanel.hidden && !target.closest('#prefs-panel')) closePrefs();
});

applyPrefs(loadPrefs());
paintPrefs(loadPrefs());

/* ---------- 搜尋 ---------- */
type Doc = { k: string; id: string; t: string; p: string; x: string; h: string };
type Index = { s2t: Record<string, string>; docs: Doc[] };

const dialog = document.querySelector<HTMLDialogElement>('[data-search-dialog]');
const input = document.querySelector<HTMLInputElement>('[data-search-input]');
const list = document.querySelector<HTMLUListElement>('[data-search-results]');
let index: Promise<Index> | null = null;
let active = -1;

function loadIndex(): Promise<Index> {
  index ??= fetch(`${BASE}/search.json`).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<Index>;
  });
  index.catch(() => {
    index = null;
  });
  return index;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 把查詢字串轉成正則：每個簡體字都同時匹配其繁體對應。 */
function queryRegex(q: string, s2t: Record<string, string>): RegExp {
  const src = [...q]
    .map((ch) => {
      const alts = s2t[ch];
      return alts ? `[${escapeRe(ch + alts)}]` : escapeRe(ch);
    })
    .join('');
  return new RegExp(src, 'gi');
}

function snippet(text: string, re: RegExp): string {
  re.lastIndex = 0;
  const m = re.exec(text);
  if (!m) return escapeHtml(text.slice(0, 60));
  const start = Math.max(0, m.index - 22);
  const end = Math.min(text.length, m.index + m[0].length + 40);
  const slice = text.slice(start, end);
  const marked = escapeHtml(slice).replace(
    new RegExp(re.source, 'gi'),
    (s) => `<mark>${s}</mark>`,
  );
  return `${start > 0 ? '……' : ''}${marked}${end < text.length ? '……' : ''}`;
}

function setActive(i: number) {
  const items = list?.querySelectorAll<HTMLAnchorElement>('a') ?? [];
  if (!items.length) return;
  active = (i + items.length) % items.length;
  items.forEach((a, k) => a.setAttribute('aria-selected', String(k === active)));
  input?.setAttribute('aria-activedescendant', items[active].id);
  items[active].scrollIntoView({ block: 'nearest' });
}

async function runSearch() {
  if (!list || !input) return;
  const q = input.value.trim();
  active = -1;
  input.removeAttribute('aria-activedescendant');
  if (!q) {
    list.innerHTML = '<li class="search-empty">輸入字詞，如「海印」「帝網」「一塵」。</li>';
    return;
  }
  let idx: Index;
  try {
    idx = await loadIndex();
  } catch {
    list.innerHTML = '<li class="search-empty">索引載入失敗，請稍後再試。</li>';
    return;
  }
  if (input.value.trim() !== q) return;
  const re = queryRegex(q, idx.s2t);
  const hits = idx.docs
    .map((d) => {
      re.lastIndex = 0;
      const inTitle = re.test(d.t);
      re.lastIndex = 0;
      const inText = re.test(d.x);
      if (!inTitle && !inText) return null;
      const rank = (inTitle ? 0 : 10) + (d.k === '名相' ? 0 : d.k === '原文' ? 1 : d.k === '白話' ? 2 : 3);
      return { d, rank };
    })
    .filter((h): h is { d: Doc; rank: number } => h !== null)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 40);

  if (!hits.length) {
    list.innerHTML = `<li class="search-empty">未見「${escapeHtml(q)}」。</li>`;
    return;
  }
  list.innerHTML = hits
    .map(
      ({ d }, i) => `<li role="presentation"><a id="sr-${i}" href="${BASE}/${encodeURI(d.h)}" role="option" aria-selected="false">
        <span class="r-head"><span class="r-kind">${escapeHtml(d.k)}</span><span class="r-title">${escapeHtml(d.t)}</span></span>
        <span class="r-snip">${snippet(d.x, re)}</span></a></li>`,
    )
    .join('');
  setActive(0);
}

function openSearch() {
  if (!dialog || dialog.open) return;
  closePrefs();
  dialog.showModal();
  input?.select();
  void loadIndex().catch(() => undefined);
  void runSearch();
}

document.querySelectorAll('[data-open-search]').forEach((b) => b.addEventListener('click', openSearch));
document.querySelector('[data-close-search]')?.addEventListener('click', () => dialog?.close());
dialog?.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close();
  // 結果指向本頁（只差 hash）時瀏覽器不會換頁，需手動關閉。
  const hit = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[role="option"]');
  if (hit) {
    dialog.close();
    // 同頁同 hash 不會觸發 hashchange，手動補發讓頁面定位到目標。
    if (hit.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '')) {
      window.setTimeout(() => window.dispatchEvent(new HashChangeEvent('hashchange')), 0);
    }
  }
});

let timer = 0;
input?.addEventListener('input', () => {
  window.clearTimeout(timer);
  timer = window.setTimeout(runSearch, 90);
});

input?.addEventListener('keydown', (e) => {
  if (e.isComposing || e.keyCode === 229) return; // 輸入法選字中
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setActive(active + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setActive(active - 1);
  } else if (e.key === 'Enter') {
    const a = list?.querySelectorAll<HTMLAnchorElement>('a')[active];
    if (a) {
      e.preventDefault();
      a.click();
    }
  }
});

/* ---------- 全站快捷鍵 ---------- */
function typing(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || typing(e.target)) return;
  if ((e.key === '/' && !e.metaKey && !e.ctrlKey) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
    e.preventDefault();
    openSearch();
  } else if (e.key === 'Escape') {
    closePrefs();
  }
});
