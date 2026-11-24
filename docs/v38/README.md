# V38 周经营版

在仓库根目录运行 `python3 -m http.server 4173 --bind 127.0.0.1`，再打开 <http://127.0.0.1:4173/>。也可用 `npm start`。游戏是静态 ES modules，无需安装依赖或构建。

- `index.html` 是 V38 默认入口，新增逻辑位于 `v38/`。
- `classic.html` 和 `deal-room.html` 打开 V37；`legacy-game.html` 打开更早的经营版。
- V38 进度在当前页面内有效，刷新或关页会重新开局。
- `npm run check` 运行 Node 功能检查。浏览器验证独立记录在各期交接说明。

开发分支从 V37 发布提交 `1079cfa` 建立。原有 `src/`、`assets/` 以及两套经典版入口使用的存档键原样保留。GitHub Pages 上线由仓库主人另行决定。

验收记录：[第一期：国内周经营](01-weekly-trade.md)、[第二期：扩张与贸易风险](02-growth.md)、[第三期：长期经营与上市](03-long-run.md)、[玩家试玩缺陷修复](04-playtest-fixes.md)。
