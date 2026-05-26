/**
 * Heuristic overfitting-risk score (0–100) from community indicator backtest KPIs.
 * Higher = more suspicious (returns too good, drawdown too shallow, etc.).
 */
export function computeOverfitRisk (indicator) {
  if (!indicator || typeof indicator !== 'object') return 0

  const totalReturn = parseFloat(indicator.total_return) || 0
  const annualReturn = parseFloat(indicator.annual_return) || 0
  const sharpe = parseFloat(indicator.sharpe) || 0
  const maxDd = Math.abs(parseFloat(indicator.max_drawdown) || 0)
  const winRate = parseFloat(indicator.win_rate_backtest) || 0
  const profitFactor = parseFloat(indicator.profit_factor) || 0
  const sampleSize = parseInt(indicator.sample_size, 10) || 0

  let risk = 0

  if (totalReturn > 20) {
    risk += Math.min(22, (totalReturn - 20) * 0.18)
  }
  if (totalReturn > 80) risk += 12
  if (totalReturn > 200) risk += 18

  if (annualReturn > 40) {
    risk += Math.min(14, (annualReturn - 40) * 0.14)
  }

  if (sharpe > 1.8) {
    risk += Math.min(18, (sharpe - 1.8) * 7)
  }
  if (sharpe > 3.5) risk += 10

  if (totalReturn > 40 && maxDd > 0 && maxDd < 12) risk += 16
  if (totalReturn > 80 && maxDd > 0 && maxDd < 18) risk += 12

  if (maxDd > 0 && totalReturn / maxDd > 4) {
    risk += Math.min(14, (totalReturn / maxDd - 4) * 2.5)
  }

  if (winRate > 65) {
    risk += Math.min(12, (winRate - 65) * 0.35)
  }

  if (profitFactor > 2.2) {
    risk += Math.min(10, (profitFactor - 2.2) * 5)
  }

  if (sampleSize > 0 && sampleSize < 3) risk += 14
  else if (sampleSize > 0 && sampleSize < 5) risk += 7

  return Math.min(100, Math.max(0, Math.round(risk)))
}

export function getOverfitRiskLevel (score) {
  const s = Number(score) || 0
  if (s >= 76) return 'extreme'
  if (s >= 51) return 'high'
  if (s >= 26) return 'medium'
  return 'low'
}

/** Show gauge whenever card has backtest KPI evidence (parent also gates on hasKpi). */
export function shouldShowOverfitGauge (indicator) {
  const sampleSize = parseInt(indicator && indicator.sample_size, 10) || 0
  const totalReturn = parseFloat(indicator && indicator.total_return) || 0
  const sharpe = parseFloat(indicator && indicator.sharpe) || 0
  const maxDd = parseFloat(indicator && indicator.max_drawdown) || 0
  return sampleSize > 0 || totalReturn !== 0 || sharpe !== 0 || maxDd !== 0
}
