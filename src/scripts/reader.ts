import { LAST_KEY, TAB_KEY, get, loadPrefs, loadRead, paintRead, saveRead, set } from './store';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const reader = document.querySelector<HTMLElement>('[data-reader]');

if (reader) {
  const segId = reader.dataset.id!;
  set(LAST_KEY, segId);

  /* ---------- 已讀 ---------- */
  const readBtn = document.querySelector<HTMLButtonElement>('[data-read-toggle]');
  const paintBtn = () => {
    const done = loadRead().has(segId);
    readBtn?.setAttribute('aria-pressed', String(done));
    if (readBtn) readBtn.textContent = done ? '已讀 ✓' : '標記已讀';
    paintRead(reader);
  };
  readBtn?.addEventListener('click', () => {
    const read = loadRead();
    if (read.has(segId)) read.delete(segId);
    else read.add(segId);
    saveRead(read);
    paintBtn();
  });
  paintBtn();
  window.addEventListener('pageshow', paintBtn);

  /* ---------- 頁籤 ---------- */
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = document.querySelectorAll<HTMLElement>('[data-panel]');
  const visibleTabs = () => tabs.filter((t) => t.offsetParent !== null || t.getClientRects().length > 0);

  function activate(key: string, opts: { focus?: boolean; remember?: boolean } = {}) {
    const tab = tabs.find((t) => t.dataset.tab === key);
    if (!tab) return;
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p) => (p.hidden = p.dataset.panel !== key));
    if (opts.remember !== false) set(TAB_KEY, key);
    if (opts.focus) tab.focus();
  }

  /** 並列模式下白話已在原文旁，頁籤改落到第一個有內容的講記。 */
  function fallbackKey(preferred: string | null): string {
    const parallel = loadPrefs().parallel === 'on';
    const usable = (k: string | null | undefined) =>
      !!k && tabs.some((t) => t.dataset.tab === k) && !(parallel && k === 'baihua');
    if (usable(preferred)) return preferred!;
    const firstReady = tabs.find((t) => !t.classList.contains('is-empty') && usable(t.dataset.tab));
    return firstReady?.dataset.tab ?? tabs.find((t) => usable(t.dataset.tab))?.dataset.tab ?? 'baihua';
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activate(tab.dataset.tab!));
    tab.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      const list = visibleTabs();
      const i = list.indexOf(tab);
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
      activate(list[j].dataset.tab!, { focus: true });
    });
  });

  function fromHash(): boolean {
    const hashKey = location.hash.slice(1);
    if (!tabs.some((t) => t.dataset.tab === hashKey)) return false;
    activate(fallbackKey(hashKey), { remember: false });
    // 並列模式下白話就在原文旁，直接定位到並列欄。
    const target = hashKey === 'baihua' && loadPrefs().parallel === 'on'
      ? document.querySelector('.parallel-only')
      : document.getElementById('commentary');
    requestAnimationFrame(() => target?.scrollIntoView({ block: 'start' }));
    return true;
  }
  if (!fromHash()) activate(fallbackKey(get(TAB_KEY)), { remember: false });
  window.addEventListener('hashchange', fromHash);

  window.addEventListener('wjhy:prefs', () => {
    const current = tabs.find((t) => t.getAttribute('aria-selected') === 'true')?.dataset.tab ?? null;
    const next = fallbackKey(current);
    if (next !== current) activate(next, { remember: false });
    resetVertical();
  });

  /* ---------- 旁註聯動與浮出註卡 ---------- */
  const pop = document.querySelector<HTMLElement>('[data-pop]')!;
  const popKind = pop.querySelector<HTMLElement>('[data-pop-kind]')!;
  const popBody = pop.querySelector<HTMLElement>('[data-pop-body]')!;
  let popAnchor: HTMLElement | null = null;

  type Key = { kind: 'term' | 'quote' | 'variant'; id: string };
  const KIND_LABEL = { term: '名相', quote: '徵引', variant: '校勘' } as const;

  function keysOf(el: HTMLElement): Key[] {
    const keys: Key[] = [];
    // 優先序：最細的標記在前（校勘一字 > 名相一詞 > 徵引一句）。
    if (el.dataset.variant !== undefined) keys.push({ kind: 'variant', id: el.dataset.variant });
    if (el.dataset.term) keys.push({ kind: 'term', id: el.dataset.term });
    if (el.dataset.quote) keys.push({ kind: 'quote', id: el.dataset.quote });
    return keys;
  }

  const cardOf = (k: Key) => document.getElementById(`n-${k.kind === 'variant' ? 'var' : k.kind}-${k.id}`);
  const marksOf = (k: Key) => document.querySelectorAll<HTMLElement>(`.mk[data-${k.kind}="${CSS.escape(k.id)}"]`);

  function light(keys: Key[], on: boolean) {
    for (const k of keys) {
      marksOf(k).forEach((m) => m.classList.toggle('is-lit', on));
      cardOf(k)?.classList.toggle('is-lit', on);
    }
  }

  function closePop() {
    if (pop.hidden) return;
    pop.hidden = true;
    document.querySelectorAll('.is-lit').forEach((el) => el.classList.remove('is-lit'));
    popAnchor?.focus({ preventScroll: true });
    popAnchor = null;
  }

  function openPop(anchor: HTMLElement, key: Key) {
    const card = cardOf(key);
    if (!card) return;
    document.querySelectorAll('.is-lit').forEach((el) => el.classList.remove('is-lit'));
    light([key], true);
    popKind.textContent = KIND_LABEL[key.kind];
    popBody.replaceChildren();
    const title = document.createElement('div');
    title.className = 'pop-title';
    title.textContent = card.querySelector('.nc-title')?.textContent?.trim() ?? '';
    const sub = card.querySelector('.nc-sub')?.textContent?.trim();
    if (sub) {
      const small = document.createElement('small');
      small.textContent = sub;
      title.append(small);
    }
    popBody.append(title);
    const body = card.querySelector('.nc-body');
    if (body && key.kind !== 'quote') {
      const p = document.createElement('p');
      p.textContent = body.textContent;
      popBody.append(p);
    }
    const link = card.querySelector<HTMLAnchorElement>('.pop-link');
    if (link) {
      const a = link.cloneNode(true) as HTMLAnchorElement;
      a.hidden = false;
      popBody.append(a);
    }

    pop.hidden = false;
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const left = Math.min(Math.max(8, r.left + window.scrollX + r.width / 2 - w / 2), window.scrollX + document.documentElement.clientWidth - w - 8);
    const below = r.bottom + 10 + h < window.innerHeight;
    const top = below ? r.bottom + window.scrollY + 10 : r.top + window.scrollY - h - 10;
    pop.style.left = `${left}px`;
    pop.style.top = `${Math.max(window.scrollY + 8, top)}px`;
    pop.setAttribute('aria-label', `${KIND_LABEL[key.kind]}：${title.firstChild?.textContent ?? ''}`);
    popAnchor = anchor;
    pop.querySelector<HTMLElement>('[data-pop-close]')?.focus({ preventScroll: true });
  }

  document.querySelectorAll<HTMLElement>('.mk').forEach((mk) => {
    const keys = keysOf(mk);
    mk.addEventListener('mouseenter', () => pop.hidden && light(keys, true));
    mk.addEventListener('mouseleave', () => pop.hidden && light(keys, false));
    const open = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      // 同一處再點時，依序輪到下一層標記（如徵引內的名相）。
      const sameAnchor = popAnchor === mk && !pop.hidden;
      const shown = popKind.textContent;
      const idx = sameAnchor ? (keys.findIndex((k) => KIND_LABEL[k.kind] === shown) + 1) % keys.length : 0;
      if (sameAnchor && keys.length === 1) return closePop();
      openPop(mk, keys[idx]);
    };
    mk.addEventListener('click', open);
    mk.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') open(e);
    });
  });

  // 旁註卡 → 原文：懸停點亮，點擊捲到第一處。
  document.querySelectorAll<HTMLElement>('.note-card').forEach((card) => {
    const kind = card.dataset.cardTerm !== undefined ? 'term' : card.dataset.cardQuote !== undefined ? 'quote' : 'variant';
    const id = card.dataset.cardTerm ?? card.dataset.cardQuote ?? card.dataset.cardVariant ?? '';
    const key: Key = { kind, id };
    card.addEventListener('mouseenter', () => light([key], true));
    card.addEventListener('mouseleave', () => pop.hidden && light([key], false));
    const go = (e: Event) => {
      if ((e.target as HTMLElement).closest('a')) return;
      const first = marksOf(key)[0];
      if (!first) return;
      first.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      light([key], true);
      window.setTimeout(() => pop.hidden && light([key], false), 1600);
    };
    card.addEventListener('click', go);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') go(e);
    });
  });

  pop.querySelector('[data-pop-close]')?.addEventListener('click', closePop);
  document.addEventListener('click', (e) => {
    if (!pop.hidden && !(e.target as HTMLElement).closest('[data-pop]')) closePop();
  });
  window.addEventListener('resize', closePop);

  /* ---------- 目次抽屜（窄屏） ---------- */
  const toc = document.querySelector<HTMLElement>('[data-toc]');
  const tocBtn = document.querySelector<HTMLButtonElement>('[data-toc-toggle]');
  // 窄屏抽屜收起時設 inert，避免畫面外的連結仍可被 Tab 聚焦。
  const drawerMq = window.matchMedia('(max-width: 920px)');
  const syncInert = () => toc?.toggleAttribute('inert', drawerMq.matches && !toc.classList.contains('is-open'));
  const setToc = (open: boolean) => {
    toc?.classList.toggle('is-open', open);
    tocBtn?.setAttribute('aria-expanded', String(open));
    syncInert();
    if (open) toc?.querySelector<HTMLElement>('[aria-current="page"]')?.focus({ preventScroll: true });
  };
  drawerMq.addEventListener('change', syncInert);
  syncInert();
  tocBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    setToc(!toc?.classList.contains('is-open'));
  });
  document.addEventListener('click', (e) => {
    if (toc?.classList.contains('is-open') && !(e.target as HTMLElement).closest('[data-toc]')) setToc(false);
  });
  // 只捲目次自身，不牽動頁面捲動位置。
  const curItem = toc?.querySelector<HTMLElement>('[aria-current="page"]');
  if (toc && curItem) toc.scrollTop = curItem.offsetTop - toc.clientHeight / 2;

  /* ---------- 直排：從右端（卷首）開始 ---------- */
  const wrap = document.querySelector<HTMLElement>('[data-sutra-wrap]');
  function resetVertical() {
    if (wrap && document.documentElement.dataset.writing === 'v') wrap.scrollLeft = wrap.scrollWidth;
  }
  resetVertical();

  /* ---------- 捲動進度 ---------- */
  const meter = document.querySelector<HTMLElement>('[data-scroll-meter]');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (meter) meter.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 快捷鍵 ---------- */
  document.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (e.key === 'Escape') {
      closePop();
      if (toc?.classList.contains('is-open')) {
        setToc(false);
        tocBtn?.focus();
      }
      return;
    }
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.closest('[role="tablist"], [data-sutra-wrap]')) return;
    if (document.querySelector('dialog[open]')) return;
    if (e.key === 'ArrowLeft' && reader.dataset.prev) {
      location.href = `${BASE}/read/${reader.dataset.prev}`;
    } else if (e.key === 'ArrowRight' && reader.dataset.next) {
      location.href = `${BASE}/read/${reader.dataset.next}`;
    }
  });
}
