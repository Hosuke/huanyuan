#!/usr/bin/env python3
"""从 segments.json 提取引文（经云/论云），生成 data/original/quotes.json 初版。

- quote 字段取云/曰后 「」内文字；无引号者取后续至句号的一段（截断 80 字）
- identified 字段留空，待人工考据具体经品卷次后回填，status 由 pending 转 identified
"""
import json
import re

SRC = "data/original/segments.json"
OUT = "data/original/quotes.json"

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
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"meta": {"note": "status=pending 者，具體經品卷次待考據回填。"}, "quotes": quotes},
                  f, ensure_ascii=False, indent=1)
    print(f"OK {len(quotes)} quotes -> {OUT}")


if __name__ == "__main__":
    main()
