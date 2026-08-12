import segmentsJson from '../../data/original/segments.json';
import termsJson from '../../data/dict/terms.json';

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
    mengcan: Commentary;
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

export const data = segmentsJson as unknown as SegmentsData;
export const segments = data.segments;

export const terms = (termsJson as unknown as Term[]).slice().sort((a, b) =>
  a.pinyin.localeCompare(b.pinyin, 'en'),
);

export function getSegment(id: string): Segment | undefined {
  return segments.find((s) => s.id === id);
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
