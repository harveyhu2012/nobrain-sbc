# 分值购买功能实现计划

## 功能概述

实现自动购买某个分值的金卡球员功能，例如以1600以下的价格买85分值的金卡3张。

## 核心问题分析

### 问题1：分值球员库
- EA市场不支持按分值搜索，需要预先建立球员库
- 目标分值范围：84-91分（金卡）
- 球员库来源：虚拟球员 + 俱乐部现有球员

### 问题2：市场搜索验证
- 通过 `definitionId` 搜索球员
- 从CBR起步价开始逐步加价购买

### 问题3：界面位置
- 球员库管理：设置界面新增"分值球员库"Tab
- 购买功能：SBC界面"批购"按钮下方增加"分购"按钮

---

## 球员库设计

### 数据结构

```javascript
const ratingPlayersPool = {
    85: {
        players: [
            { definitionId: 12345, name: "Player A", rating: 85, lastBuyPrice: 1500 },
            { definitionId: 23456, name: "Player B", rating: 85, lastBuyPrice: null },
            ...
        ],
        lastUpdated: "2026-04-05T12:00:00Z"
    },
    86: { ... },
    // 84-91各分值
};
```

### IndexedDB 存储
- 数据库：`futSBCDatabase`（版本升级到3）
- ObjectStore：`ratingPlayersPool`
- KeyPath：`rating`

### 球员库来源
1. **虚拟球员**：调用 `services.Item.searchConceptItems()` 获取稀有金卡
2. **俱乐部球员**：调用 `fetchPlayers()` 获取84-91分金卡
3. **合并去重**：以 `definitionId` 为key合并

---

## 购买策略

### 起步价
- 使用 CBR 价格（`${rating}_CBR`）
- CBR 不存在时使用默认起步价

### 默认起步价配置

```javascript
const DEFAULT_START_PRICE = {
    84: 700,
    85: 900,
    86: 1100,
    87: 1400,
    88: 1800,
    89: 2300,
    90: 3000,
    91: 4500
};
```

### 上限价计算
- 默认值 = CBR + n次上浮
- 上浮规则：<1000 每次+50，≥1000 每次+100
- n = 设置中的 `maxPriceIncrements`

### 加价函数

```javascript
const incrementPrice = (price) => {
    return price < 1000 ? price + 50 : price + 100;
};
```

### 购买流程
1. 随机选择一个未拥有的球员
2. 从CBR起步价开始搜索挂牌
3. 找到挂牌就尝试购买
4. 买不到就加价重试
5. 达到上限还是买不到就换下一个球员
6. 购买成功后更新球员库 `lastBuyPrice` + 价格库

---

## 实现计划

### 第一阶段：分值球员库功能

| 序号 | 功能 | 说明 |
|------|------|------|
| 1 | IndexedDB 存储扩展 | 升级到版本3，添加 ratingPlayersPool objectStore |
| 2 | fetchAllConceptPlayers() | 并发获取稀有金卡虚拟球员，设置 searchCriteria 稀有金卡过滤 |
| 3 | refreshRatingPlayersPool() | 合并虚拟球员和俱乐部球员，按分值分组 |
| 4 | saveRatingPlayersPool() | 保存到 IndexedDB |
| 5 | loadRatingPlayersPool() | 从 IndexedDB 加载 |
| 6 | clearRatingPlayersPool() | 清空球员库 |
| 7 | i18n 文本添加 | 设置界面相关文本（约8条） |
| 8 | 设置界面 Tab | 新增"分值球员库"Tab，显示各分值人数 + 初始化/清空按钮 |
| 9 | 第一阶段测试验证 | |

### 第二阶段：购买分值球员功能（待第一阶段完成后）

| 序号 | 功能 | 说明 |
|------|------|------|
| 1 | getCBRPrice() | 获取分值最低价（用于计算上限价默认值） |
| 2 | incrementPrice() | 加价函数 |
| 3 | DEFAULT_START_PRICE | 默认起步价配置 |
| 4 | i18n 文本添加 | 购买界面相关文本（约10条） |
| 5 | CSS 样式添加 | 分购面板样式 |
| 6 | showRatingBuyPanel() | 分购面板 UI，自动检查球员库是否存在 |
| 7 | doRatingBuy() | 分购执行函数（随机选择 + 逐步加价购买） |
| 8 | 按钮注入 | "分购"按钮 |
| 9 | 第二阶段测试验证 | |

---

## i18n 文本列表

### 设置界面

