# 修華嚴奧旨妄盡還源觀・互動課本

以華嚴宗《修華嚴奧旨妄盡還源觀》（CBETA T45n1876，唐・法藏述）原文為骨架，輔以白話、諸法師講記摘要與名相詞典的學習用靜態網站。

## 目錄結構

```
data/
  original/          # 資料管線產出的分段原文
    segments.json    #   29 段原文（含大正藏行號錨點、講記佔位）
  dict/
    terms.json       # 名相詞條（id/term/pinyin/def/refs）
  jingkong/summaries # 淨空法師講記摘要（逐段 JSON）
  tifo/summaries     # 體佛法師講義摘要（逐段 JSON；講義 OCR 原文存本機 data/sources/tifo/，不入庫）
  source/            # CBETA XML 原始來源（資料管線輸入）
tools/
  extract_cbeta.py   # 從 CBETA XML 抽取原文
  build_segments.py  # 依六門結構分段建模，產出 segments.json
src/
  layouts/Base.astro
  components/        # Mandala（六門法界圖）、AnnotatedText（原文就地標注名相／徵引／校勘）
  pages/             # /、/read/[id]、/full（通讀）、/dict、/collation、/about、/search.json（搜尋索引）
  scripts/           # site（設定、搜尋、快捷鍵）、reader（閱讀頁互動）、store（本機儲存）、filter
  lib/data.ts        # JSON 載入、六門總綱、行號與分段工具
  lib/annotate.ts    # 原文切片標注
```

## 資料管線

原文更新或重跑分段時：

```bash
python3 tools/extract_cbeta.py && python3 tools/build_segments.py && python3 tools/merge_jingkong.py && python3 tools/merge_translations.py && .venv/bin/python tools/build_s2t.py
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
- 本機儲存（localStorage）：`wjhy-read` 已讀、`wjhy-last` 上次閱讀、`wjhy-tab` 講記頁籤、`wjhy-prefs` 閱讀偏好（主題、字號、直排、行號、白話並列）。
- 原文中的【0637a06】行號錨點渲染為行內小字；名相（綠虛線）、徵引（赭底）、校勘（朱圈點）就地標注，點擊浮出註卡，與右側旁註雙向聯動。
- 搜尋索引 `/search.json` 構建期產出、首次開啟搜尋才載入；`merge_jingkong.py` 同時合併淨空、體佛兩家摘要，`build_s2t.py` 產出簡→繁字表供搜尋。
- 快捷鍵：`/` 或 ⌘K 搜尋，`←` `→` 上下段，`Esc` 關閉。

## 正本網址（2026-10-14 起）

正本在 **https://taixu.ink/huanyuan/**（太虛間 R2＋Worker 供網）；GitHub Pages（hosuke.github.io/huanyuan）為鏡，各頁 canonical 皆指太虛間。

部署至太虛間：

```bash
npm run build
T=$(mktemp -d) && cp -R dist "$T/huanyuan"
~/Developer/Buddha/Github/siwen/.venv/bin/python ~/Developer/Buddha/Github/siwen/scripts/r2_sync.py "$T" taixu-site
```

只增不刪；回退則於 R2 刪 `huanyuan/` 前綴之物件即可，不及太虛間他檔。
