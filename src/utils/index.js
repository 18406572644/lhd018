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
  return `${year}-${month}-${day}`
}

export function formatMoney(amount) {
  return Number(amount).toFixed(2)
}

export function getMonthRange(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
