#!/usr/bin/env python3
"""净空讲记 ↔ 原文 29 段 自动定位。

原理：净空法师依文解义，讲记中必引原文句。取每段的 8 字锚点串（间隔取样），
在 144 集讲记全文中检索；一集命中某段锚点 ≥2 处（或覆盖锚点比例 ≥15%）即记为
"该集讲到了该段"。

输出：
- data/jingkong/map.json       段 → 集 映射 + 每段证据强度
- data/jingkong/evidence/<段id>.txt  每段的命中上下文摘录（供摘要代理精读）
"""
import json
import re
from pathlib import Path

from opencc import OpenCC

cc = OpenCC("t2s")  # 讲记为简体，锚点转简体后检索

SEGMENTS = "data/original/segments.json"
JK_DIR = Path("data/sources/jingkong")
OUT_MAP = "data/jingkong/map.json"
OUT_EVID = Path("data/jingkong/evidence")

PUNCT = "，。；：？！、「」『』（）《》〈〉…—〔〕· "


def clean(s):
    return "".join(ch for ch in s if ch not in PUNCT)


TITLE_S = cc.convert("修華嚴奧旨妄盡還源觀")


def anchors(text, k=8, stride=6):
    t = cc.convert(clean(re.sub(r"【\w+】", "", text)))
    seen, out = set(), []
    for i in range(0, max(1, len(t) - k + 1), stride):
        a = t[i:i + k]
        if len(a) == k and a not in seen and a not in TITLE_S and TITLE_S not in a:
            seen.add(a)
            out.append(a)
    return out


def load_episodes():
    eps = []
    for dang in ("12-046", "12-047"):
        for f in sorted((JK_DIR / dang).glob("*.txt")):
            head, _, body = f.read_text(encoding="utf-8").partition("\n\n")
            # 去掉每集首行题署（含经题，会污染锚点匹配）
            lines = [ln for ln in body.splitlines()
                     if not (ln.startswith("修华严奥旨妄尽还源观") and "集）" in ln)]
            eps.append({
                "dang": dang,
                "episode": f.stem,
                "label": f"{dang}-{f.stem}",
                "text": clean("\n".join(lines)),
            })
    return eps


def main():
    segs = json.load(open(SEGMENTS, encoding="utf-8"))["segments"]
    eps = load_episodes()
    print(f"{len(segs)} segments x {len(eps)} episodes")

    seg_anchors = {s["id"]: anchors(s["text"]) for s in segs}
    # 集 → 段 命中明细
    mapping = {s["id"]: {"title": s["title"], "episodes": []} for s in segs}
    evidence = {s["id"]: [] for s in segs}

    for ep in eps:
        for sid, anchs in seg_anchors.items():
            hits = []
            for a in anchs:
                pos = ep["text"].find(a)
                if pos >= 0:
                    hits.append(pos)
            if len(hits) >= 2 or (anchs and len(hits) / len(anchs) >= 0.15):
                mapping[sid]["episodes"].append(ep["label"])
                for p in sorted(hits):
                    lo, hi = max(0, p - 150), min(len(ep["text"]), p + 250)
                    evidence[sid].append(
                        f"--- {ep['label']} 命中 …{ep['text'][lo:hi]}…"
                    )

    OUT_EVID.mkdir(parents=True, exist_ok=True)
    for sid, ev in evidence.items():
        if ev:
            (OUT_EVID / f"{sid}.txt").write_text("\n".join(ev), encoding="utf-8")

    with open(OUT_MAP, "w", encoding="utf-8") as f:
        json.dump({
            "meta": {"method": "原文8字锚点在讲记全文中检索, ≥2 处命中或覆盖率≥15%",
                     "sources": ["12-046 一讲36集", "12-047 二讲108集"]},
            "segments": mapping,
        }, f, ensure_ascii=False, indent=1)

    for sid in mapping:
        m = mapping[sid]
        n = len(m["episodes"])
        flag = "" if n else "  <<< 未定位"
        print(f'{sid:>4}  {n:>3} 集  {m["title"]}{flag}')


if __name__ == "__main__":
    main()
