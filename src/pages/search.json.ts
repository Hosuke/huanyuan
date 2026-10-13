import type { APIRoute } from 'astro';
import s2t from '../../data/original/s2t.json';
import { commentaryMeta, plainText, segments, terms } from '../lib/data';

/** 站內搜尋索引：構建期產出，搜尋框首次開啟時才載入。 */
export const GET: APIRoute = () => {
  const docs = [
    ...segments.flatMap((seg) => [
      { k: '原文', id: seg.id, t: seg.title, p: seg.part_name, x: plainText(seg), h: `read/${seg.id}` },
      ...(seg.translation
        ? [{ k: '白話', id: seg.id, t: seg.title, p: seg.part_name, x: seg.translation, h: `read/${seg.id}#baihua` }]
        : []),
      ...commentaryMeta
        .filter(({ key }) => seg.commentaries[key].status !== 'pending' && seg.commentaries[key].notes)
        .map(({ key, label }) => ({
          k: label,
          id: seg.id,
          t: seg.title,
          p: seg.part_name,
          x: seg.commentaries[key].notes.replace(/【[^【】]+】/g, ''),
          h: `read/${seg.id}#${key}`,
        })),
    ]),
    ...terms.map((term) => ({ k: '名相', id: term.id, t: term.term, p: term.pinyin, x: term.def, h: `dict#${term.id}` })),
  ];
  return new Response(JSON.stringify({ s2t, docs }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
