import { ipcRenderer } from 'electron'

export const COMPONENT_TYPES = {
  OVERVIEW_CARD: 'overview-card',
  PIE_CHART: 'pie-chart',
  BAR_CHART: 'bar-chart',
  LINE_CHART: 'line-chart',
  TABLE: 'table',
  RANKING: 'ranking',
  TREND_COMPARE: 'trend-compare',
  DIVIDER: 'divider',
  TEXT: 'text',
  SPACER: 'spacer'
}

export const COMPONENT_CONFIG = {
  [COMPONENT_TYPES.OVERVIEW_CARD]: {
    name: '总览卡片',
    icon: 'el-icon-data-board',
    defaultWidth: 3,
    defaultHeight: 2,
    hasConfig: true
  },
  [COMPONENT_TYPES.PIE_CHART]: {
    name: '饼图',
    icon: 'el-icon-pie-chart',
    defaultWidth: 6,
    defaultHeight: 8,
    hasConfig: true
  },
  [COMPONENT_TYPES.BAR_CHART]: {
    name: '柱状图',
    icon: 'el-icon-bar-chart',
    defaultWidth: 6,
    defaultHeight: 8,
    hasConfig: true
  },
  [COMPONENT_TYPES.LINE_CHART]: {
    name: '折线图',
    icon: 'el-icon-data-line',
    defaultWidth: 12,
    defaultHeight: 8,
    hasConfig: true
  },
  [COMPONENT_TYPES.TABLE]: {
    name: '表格',
    icon: 'el-icon-s-grid',
    defaultWidth: 6,
    defaultHeight: 8,
    hasConfig: true
  },
  [COMPONENT_TYPES.RANKING]: {
    name: '排行榜',
    icon: 'el-icon-trophy',
    defaultWidth: 6,
    defaultHeight: 8,
    hasConfig: true
  },
  [COMPONENT_TYPES.TREND_COMPARE]: {
    name: '趋势对比',
    icon: 'el-icon-s-marketing',
    defaultWidth: 12,
    defaultHeight: 6,
    hasConfig: true
  },
  [COMPONENT_TYPES.DIVIDER]: {
    name: '分割线',
    icon: 'el-icon-minus',
    defaultWidth: 12,
    defaultHeight: 1,
    hasConfig: true
  },
  [COMPONENT_TYPES.TEXT]: {
    name: '文本注释',
    icon: 'el-icon-document',
    defaultWidth: 12,
    defaultHeight: 2,
    hasConfig: true
  },
  [COMPONENT_TYPES.SPACER]: {
    name: '空白占位',
    icon: 'el-icon-s-unfold',
    defaultWidth: 12,
    defaultHeight: 1,
    hasConfig: false
  }
}

export const METRIC_TYPES = [
  { value: 'income', label: '总收入' },
  { value: 'expense', label: '总支出' },
  { value: 'balance', label: '结余' },
  { value: 'count', label: '交易笔数' },
  { value: 'avg_expense', label: '平均支出' },
  { value: 'avg_income', label: '平均收入' },
  { value: 'max_expense', label: '最大单笔支出' },
  { value: 'max_income', label: '最大单笔收入' }
]

export const DATA_TYPES = [
  { value: 'expense', label: '支出' },
  { value: 'income', label: '收入' },
  { value: 'both', label: '收支对比' }
]

export const GROUP_BY_OPTIONS = [
  { value: 'category', label: '按分类' },
  { value: 'account', label: '按账户' },
  { value: 'day', label: '按日' },
  { value: 'week', label: '按周' },
  { value: 'month', label: '按月' },
  { value: 'quarter', label: '按季度' },
  { value: 'year', label: '按年' },
  { value: 'category_month', label: '分类×月份' },
  { value: 'category_quarter', label: '分类×季度' }
]

export const PERIOD_OPTIONS = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'quarter', label: '本季度' },
  { value: 'year', label: '本年' },
  { value: 'last_week', label: '上周' },
  { value: 'last_month', label: '上月' },
  { value: 'last_quarter', label: '上季度' },
  { value: 'last_year', label: '去年' },
  { value: 'custom', label: '自定义' }
]

export const VALUE_DIMENSIONS = [
  { value: 'amount', label: '金额' },
  { value: 'count', label: '笔数' },
  { value: 'percent', label: '占比' }
]

export const ROW_DIMENSIONS = [
  { value: 'date', label: '日期' },
  { value: 'category', label: '分类' },
  { value: 'account', label: '账户' }
]

export const COLUMN_DIMENSIONS = [
  { value: 'type', label: '收入/支出' },
  { value: 'month', label: '月份' },
  { value: 'quarter', label: '季度' }
]

export const DATE_GRANULARITY = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季' },
  { value: 'year', label: '年' }
]

