export const FIELD_LABELS = {
  date: '日期',
  amount: '金额',
  type: '收支类型',
  category: '分类',
  remark: '备注',
  accountName: '账户',
  merchant: '商家',
  status: '交易状态'
}

export const REQUIRED_FIELDS = ['date', 'amount', 'type']

export const WECHAT_STATUS_FILTERS = [
  '已全额退款',
  '已退款',
  '已关闭',
  '交易关闭',
  '已删除',
  '失败',
  '支付失败',
  '交易失败'
]

export function isWechatStatusInvalid(status) {
  if (!status) return false
  const statusStr = String(status).toLowerCase()
  return WECHAT_STATUS_FILTERS.some(filter => 
    statusStr.includes(filter.toLowerCase())
  )
}

export function formatSeconds(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}分${secs}秒`
}

export function generateRecordKey(record) {
  const date = record.date || ''
  const amount = record.amount ? Number(record.amount).toFixed(2) : '0.00'
  const category = record.categoryName || record.category || ''
  const remark = record.remark || ''
  return `${date}|${amount}|${category}|${remark}`
}

export function checkDuplicatesLocal(records) {
  const seen = new Set()
  const duplicates = []
  
  records.forEach((record, index) => {
    const key = generateRecordKey(record)
    if (seen.has(key)) {
      duplicates.push({ index, record, isDuplicate: true, key })
    } else {
      seen.add(key)
      duplicates.push({ index, record, isDuplicate: false, key })
    }
  })
  
  return duplicates
}

export function normalizeTypeDisplay(type) {
  const map = {
    'expense': '支出',
    'income': '收入',
    'transfer': '转账'
  }
  return map[type] || type
}

export function normalizeTypeValue(typeStr) {
  const lower = String(typeStr || '').toLowerCase().trim()
  const map = {
    '支出': 'expense',
    '支出': 'expense',
    '消费': 'expense',
    'expense': 'expense',
    '收入': 'income',
    '收入': 'income',
    'income': 'income',
    '转账': 'transfer',
    'transfer': 'transfer'
  }
  return map[lower] || 'expense'
}

export function getFieldOptions(headers) {
  return headers.map(h => ({ label: h, value: h }))
}

export function validateMapping(fieldMapping) {
  const errors = []
  
  REQUIRED_FIELDS.forEach(field => {
    if (!fieldMapping[field]) {
      errors.push(`请映射「${FIELD_LABELS[field]}」字段`)
    }
  })
  
  return errors
}

export function getSoftwareIcon(software) {
  const icons = {
    '随手记': '📒',
    '挖财': '💰',
    '鲨鱼记账': '🦈',
    '支付宝': '💙',
    '微信': '💚',
    '微信支付账单': '💚'
  }
  return icons[software] || '📄'
}

export function formatPreviewRecord(record, index) {
  return {
    ...record,
    _index: index + 1,
    _typeDisplay: normalizeTypeDisplay(record.type),
    _amountDisplay: `¥${Number(record.amount).toFixed(2)}`,
    _hasError: record.amount <= 0 || !record.date,
    _isNegative: record.amount < 0
  }
}
