# 再开一单就下班：现代候选运行指南

当前开发方向是现代外贸工作室，围绕客户、样品、报价和实际合作展开。默认构建为开发候选，不等于游戏完整版完成或上架通过。旧正式网站仍保留，本指南不表示它已被替换。

## 运行与构建

Node.js 20+，无需安装第三方依赖：

```sh
npm start
# 打开 http://127.0.0.1:4173/deal-room.html
npm run build
npm run check
```

现代源码入口为 `deal-room.html`，主要界面/规则为 `src/deal-room-app.js`、`src/deal-room-engine.js`。本地 `npm start` 的根地址 `/` 已打开现代 `deal-room.html`；仓库 `index.html` 与既有静态托管站仍为 legacy，未自动更新，不用于现代验收。

`npm run build` 默认调用 `build:modern`，生成 `artifacts/deal-room/再开一单就下班-开发候选.html`、`版本信息.json`、`先读我.txt`。按此次清单核对内容编号、SHA256 与大小。HTML 已内联资源；构建不自动打 ZIP、不上传、不更新正式站。

## 保存与升级

在同一浏览器、同一文件位置继续。源码网页与离线单文件使用独立现代存档键，不会自动同步；旧港口与剧情进度也不会互转。更新、移动文件或清理浏览器前，先在“备份与恢复”下载 JSON；需要恢复时粘贴自己导出的完整文本，查看预览并确认。不要导入旧版数据，不通过删除浏览器存储升级。无痕或受限存储可能无法保档，应留意保存警告并先保全备份。

## 检查和 legacy

`npm run check` 保留全部历史回归并增加现代入口语法检查。`npm test` 的准备步骤同时构建现代与 legacy 测试依赖；旧产物存在不代表应把它当作现代交付。

历史构建命令为 `build:legacy`、`build:legacy:data`、`build:legacy:classic`；`build:data`、`build:classic` 只作兼容别名。旧 `artifacts/data-v2/` 与剧情产物不是本次默认现代包，不删除或混发。

## 现代美术交付检查

`npm run check:release-art` 检查现代工作室的 WebP 清单，不是旧剧情的 46 张角色/场景图。它只读核对清单中的实际模块引用、图片容器、字节数、SHA-256，以及是否有与该版本图片绑定的人工来源复核记录。退出码 1 表示文件或清单不一致，2 表示文件匹配但还有待人工核对的图片；两者都不应当作美术已验收。缺少记录不等于未经许可。完整游戏、画面实看与商店要求另行验收。

开发中只想核对文件完整性，用 `npm run check:modern-art-integrity`；该命令通过不表示可以销售。旧版原有检查保留为 `npm run check:legacy-art`。清单位于 `docs/rework/MODERN_ASSET_PROVENANCE.json`。若将来人工已核实某文件，可在该项的 `releaseReview` 记录 `status: "recorded"`、`assetSha256`、项目内非敏感依据摘要路径 `record`（`docs/rework/art-evidence/` 下的 .md 或 .json）及该摘要的 `recordSha256`；仅凭自动哈希或口头断言不会生成复核记录。不要提交账号资料或私人原始凭据。

## 发布边界

现代候选暂不替换原 `index.html`、正式站或旧存档。需要部署时另核目标地址、构建身份和发布授权，不把源码、测试档或旧包一并上传。本指南不声称 Windows 离线、全部设备或整段体验已验收，不声称应用商店已提交/审核通过。

静态网页不等于 APK、iOS 应用或小程序。正式发行前须明确目标平台并核对素材权利、隐私、分级和 AI 辅助制作披露。真人趣味与长期留存不能由自动测试证明；国内无需 VPN 访问不作保证。仓库公开不自动授予商业再分发许可。

## 本机候选 ZIP
在专用 `E:\DevWork\TradeGame\source` 布局内可运行 `scripts/build-windows-release.ps1`，产物写入主目录 `build`，日志写入 `logs`，不改变全局缓存。它生成三文件候选目录及 ZIP，并校验 manifest 和压缩条目的完整字节。此命令不会打开游戏或发布网站；候选 ZIP 仍须完成实际设备与内容验收，不能仅因能打包就当正式版销售。

这个交接命令只接受指定开发分支的干净工作树，且本地提交必须与 GitHub 分支头一致。实际用到的游戏脚本、样式和贴图直接从该提交读取。包内版本信息的 `sourceCommit` 是完整提交号，同名 ZIP 旁的 `.handoff.json` 列出该提交、ZIP/HTML 的 SHA-256 和字节数，不改变三文件交付结构。离线开发预览仍可使用 `npm run build`，其结果不能当作已推送版本。

集中试玩时，从 GitHub 签出交接单中的精确提交（不是会继续移动的分支头），构建后先核对 HTML 哈希。ZIP 重新压缩时文件时间可能改变，跨机器比对构建内容应认 HTML 哈希；ZIP 哈希用于核对同一份压缩包。不要从云端反推游戏源码或上传本机候选。
