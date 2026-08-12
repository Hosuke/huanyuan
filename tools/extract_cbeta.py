#!/usr/bin/env python3
"""从 CBETA TEI XML 提取《修华严奥旨妄尽还源观》(T45n1876) 正文。

输出 data/original/fulltext.txt：
- 每行对应大正藏一行（lb），前缀行号标记如 【0637a03】，便于溯源引用
- 采用 <lem>（校勘定本），忽略 <note>/<anchor> 等校勘注记
"""
import re
import sys
from lxml import etree

NS = {
    "tei": "http://www.tei-c.org/ns/1.0",
    "cb": "http://www.cbeta.org/ns/1.0",
}
SRC = "data/source/T45n1876.xml"
OUT = "data/original/fulltext.txt"

SKIP_TAGS = {"note", "app", "rdg", "witDetail", "anchor", "milestone", "figue", "figure"}


def build_glyphs(root):
    """解析 teiHeader 里的 charDecl，建立 CB 编号 -> 构字式 的映射。"""
    glyphs = {}
    for char in root.findall(".//tei:charDecl/tei:char", NS):
        cid = char.get("{http://www.w3.org/XML/1998/namespace}id")
        comp = char.find(".//tei:charProp[tei:localName='composition']/tei:value", NS)
        if cid and comp is not None and comp.text:
            glyphs[cid] = comp.text
    return glyphs


def collect(elem, buf, glyphs):
    """递归收集文本，跳过校勘注记，lb 处换行并插行号。tail 一律由父级循环负责。"""
    tag = etree.QName(elem).localname if isinstance(elem.tag, str) else ""
    if tag in SKIP_TAGS:
        return
    if tag == "lem":
        # 校勘定本：取 lem 文本
        if elem.text:
            buf.append(elem.text)
        for child in elem:
            collect(child, buf, glyphs)
            if child.tail:
                buf.append(child.tail)
        return
    if tag == "lb":
        buf.append(f"\n【{elem.get('n')}】")
        return
    if tag == "g":
        ref = (elem.get("ref") or "").lstrip("#")
        comp = glyphs.get(ref, ref)
        # 已考证构字式 → 通行字（0638c01 曦，维基文库本佐证）
        buf.append({"[日*義]": "曦"}.get(comp, f"〔{comp}〕"))
        return
    if elem.text:
        buf.append(elem.text)
    for child in elem:
        collect(child, buf, glyphs)
        if child.tail:
            buf.append(child.tail)


def main():
    tree = etree.parse(SRC)
    root = tree.getroot()
    body = root.find(".//tei:text/tei:body", NS)
    buf = []
    collect(body, buf, build_glyphs(root))
    text = "".join(buf)
    # 清理：合并空行、去首尾空白
    lines = [re.sub(r"\s+", "", ln) for ln in text.split("\n")]
    lines = [ln for ln in lines if ln and ln not in ("", None)]
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"OK {len(lines)} lines -> {OUT}")


if __name__ == "__main__":
    sys.exit(main())
