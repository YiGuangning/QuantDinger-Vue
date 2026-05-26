// Script-strategy template catalog.
//
// Templates `trendFollowing`, `martingale`, `grid` and `dca` were intentionally
// removed because the "Trading Bot" page already offers wizard-based versions
// of the same four strategies (see `views/trading-bot/components/botScriptTemplates.js`).
//
// Signal-style templates (`meanReversion`, `breakout`, `rsiMeanReversion`, `macdCross`, etc.)
// were also removed — those belong in Indicator IDE + Indicator Signal Strategy.
// i18n labels under `trading-assistant.template.*` are kept for legacy display.
//
// What stays here are the "stateful" templates that genuinely cannot be
// expressed as a single-indicator signal strategy: trailing stops, scale-in
// ladders, take-profit ladders, etc.
const TEMPLATE_DEFINITIONS = [
  {
    key: 'trailingStop',
    icon: '🪤',
    accent: 'violet',
    code: `"""
Trailing Stop Strategy
Enter on EMA crossover, manage exits with a hard stop and a trailing stop
that arms only after a minimum profit threshold is reached.
"""

def on_init(ctx):
    ctx.fast_period = ctx.param('fast_period', 10)
    ctx.slow_period = ctx.param('slow_period', 30)
    ctx.position_pct = ctx.param('position_pct', 0.8)
    ctx.hard_stop_pct = ctx.param('hard_stop_pct', 0.025)
    ctx.trailing_stop_pct = ctx.param('trailing_stop_pct', 0.015)
    ctx.trailing_arm_pct = ctx.param('trailing_arm_pct', 0.02)
    ctx.peak_price = 0.0
    ctx.trailing_armed = False

def _ema(values, period):
    k = 2.0 / (period + 1)
    e = float(values[0])
    for v in values[1:]:
        e = float(v) * k + e * (1 - k)
    return e

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.slow_period + 5)
    if len(bars) < ctx.slow_period:
        return
    closes = [b['close'] for b in bars]
    fast = _ema(closes, ctx.fast_period)
    slow = _ema(closes, ctx.slow_period)
    price = bar['close']

    if not ctx.position and fast > slow:
        qty = (ctx.equity * ctx.position_pct) / price
        ctx.buy(price, qty)
        ctx.peak_price = price
        ctx.trailing_armed = False
        ctx.log(f"BUY at {price:.2f}")
        return

    if ctx.position and ctx.position['side'] == 'long':
        entry = ctx.position['entry_price']
        ctx.peak_price = max(ctx.peak_price, price)
        pnl_pct = (price - entry) / entry

        if pnl_pct <= -ctx.hard_stop_pct:
            ctx.close_position()
            ctx.log(f"HARD STOP at {price:.2f} ({pnl_pct*100:.2f}%)")
            return

        if not ctx.trailing_armed and pnl_pct >= ctx.trailing_arm_pct:
            ctx.trailing_armed = True
            ctx.log(f"Trailing armed at {price:.2f}")

        if ctx.trailing_armed:
            trail_stop = ctx.peak_price * (1 - ctx.trailing_stop_pct)
            if price <= trail_stop:
                ctx.close_position()
                ctx.log(f"TRAILING STOP at {price:.2f} (peak {ctx.peak_price:.2f})")
`,
    params: [
      { name: 'fast_period', type: 'integer', default: 10, min: 2, max: 120, step: 1 },
      { name: 'slow_period', type: 'integer', default: 30, min: 5, max: 240, step: 1 },
      { name: 'position_pct', type: 'percent', default: 0.8, min: 0.05, max: 1, step: 0.01 },
      { name: 'hard_stop_pct', type: 'percent', default: 0.025, min: 0.001, max: 0.5, step: 0.001 },
      { name: 'trailing_stop_pct', type: 'percent', default: 0.015, min: 0.001, max: 0.5, step: 0.001 },
      { name: 'trailing_arm_pct', type: 'percent', default: 0.02, min: 0.001, max: 0.5, step: 0.001 }
    ]
  },
  {
    key: 'scaleInOnDip',
    icon: '🪜',
    accent: 'teal',
    code: `"""
Scale-in on dip Strategy
Build a position in tranches as price keeps falling below the entry,
then exit with a take-profit measured against the average cost.
"""

def on_init(ctx):
    ctx.entry_pct = ctx.param('entry_pct', 0.25)
    ctx.dip_step_pct = ctx.param('dip_step_pct', 0.02)
    ctx.max_layers = ctx.param('max_layers', 4)
    ctx.take_profit_pct = ctx.param('take_profit_pct', 0.04)
    ctx.hard_stop_pct = ctx.param('hard_stop_pct', 0.10)
    ctx.entry_anchor = 0.0
    ctx.layers = 0
    ctx.avg_cost = 0.0

def _trigger_open(ctx, bar):
    bars = ctx.bars(20)
    if len(bars) < 5:
        return False
    return bar['close'] < bars[-2]['close']

def on_bar(ctx, bar):
    price = bar['close']

    if not ctx.position:
        if _trigger_open(ctx, bar):
            qty = (ctx.equity * ctx.entry_pct) / price
            ctx.buy(price, qty)
            ctx.entry_anchor = price
            ctx.layers = 1
            ctx.avg_cost = price
            ctx.log(f"OPEN layer 1 at {price:.2f}")
        return

    if ctx.position['side'] != 'long':
        return

    entry = ctx.position['entry_price']
    pnl_pct = (price - entry) / entry

    if pnl_pct <= -ctx.hard_stop_pct:
        ctx.close_position()
        ctx.layers = 0
        ctx.log(f"HARD STOP at {price:.2f}")
        return

    next_trigger = ctx.entry_anchor * (1 - ctx.dip_step_pct * ctx.layers)
    if ctx.layers < ctx.max_layers and price <= next_trigger:
        qty = (ctx.equity * ctx.entry_pct) / price
        ctx.buy(price, qty)
        ctx.layers += 1
        ctx.avg_cost = (ctx.avg_cost * (ctx.layers - 1) + price) / ctx.layers
        ctx.log(f"SCALE IN layer {ctx.layers} at {price:.2f}, avg {ctx.avg_cost:.2f}")
        return

    if ctx.avg_cost > 0 and price >= ctx.avg_cost * (1 + ctx.take_profit_pct):
        ctx.close_position()
        ctx.log(f"TAKE PROFIT at {price:.2f} (avg {ctx.avg_cost:.2f})")
        ctx.layers = 0
`,
    params: [
      { name: 'entry_pct', type: 'percent', default: 0.25, min: 0.01, max: 1, step: 0.01 },
      { name: 'dip_step_pct', type: 'percent', default: 0.02, min: 0.001, max: 0.5, step: 0.001 },
      { name: 'max_layers', type: 'integer', default: 4, min: 1, max: 10, step: 1 },
      { name: 'take_profit_pct', type: 'percent', default: 0.04, min: 0.001, max: 1, step: 0.001 },
      { name: 'hard_stop_pct', type: 'percent', default: 0.10, min: 0.005, max: 0.9, step: 0.005 }
    ]
  },
  {
    key: 'takeProfitLadder',
    icon: '🎯',
    accent: 'amber',
    code: `"""
Take-Profit Ladder Strategy
Enter on EMA crossover, then partially close the position at three
ascending take-profit levels. A hard stop protects the runner.
"""

def on_init(ctx):
    ctx.fast_period = ctx.param('fast_period', 10)
    ctx.slow_period = ctx.param('slow_period', 30)
    ctx.position_pct = ctx.param('position_pct', 0.9)
    ctx.tp1_pct = ctx.param('tp1_pct', 0.02)
    ctx.tp2_pct = ctx.param('tp2_pct', 0.05)
    ctx.tp3_pct = ctx.param('tp3_pct', 0.10)
    ctx.tp1_close = ctx.param('tp1_close', 0.4)
    ctx.tp2_close = ctx.param('tp2_close', 0.4)
    ctx.hard_stop_pct = ctx.param('hard_stop_pct', 0.03)
    ctx.tp_hits = 0
    ctx.original_qty = 0.0

def _ema(values, period):
    k = 2.0 / (period + 1)
    e = float(values[0])
    for v in values[1:]:
        e = float(v) * k + e * (1 - k)
    return e

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.slow_period + 5)
    if len(bars) < ctx.slow_period:
        return
    closes = [b['close'] for b in bars]
    fast = _ema(closes, ctx.fast_period)
    slow = _ema(closes, ctx.slow_period)
    price = bar['close']

    if not ctx.position and fast > slow:
        qty = (ctx.equity * ctx.position_pct) / price
        ctx.buy(price, qty)
        ctx.original_qty = qty
        ctx.tp_hits = 0
        ctx.log(f"BUY at {price:.2f}, qty {qty:.4f}")
        return

    if not (ctx.position and ctx.position['side'] == 'long'):
        return

    entry = ctx.position['entry_price']
    pnl_pct = (price - entry) / entry

    if pnl_pct <= -ctx.hard_stop_pct:
        ctx.close_position()
        ctx.tp_hits = 0
        ctx.log(f"HARD STOP at {price:.2f}")
        return

    if ctx.tp_hits == 0 and pnl_pct >= ctx.tp1_pct:
        sell_qty = ctx.original_qty * ctx.tp1_close
        ctx.sell(price, sell_qty)
        ctx.tp_hits = 1
        ctx.log(f"TP1 at {price:.2f}, closed {ctx.tp1_close*100:.0f}%")
    elif ctx.tp_hits == 1 and pnl_pct >= ctx.tp2_pct:
        sell_qty = ctx.original_qty * ctx.tp2_close
        ctx.sell(price, sell_qty)
        ctx.tp_hits = 2
        ctx.log(f"TP2 at {price:.2f}, closed {ctx.tp2_close*100:.0f}%")
    elif ctx.tp_hits == 2 and pnl_pct >= ctx.tp3_pct:
        ctx.close_position()
        ctx.tp_hits = 3
        ctx.log(f"TP3 at {price:.2f}, runner closed")
`,
    params: [
      { name: 'fast_period', type: 'integer', default: 10, min: 2, max: 120, step: 1 },
      { name: 'slow_period', type: 'integer', default: 30, min: 5, max: 240, step: 1 },
      { name: 'position_pct', type: 'percent', default: 0.9, min: 0.05, max: 1, step: 0.01 },
      { name: 'tp1_pct', type: 'percent', default: 0.02, min: 0.001, max: 1, step: 0.001 },
      { name: 'tp2_pct', type: 'percent', default: 0.05, min: 0.001, max: 1, step: 0.001 },
      { name: 'tp3_pct', type: 'percent', default: 0.10, min: 0.001, max: 2, step: 0.001 },
      { name: 'tp1_close', type: 'percent', default: 0.4, min: 0.05, max: 1, step: 0.05 },
      { name: 'tp2_close', type: 'percent', default: 0.4, min: 0.05, max: 1, step: 0.05 },
      { name: 'hard_stop_pct', type: 'percent', default: 0.03, min: 0.001, max: 0.5, step: 0.001 }
    ]
  }
]

