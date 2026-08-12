#!/usr/bin/env python3
"""从南国佛教流通站(n12345.com)下载净空法师《修华严奥旨妄尽还源观》讲记。

- 一讲 档名 12-046(2008,香港,36 集):amtb-12-046-0001.html … 0036.html
- 二讲 档名 12-047(2008-11-14~2009-09-19,108 集):amtb-12-047-0001.html … 0108.html

输出 data/sources/jingkong/<档名>/<NNN>.txt(UTF-8 纯文本,含元信息头),
以及索引 data/sources/jingkong/index.json。

可重复运行:已存在且非空的集数文件跳过(断点续传)。
礼貌抓取:每请求间隔 1 秒,失败重试 2 次。
"""
import html
import json
import re
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "sources" / "jingkong"
INDEX_FILE = OUT_DIR / "index.json"
FAILED_FILE = OUT_DIR / "failures.txt"

URL_TMPL = "http://www.n12345.com/amtb-{dang}-{num:04d}.html"
SERIES = [("12-046", 36), ("12-047", 108)]

DELAY = 1.0          # 请求间隔(秒)
RETRIES = 2          # 失败重试次数
TIMEOUT = 30

CONTENT_RE = re.compile(r'<div class=content-b>(.*?)</div></div>', re.S)
TAG_RE = re.compile(r"<[^>]+>")
DATE_RE = re.compile(r"\d{4}/\d{1,2}/\d{1,2}")


def decode(raw: bytes) -> str:
    """n12345 页面实际为 UTF-8(带 BOM),个别页可能是 GBK,做双路兜底。"""
    for enc in ("utf-8-sig", "gb18030"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def extract_body(text: str) -> str:
    """取 <div class=content-b> 正文:<br> 转段落换行,去其余标签,反转义实体。"""
    m = CONTENT_RE.search(text)
    if not m:
        return ""
    body = m.group(1)
    body = re.sub(r"<br\s*/?>", "\n", body)
    body = TAG_RE.sub("", body)
    body = html.unescape(body)
    lines = [ln.strip() for ln in body.split("\n")]
    # 压缩连续空行
    out, blank = [], False
    for ln in lines:
        if ln:
            out.append(ln)
            blank = False
        elif not blank:
            out.append("")
            blank = True
    return "\n".join(out).strip("\n")


def parse_meta(first_line: str):
    """从正文首行(如 '修华严奥旨妄尽还源观　　（第一集）　　2008/5/16　　香港佛陀教育协会　　档名：12-046-0001')
    提取日期与地点。取不到则返回 None。"""
    date = None
    m = DATE_RE.search(first_line)
    if m:
        date = m.group(0)
    location = None
    if m:
        tail = first_line[m.end():]
        tail = re.split(r"档名", tail)[0]
        tail = tail.strip("　 \t")
        if tail:
            location = tail
    return date, location


def fetch(url: str) -> bytes:
    """带重试的下载,返回原始字节;彻底失败抛异常。"""
    last = None
    for attempt in range(RETRIES + 1):
        try:
            r = requests.get(url, timeout=TIMEOUT,
                             headers={"User-Agent": "Mozilla/5.0 (text archive)"})
            r.raise_for_status()
            return r.content
        except requests.RequestException as e:
            last = e
            print(f"    第 {attempt + 1} 次尝试失败: {e}", flush=True)
            time.sleep(DELAY)
    raise last


def count_chars(body: str) -> int:
    return len(re.sub(r"\s", "", body))


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    entries = []
    failures = []

    for dang, total in SERIES:
        (OUT_DIR / dang).mkdir(parents=True, exist_ok=True)
        for num in range(1, total + 1):
            ep = f"{num:03d}"
            path = OUT_DIR / dang / f"{ep}.txt"
            url = URL_TMPL.format(dang=dang, num=num)
            ok = True

            if path.exists() and path.stat().st_size > 0:
                text = path.read_text(encoding="utf-8")
                body = text.split("\n\n", 1)[-1]
                chars = count_chars(body)
                print(f"[跳过] {dang}-{ep} (已存在, {chars} 字)", flush=True)
            else:
                print(f"[下载] {url}", flush=True)
                try:
                    raw = fetch(url)
                    page = decode(raw)
                    body = extract_body(page)
                    if not body:
                        raise ValueError("正文提取为空")
                    first_line = body.split("\n", 1)[0]
                    date, location = parse_meta(first_line)

                    header = [f"档名: {dang}", f"集数: {ep}", f"来源: {url}"]
                    if date:
                        header.append(f"日期: {date}")
                    if location:
                        header.append(f"地点: {location}")
                    text = "\n".join(header) + "\n\n" + body + "\n"
                    path.write_text(text, encoding="utf-8")
                    chars = count_chars(body)
                    print(f"    完成, {chars} 字"
                          + (f", 日期 {date}" if date else "")
                          + (f", 地点 {location}" if location else ""), flush=True)
                    time.sleep(DELAY)
                except Exception as e:
                    ok = False
                    chars = 0
                    failures.append((dang, ep, url, str(e)))
                    print(f"    失败: {e}", flush=True)

            entries.append({
                "dang": dang,
                "episode": ep,
                "file": f"{dang}/{ep}.txt",
                "chars": chars,
                "ok": ok,
            })

    done = [e for e in entries if e["ok"]]
    index = {
        "source": "http://www.n12345.com/",
        "title": "净空法师《修华严奥旨妄尽还源观》讲记",
        "entries": entries,
        "totals": {
            "episodes": len(entries),
            "ok": len(done),
            "failed": len(entries) - len(done),
            "chars": sum(e["chars"] for e in done),
            "avg_chars": round(sum(e["chars"] for e in done) / len(done)) if done else 0,
        },
    }
    INDEX_FILE.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n",
                          encoding="utf-8")

    if failures:
        FAILED_FILE.write_text(
            "\n".join(f"{d}-{e} {u} {err}" for d, e, u, err in failures) + "\n",
            encoding="utf-8")
    elif FAILED_FILE.exists():
        FAILED_FILE.unlink()

    print(f"\n合计 {len(entries)} 集,成功 {len(done)},失败 {len(failures)}")
    if failures:
        print("失败清单:")
        for d, e, u, err in failures:
            print(f"  {d}-{e} {u} {err}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
