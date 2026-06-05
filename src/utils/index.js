export function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  
  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`
  }
  if (format === 'YYYY-MM') {
    return `${year}-${month}`
  }
  if (format === 'MM-DD') {
    return `${month}-${day}`
  }
  if (format === 'YYYY年MM月DD日') {
    return `${year}年${month}月${day}日`
  }
  if (format === 'YYYY年MM月') {
    return `${year}年${month}月`
  }
  if (format === 'YYYY年') {
    return `${year}年`
  }
  return `${year}-${month}-${day}`
}

export function formatMoney(amount) {
  return Number(amount).toFixed(2)
}

export function formatMoneyWithComma(amount) {
  return Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function getMonthRange(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export function getDayRange(date = new Date()) {
  const d = new Date(date)
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  return { start, end }
}

export function getWeekRange(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(d.getFullYear(), d.getMonth(), diff)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function getQuarterRange(date = new Date()) {
  const year = date.getFullYear()
  const quarter = Math.floor(date.getMonth() / 3)
  const start = new Date(year, quarter * 3, 1)
  const end = new Date(year, quarter * 3 + 3, 0, 23, 59, 59, 999)
  return { start, end }
}

export function getYearRange(date = new Date()) {
  const year = date.getFullYear()
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31, 23, 59, 59, 999)
  return { start, end }
}

export function getTimeRange(date = new Date(), period = 'month') {
  switch (period) {
    case 'day': return getDayRange(date)
    case 'week': return getWeekRange(date)
    case 'month': return getMonthRange(date)
    case 'quarter': return getQuarterRange(date)
    case 'year': return getYearRange(date)
    default: return getMonthRange(date)
  }
}

export function getPrevPeriodDate(date = new Date(), period = 'month') {
  const d = new Date(date)
  switch (period) {
    case 'day':
      d.setDate(d.getDate() - 1)
      break
    case 'week':
      d.setDate(d.getDate() - 7)
      break
    case 'month':
      d.setMonth(d.getMonth() - 1)
      break
    case 'quarter':
      d.setMonth(d.getMonth() - 3)
      break
    case 'year':
      d.setFullYear(d.getFullYear() - 1)
      break
  }
  return d
}

export function getSamePeriodLastYear(date = new Date()) {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() - 1)
  return d
}

export function calcGrowthRate(current, previous) {
  if (previous === 0) {
    return current > 0 ? Infinity : current < 0 ? -Infinity : 0
  }
  return ((current - previous) / Math.abs(previous)) * 100
}

export function formatGrowthRate(rate) {
  if (rate === Infinity) return '+∞%'
  if (rate === -Infinity) return '-∞%'
  const sign = rate > 0 ? '+' : ''
  return `${sign}${rate.toFixed(1)}%`
}

export function linearRegression(dataPoints) {
  const n = dataPoints.length
  if (n < 2) return { slope: 0, intercept: 0, predict: () => 0 }
  
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  
  for (let i = 0; i < n; i++) {
    const { x, y } = dataPoints[i]
    sumX += x
    sumY += y
    sumXY += x * y
    sumXX += x * x
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  return {
    slope,
    intercept,
    predict: (x) => slope * x + intercept
  }
}

export function getMonthLabels(date, count = 6) {
  const labels = []
  const d = new Date(date)
  for (let i = count - 1; i >= 0; i--) {
    const temp = new Date(d)
    temp.setMonth(temp.getMonth() - i)
    labels.push(formatDate(temp, 'YYYY-MM'))
  }
  return labels
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function getRecordsInRange(records, start, end) {
  return records.filter(r => {
    const date = new Date(r.date)
    return date >= start && date <= end
  })
}

export function sumAmountByType(records, type) {
  return records
    .filter(r => r.type === type)
    .reduce((sum, r) => sum + Number(r.amount), 0)
}

export function groupByCategory(records, categories, type) {
  const map = {}
  let total = 0
  records
    .filter(r => r.type === type)
    .forEach(r => {
      if (!map[r.categoryId]) {
        const cat = categories.find(c => c.id === r.categoryId)
        map[r.categoryId] = {
          categoryId: r.categoryId,
          name: r.categoryName,
          amount: 0,
          color: cat?.color || '#909399',
          icon: cat?.icon || '💰'
        }
      }
      map[r.categoryId].amount += Number(r.amount)
      total += Number(r.amount)
    })
  
  return Object.values(map)
    .sort((a, b) => b.amount - a.amount)
    .map(item => ({
      ...item,
      percent: total > 0 ? ((item.amount / total) * 100).toFixed(1) : 0
    }))
}

export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}
