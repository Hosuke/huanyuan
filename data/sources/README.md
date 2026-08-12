# data/sources 资料来源与授权说明

## CBETA XML（data/source/*.xml）

来源：[cbeta-org/xml-p5](https://github.com/cbeta-org/xml-p5)（master，2026-08-12 取）。
CBETA 授权：保留文件头完整可非商业使用（"Available for non-commercial use when distributed with this header intact."）。请勿剥离 XML 文件头。

| 文件 | 典籍 | 用途 |
|---|---|---|
| T45n1876.xml | 唐·法藏《修華嚴奧旨妄盡還源觀》 | 本站底本 |
| X58n0993.xml | 宋·净源《華嚴還源觀科》 | 科判（结构大纲） |
| X58n0994.xml | 宋·净源《華嚴妄盡還源觀疏鈔補解》 | 古典翼注疏 |
| X09n0243.xml | 唐·宗密《圓覺經大疏》 | 宗密对读专栏 |
| T48n2015.xml | 唐·宗密《禪源諸詮集都序》 | 宗密对读专栏 |
| T45n1886.xml | 唐·宗密《華嚴原人論》 | 宗密对读专栏 |

注：《圓覺經略疏》(X09n0247) 未见于 CBETA xml-p5（X09 卷缺 0247），略疏内容可参大疏。

## 维基文库（data/source/wikisource.txt）

《修華嚴奧旨妄盡還源觀》简体句读本，CC BY-SA。仅作参校本与句读参考，不作底本（对校见其本 5 处形讹，见 data/original/collation.json）。

## 提取产物

- `data/jingyuan/` — 净源《還源觀科》《疏鈔補解》纯文本（tools/extract_cbeta.py 生成，可重现）
- `data/zongmi/` — 宗密三书纯文本（同上）
- `data/sources/jingkong/` — 净空法师讲记（见该目录 README，半官方授权流通，引用须注明档名集数）
