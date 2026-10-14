#!/usr/bin/env python3
"""从 segments.json 提取引文（经云/论云），合并人工考据，生成 quotes.json。

- quote 字段取云/曰后 「」内文字；无引号者取后续至句号的一段（截断 80 字）
- 如有 quote_sources.json，按 id 合并人工考据；未考据条目保留 pending
"""
import json
import re
from pathlib import Path

SRC = "data/original/segments.json"
OUT = "data/original/quotes.json"
SOURCES = Path("data/original/quote_sources.json")

# 原文中《經》《論》《華嚴》《起信》等简写 → 所指典籍（依上下文）
ALIAS = {
    "經": "（指《華嚴經》，依上下文待考）",
    "華嚴": "華嚴經",
    "起信": "大乘起信論",
    "論": "（依上下文，待考）",
    "瑜伽論": "瑜伽師地論",
    "起信論": "大乘起信論",
    "雜集論": "大乘阿毘達磨雜集論",
    "寶性論": "究竟一乘寶性論",
    "維摩經": "維摩詰所說經",
    "梵網經": "梵網經",
    "四分律": "四分律",
    "入佛境界經": "入佛境界經",
    "玄談疏": "華嚴經疏玄談（澄觀）",
}

pat = re.compile(r"《([^》]+)》(云|曰|中具明斯義|中說)(：)?")


def main():
    d = json.load(open(SRC, encoding="utf-8"))
    quotes = []
    n = 0
    for s in d["segments"]:
        txt = re.sub(r"【\w+】", "", s["text"])
        for m in pat.finditer(txt):
            rest = txt[m.end():]
            q = re.match(r"「(.+?)」", rest)
            if q:
                quoted = q.group(1)
            else:
                quoted = rest[:80].split("。")[0]
            name = m.group(1)
            n += 1
            quotes.append({
                "id": f"q{n:02d}",
                "segment": s["id"],
                "cited_as": name,
                "work": ALIAS.get(name, name),
                "quote": quoted.strip("，。「」"),
                "identified": {"canon": "", "juan": "", "pin": "", "cbeta_ref": ""},
                "status": "pending",
            })
    if SOURCES.exists():
        sources = json.loads(SOURCES.read_text(encoding="utf-8"))["sources"]
        quotes_by_id = {q["id"]: q for q in quotes}
        errors = False
        for source_id, source in sources.items():
            generated = quotes_by_id.get(source_id)
            if generated is None or any(
                source.get(field) != generated[field] for field in ("segment", "quote")
            ):
                errors = True
                reason = "id not found in generated quotes" if generated is None else "segment/quote mismatch"
                expected = generated if generated is not None else {"segment": "<missing id>", "quote": "<missing id>"}
                print(
                    f"ERROR quote_sources {source_id}: {reason}; "
                    f"expected (generated) segment={expected['segment']!r}, quote={expected['quote']!r}; "
                    f"actual (source) segment={source.get('segment')!r}, quote={source.get('quote')!r}"
                )
        if errors:
            raise SystemExit(1)
        for quote in quotes:
            source = sources.get(quote["id"])
            if source is None:
                continue
            for field in ("identified", "status"):
                quote[field] = source[field]
            for field in ("note", "taixu", "taixu_hl"):
                if source.get(field):
                    quote[field] = source[field]
            if "work" in source:
                quote["work"] = source["work"]

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"meta": {"note": "status：identified＝文句可對；paraphrase＝義引、節引或綴合；unlocated＝原典未查得；general＝泛指，無具體文句。未有考據資料者保留 pending（出處待考）。"}, "quotes": quotes},
                  f, ensure_ascii=False, indent=1)
    print(f"OK {len(quotes)} quotes -> {OUT}")


if __name__ == "__main__":
    main()