function escapeForRegExp (value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toPythonLiteral (value) {
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False'
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '0'
  }
  if (value === null || value === undefined) {
    return 'None'
  }
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export const SCRIPT_TEMPLATE_CATALOG = TEMPLATE_DEFINITIONS

export function getScriptTemplateByKey (key) {
  return TEMPLATE_DEFINITIONS.find(item => item.key === key) || null
}

export function buildTemplateParamValues (templateOrKey, overrides = {}) {
  const template = typeof templateOrKey === 'string' ? getScriptTemplateByKey(templateOrKey) : templateOrKey
  if (!template) return {}
  return template.params.reduce((acc, param) => {
    acc[param.name] = Object.prototype.hasOwnProperty.call(overrides, param.name)
      ? overrides[param.name]
      : param.default
    return acc
  }, {})
}

export function buildTemplateCode (templateOrKey, overrides = {}) {
  const template = typeof templateOrKey === 'string' ? getScriptTemplateByKey(templateOrKey) : templateOrKey
  if (!template) return ''
  const values = buildTemplateParamValues(template, overrides)
  return template.params.reduce((code, param) => {
    const literal = toPythonLiteral(values[param.name])
    const pattern = new RegExp(`(ctx\\.param\\(['"]${escapeForRegExp(param.name)}['"],\\s*)([^\\)]+)(\\))`)
    return code.replace(pattern, `$1${literal}$3`)
  }, template.code)
}
