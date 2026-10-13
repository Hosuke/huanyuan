import type { Quote, Segment, Term, Variant } from './data';

/**
 * 把一段原文切成「片」：每片是一段連續文字，帶著它所落入的名相／徵引／校勘標記，
 * 或者是一個大正藏行號錨點。渲染端逐片輸出即可在原文中就地標注。
 */
export type Piece =
  | { kind: 'lb'; lb: string }
  | { kind: 'text'; text: string; term?: string; quote?: string; variant?: number };

interface Range {
  start: number;
  end: number;
}

const LB_RE = /【(\d{4}[abc]\d{2})】/g;

/** 去掉行號錨點得到純文字，並記錄每個行號在純文字中的起點。 */
export function stripLb(text: string): { plain: string; lbs: { at: number; lb: string }[] } {
  const lbs: { at: number; lb: string }[] = [];
  let plain = '';
  let last = 0;
  for (const m of text.matchAll(LB_RE)) {
    plain += text.slice(last, m.index);
    lbs.push({ at: plain.length, lb: m[1] });
    last = (m.index ?? 0) + m[0].length;
  }
  plain += text.slice(last);
  return { plain, lbs };
}

function overlaps(a: Range, list: Range[]): boolean {
  return list.some((b) => a.start < b.end && b.start < a.end);
}

export function annotate(
  seg: Segment,
  terms: Term[],
  quotes: Quote[],
  variants: { index: number; variant: Variant }[],
): Piece[] {
  const { plain, lbs } = stripLb(seg.text);
  const n = plain.length;
  const termAt: (string | undefined)[] = new Array(n);
  const quoteAt: (string | undefined)[] = new Array(n);
  const variantAt: (number | undefined)[] = new Array(n);

  // 名相：長詞優先、互不重疊；只標本段所屬詞條，避免「一塵」之類短詞滿篇開花。
  const claimed: Range[] = [];
  const sorted = terms.slice().sort((a, b) => b.term.length - a.term.length);
  for (const term of sorted) {
    let from = 0;
    for (;;) {
      const i = plain.indexOf(term.term, from);
      if (i < 0) break;
      const r = { start: i, end: i + term.term.length };
      if (!overlaps(r, claimed)) {
        claimed.push(r);
        for (let k = r.start; k < r.end; k++) termAt[k] = term.id;
      }
      from = i + term.term.length;
    }
  }

  for (const quote of quotes) {
    if (!quote.quote) continue;
    const i = plain.indexOf(quote.quote);
    if (i < 0) continue;
    for (let k = i; k < i + quote.quote.length; k++) quoteAt[k] ??= quote.id;
  }

  // 校勘：在該行號所在的那一行裡找底本字。
  for (const { index, variant } of variants) {
    if (!variant.cbeta) continue;
    const li = lbs.findIndex((x) => x.lb === variant.lb);
    if (li < 0) continue;
    const lineStart = lbs[li].at;
    const lineEnd = li + 1 < lbs.length ? lbs[li + 1].at : n;
    let i = plain.indexOf(variant.cbeta, lineStart);
    if (i < 0 || i >= lineEnd) continue;
    // 同一行同字多次出現（如兩個異文同為「毘」）時，跳過已標者。
    while (i >= 0 && i < lineEnd && variantAt[i] !== undefined) i = plain.indexOf(variant.cbeta, i + 1);
    if (i < 0 || i >= lineEnd) continue;
    for (let k = i; k < i + variant.cbeta.length; k++) variantAt[k] = index;
  }

  const pieces: Piece[] = [];
  let lbIdx = 0;
  let buf = '';
  let cur: { term?: string; quote?: string; variant?: number } = {};
  const flush = () => {
    if (buf) pieces.push({ kind: 'text', text: buf, ...cur });
    buf = '';
  };
  for (let k = 0; k <= n; k++) {
    while (lbIdx < lbs.length && lbs[lbIdx].at === k) {
      flush();
      pieces.push({ kind: 'lb', lb: lbs[lbIdx].lb });
      lbIdx++;
    }
    if (k === n) break;
    const next = { term: termAt[k], quote: quoteAt[k], variant: variantAt[k] };
    if (next.term !== cur.term || next.quote !== cur.quote || next.variant !== cur.variant) {
      flush();
      cur = next;
    }
    buf += plain[k];
  }
  flush();
  return pieces;
}
