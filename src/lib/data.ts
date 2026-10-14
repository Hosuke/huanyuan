import segmentsJson from '../../data/original/segments.json';
import termsJson from '../../data/dict/terms.json';
import quotesJson from '../../data/original/quotes.json';
import collationJson from '../../data/original/collation.json';
import taixuAnchorsJson from '../../data/original/taixu_anchors.json';

export interface Part {
  part: number;
  name: string;
}

export interface Commentary {
  status: 'pending' | 'done' | string;
  episodes: string[];
  notes: string;
}

export interface Segment {
  id: string;
  part: number;
  part_name: string;
  title: string;
  start_lb: string;
  end_lb: string;
  text: string;
  translation: string;
  commentaries: {
    tifo: Commentary;
    jingkong: Commentary;
  };
  quotes: string[];
  terms: string[];
}

export interface SegmentsData {
  sutra: string;
  cbeta: string;
  author: string;
  source: string;
  parts: Part[];
  segments: Segment[];
}

export interface Term {
  id: string;
  term: string;
  pinyin: string;
  def: string;
  refs: string[];
}

export interface Quote {
  id: string;
  segment: string;
  cited_as: string;
  work: string;
  quote: string;
  identified: {
    canon: string;
    juan: string;
    pin: string;
    cbeta_ref: string;
  };
  status: 'pending' | 'identified' | 'paraphrase' | 'unlocated' | 'general';
  note?: string;
  taixu?: string;
  taixu_hl?: string;
}

export function cbetaUrl(ref: string): string {
  return `https://cbetaonline.dila.edu.tw/zh/${ref}`;
}

export function taixuUrl(slug: string, hl?: string): string {
  return `https://taixu.ink/classics/${encodeURIComponent(slug)}/` +
    (hl ? `?hl=${encodeURIComponent(hl)}` : '');
}

const taixuAnchors: { work: string; segments: Record<string, string> } = taixuAnchorsJson;

export function taixuSegmentUrl(id: string): string | null {
  const fragment = taixuAnchors.segments[id];
  return fragment ? taixuUrl(taixuAnchors.work, fragment) : null;
}

export function formatCbetaRef(ref: string): string {
  return ref.replace('_', ', ');
}

export interface Variant {
  lb: string;
  type: string;
  cbeta: string;
  wikisource: string;
  context: string;
  ruling: string;
  note: string;
}

interface CollationData {
  meta: {
    base: string;
    compare: string;
    url: string;
    method: string;
  };
  stats: {
    cbeta_chars: number;
    wikisource_chars: number;
    variants: number;
  };
  variants: Variant[];
}

export const data = segmentsJson as unknown as SegmentsData;
export const segments = data.segments;

export const terms = (termsJson as unknown as Term[]).slice().sort((a, b) =>
  a.pinyin.localeCompare(b.pinyin, 'en'),
);

const quotes = (quotesJson as unknown as { quotes: Quote[] }).quotes;

export const collation = collationJson as unknown as CollationData;

export function getSegment(id: string): Segment | undefined {
  return segments.find((s) => s.id === id);
}

export function quotesBySegment(id: string): Quote[] {
  return quotes.filter((quote) => quote.segment === id);
}

export function termsBySegment(id: string): Term[] {
  return terms.filter((term) => term.refs.includes(id));
}

/** 本段所涉校勘；index 為 collation.variants 中的序號，作頁內錨點用。 */
export function variantsBySegment(id: string): { index: number; variant: Variant }[] {
  return collation.variants
    .map((variant, index) => ({ index, variant }))
    .filter(({ variant }) => lbToSegmentId(variant.lb) === id);
}

/** 去錨點的純原文 */
export function plainText(seg: Segment): string {
  return seg.text.replace(/【\d{4}[abc]\d{2}】/g, '');
}

/** 截取前 n 字作摘要，在句讀處收尾 */
export function excerpt(text: string, n = 60): string {
  if (text.length <= n) return text;
  const cut = text.slice(0, n);
  const stop = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('；'), cut.lastIndexOf('，'));
  return (stop > n * 0.5 ? cut.slice(0, stop + 1) : cut) + '……';
}

/** 講記摘要首段（結構化淨空講記的總述） */
export function commentarySummary(c: Commentary): string {
  return c.notes.replace(/\r\n?/g, '\n').trim().split(/\n\s*\n/)[0]?.trim() ?? '';
}

