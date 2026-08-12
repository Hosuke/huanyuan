#!/usr/bin/env python3
"""将 fulltext.txt 按「一体二用三遍四德五止六观」结构切分为 segments.json。

切分依据：每段的起始标志串（start marker），段与段首尾相接。
每段记录大正藏行号范围（start_lb / end_lb），text 内保留 【行号】 锚点，
供网页渲染为可溯源的行号侧标。
"""
import json
import re

SRC = "data/original/fulltext.txt"
OUT = "data/original/segments.json"

# (id, 所属门, 标题, 起始标志串)；end 由下一个 marker 决定
SEGMENTS = [
    ("0.0", 0, "題目與署款", "修華嚴奧旨妄盡還源觀"),
    ("0.1", 0, "序分", "夫滿教難思"),
    ("0.2", 0, "總列六門", "今略明此觀"),
    ("1.0", 1, "顯一體：自性清淨圓明體", "一顯一體者"),
    ("2.1", 2, "二用・海印森羅常住用", "自下依體起二用者"),
    ("2.2", 2, "二用・法界圓明自在用", "二者、法界圓明自在用"),
    ("3.1", 3, "三遍・一塵普周法界遍", "三示三遍者"),
    ("3.2", 3, "三遍・一塵出生無盡遍", "二者、一塵出生無盡遍"),
    ("3.3", 3, "三遍・一塵含容空有遍", "三者、一塵含容空有遍"),
    ("4.1", 4, "四德・隨緣妙用無方德", "自下依此能遍之境而行四德"),
    ("4.2", 4, "四德・威儀住持有則德", "二者、威儀住持有則德"),
    ("4.3", 4, "四德・柔和質直攝生德", "三者、柔和質直攝生德"),
    ("4.4", 4, "四德・普代眾生受苦德", "四者、普代眾生受苦德"),
    ("5.0", 5, "五止・總釋入義", "自下攝用歸體入五止門"),
    ("5.1", 5, "五止・照法清虛離緣止", "一者、照法清虛離緣止"),
    ("5.2", 5, "五止・觀人寂怕絕欲止", "二者、觀人寂怕絕欲止"),
    ("5.3", 5, "五止・性起繁興法爾止", "三者、性起繁興法爾止"),
    ("5.4", 5, "五止・定光顯現無念止", "四者、定光顯現無念止"),
    ("5.5", 5, "五止・理事玄通非相止", "五者、理事玄通非相止"),
    ("6.0", 6, "六觀・止觀問答", "自下依止起觀"),
    ("6.1", 6, "六觀・攝境歸心真空觀", "六起六觀者"),
    ("6.2", 6, "六觀・從心現境妙有觀", "二者、從心現境妙有觀"),
    ("6.3", 6, "六觀・心境祕密圓融觀", "三者、心境祕密圓融觀"),
    ("6.4", 6, "六觀・智身影現眾緣觀", "四者、智身影現眾緣觀"),
    ("6.5", 6, "六觀・多身入一鏡像觀", "五者、多身入一鏡像觀"),
    ("6.6", 6, "六觀・主伴互現帝網觀", "六者、主伴互現帝網觀"),
    ("6.7", 6, "結會諸門", "然此觀門名目無定"),
    ("7.0", 7, "結頌", "頌曰："),
    ("8.0", 8, "宋淨源後序", "宋晉水沙門淨源述"),
]

PART_NAMES = {
    0: "卷首", 1: "一顯一體", 2: "二起二用", 3: "三示三遍",
    4: "四行四德", 5: "五入五止", 6: "六起六觀", 7: "結頌", 8: "附錄",
}


def load_stream(path):
    """读 fulltext.txt，返回 (连续文本, 每字符对应的大正藏行号)。"""
    chars, lbs = [], []
    cur_lb = None
    for line in open(path, encoding="utf-8"):
        m = re.match(r"^【(\w+)】(.*)$", line.rstrip("\n"))
        if not m:
            continue
        cur_lb, body = m.group(1), m.group(2)
        if body in ("", "No.1876"):
            continue
        for ch in body:
            chars.append(ch)
            lbs.append(cur_lb)
    return "".join(chars), lbs


def main():
    text, lbs = load_stream(SRC)
    segs = []
    pos = []
    for sid, part, title, marker in SEGMENTS:
        i = text.find(marker)
        assert i >= 0, f"marker not found: {sid} {marker}"
        pos.append(i)
    pos.append(len(text))
    for k, (sid, part, title, marker) in enumerate(SEGMENTS):
        a, b = pos[k], pos[k + 1]
        body = text[a:b]
        # 在文本中重新插入行号锚点
        out, last = [], None
        for j in range(a, b):
            if lbs[j] != last:
                out.append(f"【{lbs[j]}】")
                last = lbs[j]
            out.append(text[j])
        segs.append({
            "id": sid,
            "part": part,
            "part_name": PART_NAMES[part],
            "title": title,
            "start_lb": lbs[a],
            "end_lb": lbs[b - 1],
            "text": "".join(out),
            "translation": "",
            "commentaries": {
                "tifo": {"status": "pending", "episodes": [], "notes": ""},
                "jingkong": {"status": "pending", "episodes": [], "notes": ""},
                "mengcan": {"status": "pending", "episodes": [], "notes": ""},
            },
            "quotes": [],
            "terms": [],
        })
    doc = {
        "sutra": "修華嚴奧旨妄盡還源觀",
        "cbeta": "T45n1876",
        "author": "唐大薦福寺翻經沙門法藏述",
        "source": "CBETA XML P5 (cbeta-org/xml-p5, master)",
        "parts": [{"part": p, "name": n} for p, n in PART_NAMES.items()],
        "segments": segs,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    total = sum(len(s["text"]) for s in segs)
    print(f"OK {len(segs)} segments, {total} chars -> {OUT}")
    for s in segs:
        print(f'  {s["id"]:>4}  {s["start_lb"]}-{s["end_lb"]}  {s["title"]}')


if __name__ == "__main__":
    main()
