# 前端改动记录 — 策略回测功能修复

**日期：** 2026-05-26
**分支：** main
**仓库：** https://github.com/YiGuangning/QuantDinger-Vue.git

---

## 问题描述

从"策略与实盘"页面点击策略的"回测"按钮跳转到指标 IDE 时存在三个连锁 bug：

1. **路由重定向丢失 query 参数** — `/backtest-center` 使用字符串重定向，`strategy_id` 被丢弃
2. **指标 IDE 不识别策略模式** — `created()` 从未检查 URL 中的 `strategy_id`
3. **回测总是调指标接口** — `runBacktest()` 固定调用 `/api/indicator/backtest`，而非 `/api/strategies/backtest`

## 改动文件清单（4 files, +113 / -26）

### 1. `src/config/router.config.js`（+2 / -2）

**改动：** 将 `/backtest-center` 的 redirect 从字符串改为函数，保留 query 参数传递。

```diff
- redirect: '/indicator-ide',
+ redirect: to => ({ path: '/indicator-ide', query: to.query }),
```

### 2. `src/views/indicator-ide/index.vue`（+103 / -24）

**核心文件，改动最多。**

| 位置 | 改动内容 |
|------|----------|
| import（行 ~1504） | 新增 `import { getStrategyDetail, runStrategyBacktest } from '@/api/strategy'` |
| data（行 ~1617） | 新增三个状态字段：`strategyBacktestId`、`isStrategyBacktestMode`、`strategyBacktestName` |
| computed `canRunBacktest`（行 ~1786） | 策略模式下不再要求 `selectedIndicatorId`，改为检查 `strategyBacktestId` |
| `created()`（行 ~2250） | 新增 URL `strategy_id` 检测逻辑：有则调用 `loadStrategyForBacktest()`，无则走原有 `autoSelectFirstIndicator()` |
| 新方法 `loadStrategyForBacktest()`（行 ~2539） | 调用 `getStrategyDetail` 获取策略详情，将 `indicator_code`、`trading_config`、`exchange_config` 映射到 IDE 的 data 字段 |
| `runBacktest()`（行 ~4091） | 根据 `isStrategyBacktestMode` 分叉：策略模式调用 `runStrategyBacktest()`（`POST /api/strategies/backtest`），否则走原 `/api/indicator/backtest` |

### 3. `src/locales/lang/zh-CN.js`（+4）

```js
'indicatorIde.strategyLoaded': '已加载策略：{name}',
'indicatorIde.strategyLoadFailed': '加载策略失败',
'indicatorIde.strategyBacktestBadge': '策略回测',
```

### 4. `src/locales/lang/en-US.js`（+4）

```js
'indicatorIde.strategyLoaded': 'Strategy loaded: {name}',
'indicatorIde.strategyLoadFailed': 'Failed to load strategy',
'indicatorIde.strategyBacktestBadge': 'Strategy Backtest',
```

---

## 数据流

```
策略与实盘页面
  └─ 点击"回测" → /backtest-center?strategy_id=5
       └─ router redirect（函数保留 query）
            └─ /indicator-ide?strategy_id=5
                 └─ created() 检测 strategy_id
                      └─ loadStrategyForBacktest(5)
                           ├─ GET /api/strategies/detail?id=5
                           ├─ 写入 currentCode / symbol / timeframe / ...
                           └─ 设置 isStrategyBacktestMode = true
                                └─ 用户点击回测
                                     └─ runStrategyBacktest()
                                          └─ POST /api/strategies/backtest
```

## 后端依赖

| API 端点 | 用途 | 来源文件 |
|----------|------|----------|
| `POST /api/strategies/detail` | 获取策略完整配置 | `src/api/strategy.js` → `getStrategyDetail()` |
| `POST /api/strategies/backtest` | 运行策略回测 | `src/api/strategy.js` → `runStrategyBacktest()` |

两个 API 均已在后端 `StrategySnapshotResolver` 中实现。

## 构建与部署

```bash
pnpm build                              # 构建到 dist/
docker cp dist/. quantdinger-frontend:/usr/share/nginx/html/   # 部署到容器
```

**注意：** 当前部署是直接拷贝到运行中的 Docker 容器，容器重建后会被 GHCR 镜像覆盖。永久生效需要推送到 fork 并打 tag 触发 CI 构建。
