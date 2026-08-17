#!/usr/bin/env python3
"""将 data/original/translations.json 合并进 segments.json 的 translation 字段。"""
import json

SEG = "data/original/segments.json"
TRANSLATIONS = "data/original/translations.json"


def main():
    doc = json.load(open(SEG, encoding="utf-8"))
    translations = json.load(open(TRANSLATIONS, encoding="utf-8"))["translations"]
    by_id = {s["id"]: s for s in doc["segments"]}
    unknown = sorted(set(translations) - set(by_id))
    if unknown:
        raise SystemExit(f'unknown segment ids: {", ".join(unknown)}')
    for sid, translation in translations.items():
        by_id[sid]["translation"] = translation
    with open(SEG, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    print(f"merged {len(translations)} translations")


if __name__ == "__main__":
    main()