export function generateComponentId() {
  return 'comp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

export function createComponent(type, options = {}) {
  const config = COMPONENT_CONFIG[type]
  return {
    id: generateComponentId(),
    type,
    title: options.title || config.name,
    x: options.x || 0,
    y: options.y || 0,
    w: options.w || config.defaultWidth,
    h: options.h || config.defaultHeight,
    config: options.config || getDefaultConfig(type)
  }
}

export function getDefaultConfig(type) {
  switch (type) {
    case COMPONENT_TYPES.OVERVIEW_CARD:
      return {
        metric: 'expense',
        period: 'month',
        startDate: null,
        endDate: null,
        categoryIds: [],
        accountIds: []
      }
    case COMPONENT_TYPES.PIE_CHART:
      return {
        dataType: 'expense',
        groupBy: 'category',
        period: 'month',
        startDate: null,
        endDate: null,
        categoryIds: [],
        accountIds: [],
        showLegend: true,
        showLabel: true
      }
    case COMPONENT_TYPES.BAR_CHART:
      return {
        dataType: 'both',
        groupBy: 'month',
        period: 'year',
        startDate: null,
        endDate: null,
        categoryIds: [],
        accountIds: [],
        showLegend: true,
        stacked: false
      }
    case COMPONENT_TYPES.LINE_CHART:
      return {
        dataType: 'both',
        groupBy: 'month',
        period: 'year',
        startDate: null,
        endDate: null,
        categoryIds: [],
        accountIds: [],
        showLegend: true,
        smooth: true,
        topCategories: 5
      }
    case COMPONENT_TYPES.TABLE:
      return {
        dataType: 'both',
        period: 'month',
        startDate: null,
        endDate: null,
        categoryIds: [],
        accountIds: [],
        limit: 20,
        showDate: true,
        showType: true,
        showCategory: true,
        showAccount: true,
        showAmount: true,
        showRemark: true
      }
    case COMPONENT_TYPES.RANKING:
      return {
        dataType: 'expense',
        groupBy: 'category',
        period: 'month',
        startDate: null,
        endDate: null,
        categoryIds: [],
        accountIds: [],
        limit: 10,
        order: 'desc'
      }
    case COMPONENT_TYPES.TREND_COMPARE:
      return {
        compareType: 'yoy_mom',
        dataType: 'both',
        period: 'month',
        startDate: null,
        endDate: null,
        categoryIds: [],
        accountIds: []
      }
    case COMPONENT_TYPES.DIVIDER:
      return {
        title: '',
        showLine: true
      }
    case COMPONENT_TYPES.TEXT:
      return {
        content: '点击编辑文本内容',
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#333333'
      }
    case COMPONENT_TYPES.SPACER:
      return {}
    default:
      return {}
  }
}

export function getPeriodRange(period, startDate, endDate) {
  const now = new Date()
  let start, end

  const formatDate = (d) => d.toISOString().split('T')[0]
  const setMonthStart = (d) => { d.setDate(1); return d }
  const setMonthEnd = (d) => { d.setMonth(d.getMonth() + 1); d.setDate(0); return d }

  switch (period) {
    case 'week':
      start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      end = new Date(start)
      end.setDate(start.getDate() + 6)
      break
    case 'month':
      start = setMonthStart(new Date(now))
      end = setMonthEnd(new Date(now))
      break
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), quarter * 3, 1)
      end = new Date(now.getFullYear(), quarter * 3 + 3, 0)
      break
    case 'year':
      start = new Date(now.getFullYear(), 0, 1)
      end = new Date(now.getFullYear(), 11, 31)
      break
    case 'last_week':
      start = new Date(now)
      start.setDate(now.getDate() - now.getDay() - 7)
      end = new Date(start)
      end.setDate(start.getDate() + 6)
      break
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end = new Date(now.getFullYear(), now.getMonth(), 0)
      break
    case 'last_quarter':
      const lastQuarter = Math.floor(now.getMonth() / 3) - 1
      const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear()
      const adjustedQuarter = lastQuarter < 0 ? 3 : lastQuarter
      start = new Date(lastQuarterYear, adjustedQuarter * 3, 1)
      end = new Date(lastQuarterYear, adjustedQuarter * 3 + 3, 0)
      break
    case 'last_year':
      start = new Date(now.getFullYear() - 1, 0, 1)
      end = new Date(now.getFullYear() - 1, 11, 31)
      break
    case 'custom':
      start = startDate ? new Date(startDate) : null
      end = endDate ? new Date(endDate) : null
      break
    default:
      start = setMonthStart(new Date(now))
      end = setMonthEnd(new Date(now))
  }

  return {
    start: start ? formatDate(start) : null,
    end: end ? formatDate(end) : null
  }
}

