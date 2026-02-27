# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

单文件 Tampermonkey 用户脚本（`tampermonkey-nobrain-sbc.user.js`），用于在 EA Sports FC FUT 网页应用中自动求解 SBC（球员挑战赛）。完全在客户端运行，无需后端服务。脚本向 FUT 网页注入"离线求解"按钮，对用户俱乐部球员运行贪心 + 局部搜索优化算法。

## 开发与测试

无构建步骤，开发流程：
1. 在浏览器 Tampermonkey 扩展中安装脚本
2. 打开 EA FC FUT 网页应用（`https://www.ea.com/ea-sports-fc/ultimate-team/web-app/`）
3. 修改 `.user.js` 文件后在 Tampermonkey 中重新加载脚本即可测试

## 架构

整个脚本是 `tampermonkey-nobrain-sbc.user.js` 中的一个 IIFE，各功能区块以 `// ─── ... ───` 注释分隔。

### 数据层
- **价格缓存**：从 `indexedDB`（数据库 `futSBCDatabase`，对象仓库 `priceItems`）读取，与主 AI-SBC 脚本共享
- **球员获取**：使用 FUT 网页内部 API `services.Club.search()`，通过 `UTBucketedItemSearchViewModel` 分页，每批 `DEFAULT_SEARCH_BATCH_SIZE = 91` 条
- **设置读取**：从 `localStorage` 键 `sbcSolverSettings` 读取；锁定球员来自 `excludePlayers`，固定位置（brick）来自 `fixeditems`

### 求解流程（`offlineSolveSBC`）
1. 从俱乐部获取球员，从 IndexedDB 加载价格
2. 按 SBC 目标评分范围筛选球员池（找不到解时逐步扩大范围）
3. **贪心初始化**（`greedySolve`）：按位置逐槽填入最便宜的合法球员
4. **局部搜索**（`localSearch`）：两阶段
   - 阶段一：多次随机重启（`INNER_RESTARTS`）× 爬山迭代（`HILL_CLIMB_MAX_ITER = 5000`），接受改善可行性分数或降低费用的移动
   - 阶段二：系统性贪心降费——遍历所有自由槽，尝试替换为更便宜的合法球员
5. **ILS**（迭代局部搜索）：随机扰动 3 个槽后重新局部搜索，连续 15 轮无改善则停止
6. **评分降级优化**：将评分最高的球员替换为评分更低的合法替代者，进一步降低费用
7. 通过 `services.SBC.saveChallenge()` 保存阵容

### 约束检查（`checkConstraints`）
支持所有标准 SBC 约束键：`TEAM_RATING`、`CHEMISTRY_POINTS`、`ALL_PLAYERS_CHEMISTRY_POINTS`、`PLAYER_MIN/MAX/EXACT_OVR`、`PLAYER_QUALITY`、`PLAYER_LEVEL`、`PLAYER_RARITY`、`PLAYER_RARITY_GROUP`、`SAME_CLUB/LEAGUE/NATION_COUNT`、`CLUB/LEAGUE/NATION_COUNT`、`CLUB/LEAGUE/NATION_ID`。

### 化学值计算（`calcChemistry`）
还原 EA 官方公式：每名球员根据与阵型图中相邻球员的俱乐部/联赛/国籍匹配情况获得 0–3 点化学值。阵型为 11 元素位置代码数组，`brickIndices` 为不可更改的预填槽位。

### UI 注入
Hook `UTSBCSquadView.prototype.render`，在主脚本按钮（`idSolveSbcNC`）旁注入"离线求解"按钮；若主脚本按钮不存在则回退到在兑换按钮前插入。

## 关键常量

| 常量 | 值 | 用途 |
|---|---|---|
| `DEFAULT_SEARCH_BATCH_SIZE` | 91 | 俱乐部搜索分页批次大小 |
| `HILL_CLIMB_MAX_ITER` | 5000 | 每次局部搜索的最大迭代次数 |
| `ILS_NO_IMPROVE_LIMIT` | 15 | ILS 连续无改善轮数上限 |

## 调试约定

- 浏览器控制台手动调试使用 `console.dir`（不用 `console.log`）
- 脚本内部临时调试日志使用 `console.log`，提交前必须清除

## 提交规则

- 每次提交前必须同步修改脚本头部的 `@version`，版本号与 commit message 中的版本一致

## 参考代码

- **FSU**: `D:\code\AutoSBC\fsu\【FSU】EAFC FUT WEB 增强器-26.05.user.js`
- **ai-sbc**: `D:\code\AutoSBC\backend\tampermonkey-ai-sbc.user.js`

## 注意事项

- 脚本依赖 FUT 网页应用的未公开内部全局变量（`_appMain`、`services`、`UTBucketedItemSearchViewModel`、`UINotificationType` 等），EA 游戏更新后可能失效
- `feasibilityScore` 是启发式评分，统计已满足的约束数量，在找到完全可行解之前引导搜索方向
- 无价格的球员默认费用为 `15000000`（1500 万金币），作为"无穷大"哨兵值
