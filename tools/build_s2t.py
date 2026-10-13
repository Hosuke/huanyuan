#!/usr/bin/env python3
"""為站內搜尋產出「簡→繁」字表 data/original/s2t.json。

只收語料（原文、白話、講記、名相）中實際出現、且繁簡不同的字；
一個簡體字可對應多個繁體字（如 发→發/髮），前端據此組成字元類。
須在 merge_jingkong.py / merge_translations.py 之後執行。
"""
import json
from collections import defaultdict

from opencc import OpenCC

t2s = OpenCC("t2s")
seg = json.load(open("data/original/segments.json", encoding="utf-8"))
terms = json.load(open("data/dict/terms.json", encoding="utf-8"))

corpus = []
for s in seg["segments"]:
    corpus += [s["title"], s["text"], s.get("translation", "")]
    corpus += [c["notes"] for c in s["commentaries"].values()]
for t in terms:
    corpus += [t["term"], t["def"]]

table = defaultdict(set)
for ch in set("".join(corpus)):
    simp = t2s.convert(ch)
    if len(simp) == 1 and simp != ch:
        table[simp].add(ch)

out = {k: "".join(sorted(v)) for k, v in sorted(table.items())}
with open("data/original/s2t.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
print(f"s2t: {len(out)} entries")