export function filterRecords(records, config) {
  const { period, startDate, endDate, categoryIds, accountIds, type } = config
  const range = getPeriodRange(period, startDate, endDate)

  return records.filter(r => {
    if (r.type === 'transfer') return false

    if (range.start && r.date < range.start) return false
    if (range.end && r.date > range.end) return false

    if (categoryIds && categoryIds.length > 0 && !categoryIds.includes(r.categoryId)) return false
    if (accountIds && accountIds.length > 0 && !accountIds.includes(r.accountId)) return false
    if (type && r.type !== type) return false

    return true
  })
}

export function calculateMetric(records, metric, config) {
  const filtered = filterRecords(records, config)

  switch (metric) {
    case 'income':
      return filtered.filter(r => r.type === 'income').reduce((sum, r) => sum + Number(r.amount), 0)
    case 'expense':
      return filtered.filter(r => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount), 0)
    case 'balance':
      return filtered.reduce((sum, r) => {
        return sum + (r.type === 'income' ? Number(r.amount) : -Number(r.amount))
      }, 0)
    case 'count':
      return filtered.length
    case 'avg_expense':
      const expenses = filtered.filter(r => r.type === 'expense')
      return expenses.length > 0 ? expenses.reduce((sum, r) => sum + Number(r.amount), 0) / expenses.length : 0
    case 'avg_income':
      const incomes = filtered.filter(r => r.type === 'income')
      return incomes.length > 0 ? incomes.reduce((sum, r) => sum + Number(r.amount), 0) / incomes.length : 0
    case 'max_expense':
      const expenseAmounts = filtered.filter(r => r.type === 'expense').map(r => Number(r.amount))
      return expenseAmounts.length > 0 ? Math.max(...expenseAmounts) : 0
    case 'max_income':
      const incomeAmounts = filtered.filter(r => r.type === 'income').map(r => Number(r.amount))
      return incomeAmounts.length > 0 ? Math.max(...incomeAmounts) : 0
    default:
      return 0
  }
}

export function groupRecords(records, groupBy, config) {
  const filtered = filterRecords(records, config)
  const groups = {}

  filtered.forEach(record => {
    let key = ''
    const date = new Date(record.date)

    switch (groupBy) {
      case 'category':
        key = record.categoryId
        break
      case 'account':
        key = record.accountId
        break
      case 'day':
        key = record.date
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      case 'month':
        key = record.date.substring(0, 7)
        break
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1
        key = `${date.getFullYear()}-Q${quarter}`
        break
      case 'year':
        key = date.getFullYear().toString()
        break
      case 'category_month':
        key = `${record.categoryId}_${record.date.substring(0, 7)}`
        break
      case 'category_quarter':
        const catQuarter = Math.floor(date.getMonth() / 3) + 1
        key = `${record.categoryId}_${date.getFullYear()}-Q${catQuarter}`
        break
      default:
        key = record.date
    }

    if (!groups[key]) {
      groups[key] = {
        key,
        income: 0,
        expense: 0,
        count: 0,
        records: []
      }
    }

    if (record.type === 'income') {
      groups[key].income += Number(record.amount)
    } else if (record.type === 'expense') {
      groups[key].expense += Number(record.amount)
    }
    groups[key].count += 1
    groups[key].records.push(record)
  })

  return Object.values(groups).sort((a, b) => a.key.localeCompare(b.key))
}

export function formatMoney(value, decimals = 2) {
  if (value === undefined || value === null || isNaN(value)) return '0.00'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

export function calculateYoY(current, lastYear) {
  if (!lastYear || lastYear === 0) return 0
  return ((current - lastYear) / lastYear) * 100
}

export function calculateMoM(current, lastMonth) {
  if (!lastMonth || lastMonth === 0) return 0
  return ((current - lastMonth) / lastMonth) * 100
}

export async function getReportTemplates() {
  return await ipcRenderer.invoke('get-report-templates')
}

export async function saveReportTemplate(template) {
  return await ipcRenderer.invoke('save-report-template', template)
}

export async function deleteReportTemplate(id) {
  return await ipcRenderer.invoke('delete-report-template', id)
}

export async function exportReportTemplate(id) {
  return await ipcRenderer.invoke('export-report-template', id)
}

export async function importReportTemplate() {
  return await ipcRenderer.invoke('import-report-template')
}

export async function getReportSubscriptions() {
  return await ipcRenderer.invoke('get-report-subscriptions')
}

export async function saveReportSubscription(subscription) {
  return await ipcRenderer.invoke('save-report-subscription', subscription)
}

export async function deleteReportSubscription(id) {
  return await ipcRenderer.invoke('delete-report-subscription', id)
}

export async function toggleReportSubscription(id) {
  return await ipcRenderer.invoke('toggle-report-subscription', id)
}

export async function generateReportFile(options) {
  return await ipcRenderer.invoke('generate-report-file', options)
}

export async function getPivotData(config) {
  return await ipcRenderer.invoke('get-pivot-data', config)
}
