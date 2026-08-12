# 修華嚴奧旨妄盡還源觀・互動課本

以華嚴宗《修華嚴奧旨妄盡還源觀》（CBETA T45n1876，唐・法藏述）原文為骨架，輔以白話、諸法師講記摘要與名相詞典的學習用靜態網站。

## 目錄結構

```
data/
  original/          # 資料管線產出的分段原文
    segments.json    #   29 段原文（含大正藏行號錨點、講記佔位）
  dict/
    terms.json       # 名相詞條（id/term/pinyin/def/refs）
  source/            # CBETA XML 原始來源（資料管線輸入）
tools/
  extract_cbeta.py   # 從 CBETA XML 抽取原文
  build_segments.py  # 依六門結構分段建模，產出 segments.json
src/
  layouts/Base.astro
  components/        # OutlineTree（總綱圖）、SegmentText、ReadToggle
  pages/             # /、/read/[id]、/dict、/about
  lib/data.ts        # JSON 載入與行號、分段工具函式
```

## 資料管線

原文更新或重跑分段時：

```bash
python3 tools/extract_cbeta.py && python3 tools/build_segments.py
```

產出 `data/original/segments.json`，Astro 端以相對路徑直接 import JSON，無額外建置步驟。

## 開發與建置

```bash
npm install
npm run dev      # 本地開發
npm run build    # 產出靜態站至 dist/
npm run preview  # 預覽建置結果
```

## 技術說明

- Astro（minimal、strict TypeScript），純 `.astro` 元件 + 少量原生 `<script>`，無 UI 框架、無其他執行期依賴。
- 手寫 CSS：宣紙米白底、墨色正文、朱砂/赭石點綴，宋體字栈，繁體中文。
- 「已讀」標記存於瀏覽器 localStorage（key：`wjhy-read`），首頁總綱圖與閱讀頁共用。
- 原文中的【0637a06】行號錨點於渲染時轉為右側灰色小字（T.637a06）。
