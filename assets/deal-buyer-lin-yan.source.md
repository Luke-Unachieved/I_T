# 林妍 · 四邻百货联采

2026-11-19，为本次本地恢复候选重新绘制。输入是“林妍，四邻百货联采采购负责人”的文字设定。本次开发助手编写了 `assets/deal-buyer-lin-yan.source.svg` 的全部轮廓与色块。源稿在 256 × 256 坐标系分层画出收货间、工装夹克、发髻、面颈、鬓发、细框眼镜。构图与五官为这名虚构角色单独设计。全部元素由 SVG 图元表达，无嵌入照片、外部纹理、字体或网络资源。

| 文件 | 尺寸 | SHA-256 |
| --- | --- | --- |
| 可编辑源稿 `assets/deal-buyer-lin-yan.source.svg` | 384 × 384 | `63f5430f03e2b64f4ca8e1bf8d2c50bc9a5d93414f2a6c49247cd0cfaf5571b5` |
| 游戏头像 `assets/deal-buyer-lin-yan.webp` | 384 × 384，10772 字节 | `fc25d28b6fca8ed0048f6ffc652c11059372269cd70546f618b72d1ab31bda88` |

导出使用 sharp 0.35.5、librsvg 2.63.2、libwebp 1.6.0，以源稿固有尺寸渲染，WebP 质量 88、effort 6。保留默认色彩处理。下列命令在项目根目录计算导出摘要，无需改写运行文件。

```sh
node -e 'const sharp = require("sharp"); sharp("assets/deal-buyer-lin-yan.source.svg").webp({quality:88,effort:6}).toBuffer().then(b => console.log(require("node:crypto").createHash("sha256").update(b).digest("hex")))'
```

本次另有一张文字生成的短发、赭色上衣头像草案。草案没有写入项目，未作为上述分层源稿的描图底稿。制作记录只对应表中两个文件。人工权利和发行审阅待人工办理。
