#!/usr/bin/env python3
"""将 data/jingkong/summaries/*.json 合并进 segments.json 的 commentaries.jingkong。

notes 排版：总述 + 要点列表（每条带集号标签）+ caveats（若有）。
"""
import json
import glob

SEG = "data/original/segments.json"


def fmt_notes(s):
    lines = [s["summary"], ""]
    for p in s["points"]:
        lines.append(f'· {p["text"]}【{p["source"]}】')
    if s.get("caveats"):
        lines += ["", f'（整理说明：{s["caveats"]}）']
    return "\n".join(lines)


def main():
    doc = json.load(open(SEG, encoding="utf-8"))
    by_id = {s["id"]: s for s in doc["segments"]}
    n = 0
    for f in glob.glob("data/jingkong/summaries/*.json"):
        s = json.load(open(f, encoding="utf-8"))
        seg = by_id[s["segment"]]
        seg["commentaries"]["jingkong"] = {
            "status": "ready",
            "episodes": s["episodes"],
            "notes": fmt_notes(s),
        }
        n += 1
    with open(SEG, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    print(f"merged {n} segments")


if __name__ == "__main__":
    main()
