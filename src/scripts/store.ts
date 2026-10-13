/** 本機儲存：已讀、上次閱讀、閱讀偏好。localStorage 不可用時一律靜默退回預設。 */

export const READ_KEY = 'wjhy-read';
export const LAST_KEY = 'wjhy-last';
export const PREFS_KEY = 'wjhy-prefs';
export const TAB_KEY = 'wjhy-tab';

export type Prefs = {
  theme: 'auto' | 'light' | 'dark';
  size: 's' | 'm' | 'l' | 'xl';
  writing: 'h' | 'v';
  lb: 'on' | 'off';
  parallel: 'on' | 'off';
};

const DEFAULT_PREFS: Prefs = { theme: 'auto', size: 'm', writing: 'h', lb: 'on', parallel: 'off' };

const ALLOWED: { [K in keyof Prefs]: readonly Prefs[K][] } = {
  theme: ['auto', 'light', 'dark'],
  size: ['s', 'm', 'l', 'xl'],
  writing: ['h', 'v'],
  lb: ['on', 'off'],
  parallel: ['on', 'off'],
};

export function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function set(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 儲存不可用時僅本次有效 */
  }
}

export function loadRead(): Set<string> {
  try {
    const v = JSON.parse(get(READ_KEY) ?? '[]');
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveRead(read: Set<string>): void {
  set(READ_KEY, JSON.stringify([...read]));
  window.dispatchEvent(new CustomEvent('wjhy:read'));
}

/** 本次會話的偏好；localStorage 寫入失敗時仍以此為準。 */
let memo: Prefs | null = null;

export function loadPrefs(): Prefs {
  if (memo) return { ...memo };
  const prefs = { ...DEFAULT_PREFS };
  try {
    const raw = JSON.parse(get(PREFS_KEY) ?? '{}') as Record<string, unknown>;
    for (const k of Object.keys(ALLOWED) as (keyof Prefs)[]) {
      const v = raw[k];
      if ((ALLOWED[k] as readonly unknown[]).includes(v)) (prefs as Record<string, unknown>)[k] = v;
    }
  } catch {
    /* 用預設 */
  }
  return prefs;
}

export function applyPrefs(prefs: Prefs): void {
  const r = document.documentElement;
  if (prefs.theme === 'auto') delete r.dataset.theme;
  else r.dataset.theme = prefs.theme;
  r.dataset.size = prefs.size;
  r.dataset.writing = prefs.writing;
  r.dataset.lb = prefs.lb;
  r.dataset.parallel = prefs.parallel;
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): Prefs {
  const prefs = loadPrefs();
  if (!(ALLOWED[key] as readonly unknown[]).includes(value)) return prefs;
  prefs[key] = value;
  memo = { ...prefs };
  set(PREFS_KEY, JSON.stringify(prefs));
  applyPrefs(prefs);
  window.dispatchEvent(new CustomEvent('wjhy:prefs', { detail: prefs }));
  return prefs;
}

/** 把頁面上所有 [data-seg] 元素依已讀狀態加上 data-read。 */
export function paintRead(root: ParentNode = document): Set<string> {
  const read = loadRead();
  root.querySelectorAll<HTMLElement>('[data-seg]').forEach((el) => {
    el.toggleAttribute('data-read', read.has(el.dataset.seg ?? ''));
  });
  return read;
}