export interface Gate {
  part: number;
  /** 一體、二用…… */
  name: string;
  /** 一顯一體、二起二用…… */
  full: string;
  /** 動詞：顯、起、示、行、入、起 */
  verb: string;
  gist: string;
  /** 六門正文段（不含總釋、問答、結會） */
  ids: string[];
}

/** 六門總綱。gist 只撮各門起首原文，不作發揮。 */
export const gates: Gate[] = [
  { part: 1, name: '一體', full: '一顯一體', verb: '顯', gist: '自性清淨圓明體：如來藏中法性之體，處染不垢，修治不淨。', ids: ['1.0'] },
  { part: 2, name: '二用', full: '二起二用', verb: '起', gist: '依前淨體起於二用：海印森羅常住用、法界圓明自在用。', ids: ['2.1', '2.2'] },
  { part: 3, name: '三遍', full: '三示三遍', verb: '示', gist: '依前二用，一一用中普周法界：普周法界、出生無盡、含容空有。', ids: ['3.1', '3.2', '3.3'] },
  { part: 4, name: '四德', full: '四行四德', verb: '行', gist: '依前一塵能遍之境，而修四種行德：隨緣、威儀、柔和、代苦。', ids: ['4.1', '4.2', '4.3', '4.4'] },
  { part: 5, name: '五止', full: '五入五止', verb: '入', gist: '攝用歸體，相盡心澄而修止：離緣、絕欲、法爾、無念、非相。', ids: ['5.1', '5.2', '5.3', '5.4', '5.5'] },
  { part: 6, name: '六觀', full: '六起六觀', verb: '起', gist: '依止起觀，定慧雙融：真空、妙有、圓融、眾緣、鏡像、帝網。', ids: ['6.1', '6.2', '6.3', '6.4', '6.5', '6.6'] },
];

export const commentaryMeta = [
  { key: 'tifo', label: '體佛法師' },
  { key: 'jingkong', label: '淨空法師' },
] as const;

export const PREFS_STORAGE_KEY = 'wjhy-prefs';
export const LAST_STORAGE_KEY = 'wjhy-last';
export const TAB_STORAGE_KEY = 'wjhy-tab';

/** 依 CBETA 行號定位所屬段落；行號格式固定時可直接按字典序比較。 */
export function lbToSegmentId(lb: string): string | undefined {
  return segments.find((segment) => segment.start_lb <= lb && lb <= segment.end_lb)?.id;
}

/** 將講記集號按檔名歸組，如 12-046-004、12-046-005 -> 12-046 第 4、5 集。 */
export function formatEpisodes(eps: string[]): string {
  const groups = new Map<string, string[]>();

  for (const episode of eps) {
    const match = episode.match(/^(.+)-(\d+)$/);
    if (!match) {
      const standalone = groups.get(episode) ?? [];
      standalone.push('');
      groups.set(episode, standalone);
      continue;
    }

    const [, filename, episodeNumber] = match;
    const numbers = groups.get(filename) ?? [];
    numbers.push(String(Number.parseInt(episodeNumber, 10)));
    groups.set(filename, numbers);
  }

  return Array.from(groups, ([filename, numbers]) =>
    numbers[0] === '' ? filename : `${filename} 第 ${numbers.join('、')} 集`,
  ).join('；');
}

/** 0637a06 -> T.637a06（去掉行号前导零） */
export function formatLb(lb: string): string {
  return `T.${lb.replace(/^0+(?=\d)/, '')}`;
}

export interface TextLine {
  lb: string | null;
  text: string;
}

/** 把含【0637a06】錨點的原文拆成逐行結構 */
export function splitLines(text: string): TextLine[] {
  const lines: TextLine[] = [];
  const re = /【(\d{4}[abc]\d{2})】/g;
  let lastIndex = 0;
  let currentLb: string | null = null;
  for (const m of text.matchAll(re)) {
    const chunk = text.slice(lastIndex, m.index).trim();
    if (chunk) lines.push({ lb: currentLb, text: chunk });
    currentLb = m[1];
    lastIndex = m.index + m[0].length;
  }
  const tail = text.slice(lastIndex).trim();
  if (tail) lines.push({ lb: currentLb, text: tail });
  return lines;
}

/** 段落標題的簡稱：去掉「二用・」「顯一體：」一類前綴 */
export function shortTitle(seg: Segment): string {
  const parts = seg.title.split(/[・：:]/);
  return parts[parts.length - 1];
}

export const READ_STORAGE_KEY = 'wjhy-read';

/** 站点 base 路径（GitHub Pages 项目页为 /huanyuan/），拼接站内链接用 */
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