| Key | 中文 | English |
|-----|------|---------|
| settings.tabRatingPool | 分值球员库 | Rating Pool |
| btn.initRatingPool | 初始化分值球员库 | Init Rating Pool |
| btn.clearRatingPool | 清空球员库 | Clear Pool |
| btn.initRatingPoolDone | 球员库初始化完成: %1人 | Pool initialized: %1 players |
| btn.clearRatingPoolDone | 球员库已清空 | Pool cleared |
| rating.poolCount | %1分: %2人 | %1 rating: %2 players |
| rating.poolNotInit | 未初始化 | Not initialized |
| rating.fetchingPool | 正在获取球员库... | Fetching player pool... |

### 购买界面

| Key | 中文 | English |
|-----|------|---------|
| btn.ratingBuy | 分购 | Rating Buy |
| rating.title | 分值购买 | Rating Buy |
| rating.selectRating | 分值选择 | Select Rating |
| rating.startPrice | 起步价(CBR) | Start Price (CBR) |
| rating.maxPrice | 上限价 | Max Price |
| rating.quantity | 购买数量 | Quantity |
| rating.poolStatus | 球员池 | Pool Status |
| rating.autoInitPool | 球员库未初始化，正在自动更新... | Pool not initialized, auto-updating... |
| rating.progress | 已购买 %1/%2 | Bought %1/%2 |
| rating.currentPlayer | 当前: %1 @ %2 | Current: %1 @ %2 |
| rating.closeToStop | 关闭窗口即停止购买 | Close to stop |

---

## UI 设计

### 设置界面

```
┌─────────────────────────────────────┐
│ ⚙ Nobrain SBC 设置                   │
├─────────────────────────────────────┤
│ [算法] [排除] [界面] [分值球员库] ← 新Tab │
│                                      │
│ 分值球员库状态:                        │
│                                      │
│ 84分: 120人 ✓                         │
│ 85分: 85人 ✓                          │
│ 86分: 45人 ✓                          │
│ ...                                  │
│                                      │
│ [初始化分值球员库]  [清空球员库]        │
└─────────────────────────────────────┘
```

### 购买界面

```
┌─────────────────────────────────────┐
│ ×  分值购买                           │
├─────────────────────────────────────┤
│ 分值选择:  [▼ 85 分]                  │
│                                      │
│ 起步价(CBR): 900                      │
│ 上限价:      [1100] ← 自动计算         │
│                                      │
│ 购买数量:  [3]                        │
│                                      │
│ 球员池: 85分共50人                     │
│                                      │
│ [开始购买]                            │
├─────────────────────────────────────┤
│ 进度: 已购买 1/3                       │
│ 当前: Player A @ 950                  │
│ 关闭窗口即停止购买                     │
└─────────────────────────────────────┘
```

---

## 技术要点

1. **84+球员都是稀有卡**：筛选 `rareflag === 1` 即可
2. **searchCriteria 设置**：设置稀有金卡过滤，减少获取数据量
3. **并发获取**：借鉴 ai-sbc 的并发分批获取逻辑
4. **球员库与价格库独立**：购买不依赖价格缓存，实时获取市场价格
5. **避免重复购买**：购买前检查 `fetchPlayers()` 中是否已包含该 `definitionId`
6. **价格更新**：购买成功后更新球员库 `lastBuyPrice` 和价格库

---

## 进度跟踪

### 第一阶段
- [x] 分值球员库配置设计 - 已完成分析
- [x] 球员库结构确定 - definitionId, name, rating, lastBuyPrice
- [x] 球员库管理位置 - 设置界面（初始化/清空）
- [x] 优化虚拟球员获取 - searchCriteria设置稀有金卡过滤
- [ ] IndexedDB 存储扩展 - 添加 ratingPlayersPool objectStore
- [ ] fetchAllConceptPlayers() - 只获取稀有金卡虚拟球员
- [ ] refreshRatingPlayersPool() - 合并虚拟球员和俱乐部球员
- [ ] saveRatingPlayersPool() / loadRatingPlayersPool() - IndexedDB存储
- [ ] clearRatingPlayersPool() - 清空球员库
- [ ] i18n本地化文本添加（设置界面）
- [ ] 设置界面Tab - 分值球员库管理（初始化/清空按钮）
- [ ] 第一阶段测试验证

### 第二阶段（待第一阶段完成后）
- [x] 购买策略 - 从CBR起步价逐步加价直到上限
- [x] 价格更新 - 购买成功后更新价格库
- [x] 购买界面自动检查球员库
- [ ] getCBRPrice() - 获取分值最低价
- [ ] incrementPrice() - 加价函数
- [ ] DEFAULT_START_PRICE - 默认起步价配置
- [ ] i18n本地化文本添加（购买界面）
- [ ] CSS样式添加（分购面板）
- [ ] showRatingBuyPanel() - 分购面板UI实现
- [ ] doRatingBuy() - 分购执行函数
- [ ] 按钮注入（"分购"按钮）
- [ ] 第二阶段测试验证