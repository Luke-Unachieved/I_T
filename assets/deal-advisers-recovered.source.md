# 工作室搭档四人肖像

来源为项目既有的 Library 图像《工作室搭档-像在聊生意.jpg》。其创建记录是 2026-11-18 21:26:04 UTC，元数据标记为模型生成。前次开发记录中 21:26 的预览与 21:33 的确认对应这版姓名和形象。原始单人生成文件和完整提示词未随本图提供。此说明只记录来源与裁切，真人发布审图待办。

| 项目文件 | 像素 | 字节 | SHA-256 |
| --- | --- | ---: | --- |
| `assets/deal-advisers-recovered.source.jpg` | 1088 × 408 | 76,786 | `abce0a9e5a47d2ec46e99e6ba1d131da8431bc7173bf640329b307f1a87a58a8` |
| `assets/deal-advisers-recovered.webp` | 1088 × 309 | 131,024 | `ab41d49135438452d71fed7e13079592bf4ac3f95f2142946189d2e7ad44585f` |

JPEG 原稿与取回文件逐字节相同。WebP 保留原稿 y=0 至 308 的肖像区，底部姓名与性格文字在游戏中可由界面单独显示。四列各宽 272 像素，各自带原稿的浅色背景。肖像区没有办公室场景。原稿下方标注与前次定稿记录一致，排列如下。

| 从左到右 | 原稿人物 | 标注 | 肖像左缘 x |
| ---: | --- | --- | ---: |
| 1 | 方文斌 | 稳重直言 | 0 |
| 2 | 梁佳音 | 细致风趣 | 272 |
| 3 | 陶乐 | 随和善解 | 544 |
| 4 | 许明珊 | 利落从容 | 816 |

裁切使用 ImageMagick 7.1.1-43，编码使用 FFmpeg 7.1.5 的 libwebp。解码后按 RGB 比较，WebP 与 JPEG 对应区域的所有像素完全一致。

```sh
magick assets/deal-advisers-recovered.source.jpg -crop 1088x309+0+0 +repage -depth 8 ppm:- |
  ffmpeg -v error -f image2pipe -i pipe:0 -c:v libwebp -lossless 1 -compression_level 6 -pix_fmt bgra -f webp -y assets/deal-advisers-recovered.webp
```

使用四列图集时，单人元素宽高比为 272 / 309。背景尺寸用 `400% 100%`，四位人物的水平背景位置依次为 0%、33.333333%、66.666667%、100%。
