#!/usr/bin/env python3
"""CBETA 本与维基文库本对校，输出 data/original/collation.json。

方法：
- CBETA 繁体 → opencc t2s 转简体后与维基文库本比较（t2s 为多对一映射，不漏异文）
- 双方去除标点、行号、构字式括号后逐字对齐（difflib）
- 差异处记录 CBETA 行号、上下文、两本文字
"""
import json
import re
import difflib
from opencc import OpenCC

cc = OpenCC("t2s")

PUNCT = "。，、；：？！「」『』（）()〈〉《》…—　 \n\t"

# 人工审定：異體字（两本皆通）vs 底本勝（维基文库本误）
VARIANT_RULINGS = {
    "遍/偏": ("底本勝", "三遍之名「含容空有遍」，维基作「偏」形讹"),
    "今/令": ("底本勝", "「今則託事表彰」，维基作「令」形讹"),
    "不/大": ("底本勝", "「不壞假名而常度眾生」为通行语，维基作「大壞」误"),
    "含/舍": ("底本勝", "「無不俱含真性」，维基作「舍」形讹"),
    "祇/只": ("底本勝", "「祇桓」即祇園（祇陀林），维基作「只」误"),
    "隥/蹬": ("異體字", "梯隥，阶梯义，两通"),
}


def cbeta_stream(path="data/original/fulltext.txt"):
    chars, lbs = [], []
    for line in open(path, encoding="utf-8"):
        m = re.match(r"^【(\w+)】(.*)$", line.rstrip("\n"))
        if not m:
            continue
        lb, body = m.group(1), m.group(2)
        if body in ("", "No.1876"):
            continue
        for ch in body:
            chars.append(ch)
            lbs.append(lb)
    return chars, lbs


def clean_cbeta(chars, lbs):
    out, out_lbs = [], []
    skip = 0
    for i, ch in enumerate(chars):
        if skip:
            skip -= 1
            continue
        if ch == "〔":  # 构字式，整段跳过
            j = i
            while j < len(chars) and chars[j] != "〕":
                j += 1
            skip = j - i
            continue
        s = cc.convert(ch)
        if len(s) == 1 and s not in PUNCT and not s.isascii():
            out.append(s)
            out_lbs.append(lbs[i])
    return out, out_lbs


def clean_ws(path="data/source/wikisource.txt"):
    raw = open(path, encoding="utf-8").read()
    raw = raw.split("{{")[0]  # 去掉模板尾部
    raw = re.sub(r"\[[^\]]{1,12}\]", "", raw)  # 构字式如 [糸　　丐]
    out = []
    started = False
    for ch in raw:
        if not started:
            if ch == "夫":  # 正文从「夫满教难思」起，跳过卷首题署
                started = True
            else:
                continue
        if ch not in PUNCT and not ch.isascii():
            out.append(ch)
    return out


def main():
    cb_chars, cb_lbs = cbeta_stream()
    a, a_lbs = clean_cbeta(cb_chars, cb_lbs)
    # 维基文库从「夫满教难思」起；CBETA 侧也从那里起对齐
    joined = "".join(a)
    start = joined.find("夫满教难思")
    a, a_lbs = a[start:], a_lbs[start:]
    b = clean_ws()
    sm = difflib.SequenceMatcher(a="".join(a), b="".join(b), autojunk=False)
    variants = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        ctx = "".join(a[max(0, i1 - 6):i2 + 6])
        key = f"{''.join(a[i1:i2])}/{''.join(b[j1:j2])}"
        ruling, note = VARIANT_RULINGS.get(key, ("異體字", ""))
        variants.append({
            "lb": a_lbs[i1] if i1 < len(a_lbs) else "?",
            "type": {"replace": "異文", "delete": "CBETA多出", "insert": "维基多出"}[tag],
            "cbeta": "".join(a[i1:i2]),
            "wikisource": "".join(b[j1:j2]),
            "context": ctx,
            "ruling": ruling,
            "note": note,
        })
    with open("data/original/collation.json", "w", encoding="utf-8") as f:
        json.dump({
            "meta": {
                "base": "CBETA T45n1876 (底本)",
                "compare": "维基文库《修華嚴奧旨妄盡還源觀》（简体、有句读）",
                "url": "https://zh.wikisource.org/wiki/修華嚴奧旨妄盡還源觀",
                "method": "opencc t2s 后逐字对齐，标点不参校",
            },
            "stats": {"cbeta_chars": len(a), "wikisource_chars": len(b), "variants": len(variants)},
            "variants": variants,
        }, f, ensure_ascii=False, indent=1)
    print(f"OK cbeta={len(a)} ws={len(b)} variants={len(variants)}")
    for v in variants:
        print(f'  {v["lb"]}  {v["type"]}: CBETA「{v["cbeta"]}」/ 维基「{v["wikisource"]}」 …{v["context"]}…')


if __name__ == "__main__":
    main()
