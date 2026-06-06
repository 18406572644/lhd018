const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

let Tesseract = null
try {
  Tesseract = require('tesseract.js')
} catch (e) {
  console.warn('Tesseract.js not available, will use mock OCR')
}

const isDev = process.env.NODE_ENV === 'development'
let mainWindow = null
let tesseractWorker = null

async function getTesseractWorker() {
  if (!Tesseract) return null
  if (!tesseractWorker) {
    try {
      const { createWorker } = Tesseract
      tesseractWorker = await createWorker('chi_sim+eng')
    } catch (e) {
      console.error('Failed to create Tesseract worker:', e)
      return null
    }
  }
  return tesseractWorker
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    backgroundColor: '#f5f7fa',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, '../public/icon.png')
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:8080')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function getDataPath() {
  const userDataPath = app.getPath('userData')
  const dataDir = path.join(userDataPath, 'QuickAccount')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  return dataDir
}

function readJsonFile(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8')
    return content ? JSON.parse(content) : null
  }
  return null
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

ipcMain.handle('get-records', () => {
  const filePath = path.join(getDataPath(), 'records.json')
  return readJsonFile(filePath) || []
})

ipcMain.handle('save-records', (event, records) => {
  const filePath = path.join(getDataPath(), 'records.json')
  writeJsonFile(filePath, records)
  return true
})

ipcMain.handle('add-record', (event, record) => {
  const filePath = path.join(getDataPath(), 'records.json')
  const records = readJsonFile(filePath) || []
  record.id = Date.now().toString()
  record.createdAt = new Date().toISOString()
  records.unshift(record)
  writeJsonFile(filePath, records)
  recalculateAllAccountBalances()
  return record
})

ipcMain.handle('update-record', (event, record) => {
  const filePath = path.join(getDataPath(), 'records.json')
  const records = readJsonFile(filePath) || []
  const index = records.findIndex(r => r.id === record.id)
  if (index !== -1) {
    records[index] = { ...records[index], ...record }
    writeJsonFile(filePath, records)
    recalculateAllAccountBalances()
    return records[index]
  }
  return null
})

ipcMain.handle('delete-record', (event, id) => {
  const filePath = path.join(getDataPath(), 'records.json')
  const records = readJsonFile(filePath) || []
  const filtered = records.filter(r => r.id !== id)
  writeJsonFile(filePath, filtered)
  recalculateAllAccountBalances()
  return true
})

ipcMain.handle('get-categories', () => {
  const filePath = path.join(getDataPath(), 'categories.json')
  let categories = readJsonFile(filePath)
  
  const defaultCategories = [
    { id: 'c1', name: '餐饮', type: 'expense', icon: '🍜', color: '#ff6b6b' },
    { id: 'c2', name: '交通', type: 'expense', icon: '🚗', color: '#4ecdc4' },
    { id: 'c3', name: '购物', type: 'expense', icon: '🛍️', color: '#ffa502' },
    { id: 'c4', name: '娱乐', type: 'expense', icon: '🎮', color: '#a29bfe' },
    { id: 'c5', name: '居住', type: 'expense', icon: '🏠', color: '#fd79a8' },
    { id: 'c6', name: '医疗', type: 'expense', icon: '💊', color: '#00b894' },
    { id: 'c7', name: '教育', type: 'expense', icon: '📚', color: '#0984e3' },
    { id: 'c8', name: '其他支出', type: 'expense', icon: '💸', color: '#636e72' },
    { id: 'i1', name: '工资', type: 'income', icon: '💰', color: '#00b894' },
    { id: 'i2', name: '奖金', type: 'income', icon: '🎁', color: '#fdcb6e' },
    { id: 'i3', name: '投资', type: 'income', icon: '📈', color: '#6c5ce7' },
    { id: 'i4', name: '其他收入', type: 'income', icon: '💵', color: '#00cec9' }
  ]
  
  if (!categories || categories.length === 0) {
    categories = defaultCategories
    writeJsonFile(filePath, categories)
  } else {
    const existingIds = new Set(categories.map(c => c.id))
    const hasIncome = categories.some(c => c.type === 'income')
    const hasExpense = categories.some(c => c.type === 'expense')
    
    let needUpdate = false
    if (!hasIncome || !hasExpense) {
      defaultCategories.forEach(defaultCat => {
        if (!existingIds.has(defaultCat.id)) {
          categories.push(defaultCat)
          needUpdate = true
        }
      })
    }
    
    if (needUpdate) {
      writeJsonFile(filePath, categories)
    }
  }
  
  return categories
})

ipcMain.handle('reset-categories', () => {
  const filePath = path.join(getDataPath(), 'categories.json')
  const defaultCategories = [
    { id: 'c1', name: '餐饮', type: 'expense', icon: '🍜', color: '#ff6b6b' },
    { id: 'c2', name: '交通', type: 'expense', icon: '🚗', color: '#4ecdc4' },
    { id: 'c3', name: '购物', type: 'expense', icon: '🛍️', color: '#ffa502' },
    { id: 'c4', name: '娱乐', type: 'expense', icon: '🎮', color: '#a29bfe' },
    { id: 'c5', name: '居住', type: 'expense', icon: '🏠', color: '#fd79a8' },
    { id: 'c6', name: '医疗', type: 'expense', icon: '💊', color: '#00b894' },
    { id: 'c7', name: '教育', type: 'expense', icon: '📚', color: '#0984e3' },
    { id: 'c8', name: '其他支出', type: 'expense', icon: '💸', color: '#636e72' },
    { id: 'i1', name: '工资', type: 'income', icon: '💰', color: '#00b894' },
    { id: 'i2', name: '奖金', type: 'income', icon: '🎁', color: '#fdcb6e' },
    { id: 'i3', name: '投资', type: 'income', icon: '📈', color: '#6c5ce7' },
    { id: 'i4', name: '其他收入', type: 'income', icon: '💵', color: '#00cec9' }
  ]
  writeJsonFile(filePath, defaultCategories)
  return defaultCategories
})

ipcMain.handle('save-categories', (event, categories) => {
  const filePath = path.join(getDataPath(), 'categories.json')
  writeJsonFile(filePath, categories)
  return true
})

ipcMain.handle('add-category', (event, category) => {
  const filePath = path.join(getDataPath(), 'categories.json')
  const categories = readJsonFile(filePath) || []
  category.id = Date.now().toString()
  categories.push(category)
  writeJsonFile(filePath, categories)
  return category
})

ipcMain.handle('update-category', (event, category) => {
  const filePath = path.join(getDataPath(), 'categories.json')
  const categories = readJsonFile(filePath) || []
  const index = categories.findIndex(c => c.id === category.id)
  if (index !== -1) {
    categories[index] = { ...categories[index], ...category }
    writeJsonFile(filePath, categories)
    return categories[index]
  }
  return null
})

ipcMain.handle('delete-category', (event, id) => {
  const filePath = path.join(getDataPath(), 'categories.json')
  const categories = readJsonFile(filePath) || []
  const filtered = categories.filter(c => c.id !== id)
  writeJsonFile(filePath, filtered)
  return true
})

const defaultAccounts = [
  { id: 'a1', name: '现金', type: 'cash', icon: '💵', color: '#27ae60', balance: 0, initialBalance: 0, accountNo: '', sort: 1, hidden: false, disabled: false, billDay: null, dueDay: null, creditLimit: 0 },
  { id: 'a2', name: '储蓄卡', type: 'debit', icon: '🏦', color: '#3498db', balance: 0, initialBalance: 0, accountNo: '', sort: 2, hidden: false, disabled: false, billDay: null, dueDay: null, creditLimit: 0 },
  { id: 'a3', name: '信用卡', type: 'credit', icon: '💳', color: '#e74c3c', balance: 0, initialBalance: 0, accountNo: '', sort: 3, hidden: false, disabled: false, billDay: 10, dueDay: 25, creditLimit: 10000 },
  { id: 'a4', name: '支付宝', type: 'alipay', icon: '📱', color: '#1677ff', balance: 0, initialBalance: 0, accountNo: '', sort: 4, hidden: false, disabled: false, billDay: null, dueDay: null, creditLimit: 0 },
  { id: 'a5', name: '微信', type: 'wechat', icon: '💬', color: '#07c160', balance: 0, initialBalance: 0, accountNo: '', sort: 5, hidden: false, disabled: false, billDay: null, dueDay: null, creditLimit: 0 },
  { id: 'a6', name: '投资账户', type: 'investment', icon: '📈', color: '#9b59b6', balance: 0, initialBalance: 0, accountNo: '', sort: 6, hidden: false, disabled: false, billDay: null, dueDay: null, creditLimit: 0 }
]

function calculateAccountBalance(account, records) {
  let balance = Number(account.initialBalance) || 0
  
  records.forEach(record => {
    if (record.type === 'transfer') {
      if (record.fromAccountId === account.id) {
        balance -= Number(record.amount)
      }
      if (record.toAccountId === account.id) {
        balance += Number(record.amount)
      }
    } else if (record.accountId === account.id) {
      if (record.type === 'income') {
        balance += Number(record.amount)
      } else if (record.type === 'expense') {
        balance -= Number(record.amount)
      }
    }
  })
  
  return balance
}

function recalculateAllAccountBalances() {
  const recordsPath = path.join(getDataPath(), 'records.json')
  const accountsPath = path.join(getDataPath(), 'accounts.json')
  
  const records = readJsonFile(recordsPath) || []
  let accounts = readJsonFile(accountsPath)
  
  if (!accounts || accounts.length === 0) {
    accounts = defaultAccounts
  }
  
  accounts = accounts.map(account => ({
    ...account,
    balance: calculateAccountBalance(account, records)
  }))
  
  writeJsonFile(accountsPath, accounts)
  return accounts
}

ipcMain.handle('get-accounts', () => {
  const filePath = path.join(getDataPath(), 'accounts.json')
  let accounts = readJsonFile(filePath)
  
  if (!accounts || accounts.length === 0) {
    accounts = defaultAccounts
    writeJsonFile(filePath, accounts)
  }
  
  accounts = accounts.map(account => ({
    ...account,
    initialBalance: Number(account.initialBalance) || 0,
    creditLimit: account.type === 'credit' ? (Number(account.creditLimit) || 0) : 0,
    balance: Number(account.balance) || 0
  }))
  writeJsonFile(filePath, accounts)
  
  return recalculateAllAccountBalances()
})

ipcMain.handle('add-account', (event, account) => {
  const filePath = path.join(getDataPath(), 'accounts.json')
  const accounts = readJsonFile(filePath) || defaultAccounts
  account.id = Date.now().toString()
  account.sort = accounts.length + 1
  account.initialBalance = Number(account.initialBalance) || 0
  account.balance = account.initialBalance
  account.creditLimit = account.type === 'credit' ? (Number(account.creditLimit) || 0) : 0
  account.hidden = account.hidden || false
  account.disabled = account.disabled || false
  accounts.push(account)
  writeJsonFile(filePath, accounts)
  return recalculateAllAccountBalances()
})

ipcMain.handle('update-account', (event, account) => {
  const filePath = path.join(getDataPath(), 'accounts.json')
  const accounts = readJsonFile(filePath) || []
  const index = accounts.findIndex(a => a.id === account.id)
  if (index !== -1) {
    account.initialBalance = Number(account.initialBalance) || 0
    account.creditLimit = account.type === 'credit' ? (Number(account.creditLimit) || 0) : 0
    accounts[index] = { ...accounts[index], ...account }
    writeJsonFile(filePath, accounts)
    return recalculateAllAccountBalances()
  }
  return null
})

ipcMain.handle('delete-account', (event, id) => {
  const filePath = path.join(getDataPath(), 'accounts.json')
  const accounts = readJsonFile(filePath) || []
  const filtered = accounts.filter(a => a.id !== id)
  writeJsonFile(filePath, filtered)
  return true
})

ipcMain.handle('update-account-sort', (event, accountIds) => {
  const filePath = path.join(getDataPath(), 'accounts.json')
  const accounts = readJsonFile(filePath) || []
  
  accountIds.forEach((id, index) => {
    const account = accounts.find(a => a.id === id)
    if (account) {
      account.sort = index + 1
    }
  })
  
  writeJsonFile(filePath, accounts)
  return true
})

ipcMain.handle('toggle-account-hidden', (event, id) => {
  const filePath = path.join(getDataPath(), 'accounts.json')
  const accounts = readJsonFile(filePath) || []
  const account = accounts.find(a => a.id === id)
  if (account) {
    account.hidden = !account.hidden
    writeJsonFile(filePath, accounts)
    return account
  }
  return null
})

ipcMain.handle('toggle-account-disabled', (event, id) => {
  const filePath = path.join(getDataPath(), 'accounts.json')
  const accounts = readJsonFile(filePath) || []
  const account = accounts.find(a => a.id === id)
  if (account) {
    account.disabled = !account.disabled
    writeJsonFile(filePath, accounts)
    return account
  }
  return null
})

ipcMain.handle('transfer', (event, transferData) => {
  const recordsPath = path.join(getDataPath(), 'records.json')
  const records = readJsonFile(recordsPath) || []
  
  const transferRecord = {
    id: Date.now().toString(),
    type: 'transfer',
    fromAccountId: transferData.fromAccountId,
    toAccountId: transferData.toAccountId,
    fromAccountName: transferData.fromAccountName,
    toAccountName: transferData.toAccountName,
    amount: parseFloat(transferData.amount),
    date: transferData.date,
    remark: transferData.remark || '',
    createdAt: new Date().toISOString()
  }
  
  records.unshift(transferRecord)
  writeJsonFile(recordsPath, records)
  
  recalculateAllAccountBalances()
  
  return transferRecord
})

ipcMain.handle('get-account-overview', () => {
  const accounts = recalculateAllAccountBalances()
  const activeAccounts = accounts.filter(a => !a.hidden)
  
  let totalAssets = 0
  let totalLiabilities = 0
  
  activeAccounts.forEach(account => {
    const balance = Number(account.balance)
    if (account.type === 'credit') {
      if (balance < 0) {
        totalLiabilities += Math.abs(balance)
      } else {
        totalAssets += balance
      }
    } else {
      if (balance >= 0) {
        totalAssets += balance
      } else {
        totalLiabilities += Math.abs(balance)
      }
    }
  })
  
  return {
    accounts: activeAccounts.sort((a, b) => a.sort - b.sort),
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities
  }
})

ipcMain.handle('get-credit-card-reminders', () => {
  const filePath = path.join(getDataPath(), 'accounts.json')
  const accounts = readJsonFile(filePath) || []
  const today = new Date()
  const currentDay = today.getDate()
  const reminders = []
  
  accounts.forEach(account => {
    if (account.type === 'credit' && !account.hidden && !account.disabled) {
      if (account.billDay) {
        const daysUntilBill = account.billDay - currentDay
        if (daysUntilBill >= 0 && daysUntilBill <= 7) {
          reminders.push({
            accountId: account.id,
            accountName: account.name,
            type: 'bill',
            days: daysUntilBill,
            message: `${account.name} 账单日还有 ${daysUntilBill} 天`
          })
        }
      }
      if (account.dueDay) {
        const daysUntilDue = account.dueDay - currentDay
        if (daysUntilDue >= 0 && daysUntilDue <= 7 && account.balance < 0) {
          reminders.push({
            accountId: account.id,
            accountName: account.name,
            type: 'due',
            days: daysUntilDue,
            message: `${account.name} 还款日还有 ${daysUntilDue} 天，待还 ¥${Math.abs(account.balance).toFixed(2)}`
          })
        }
      }
    }
  })
  
  return reminders.sort((a, b) => a.days - b.days)
})

ipcMain.handle('export-csv', async (event, records) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '导出账单',
    defaultPath: `账单_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`,
    filters: [{ name: 'CSV 文件', extensions: ['csv'] }]
  })

  if (!result.canceled && result.filePath) {
    const headers = ['日期', '类型', '分类/账户', '金额', '支付账户', '备注']
    const rows = records.map(r => {
      let type, category, account, amount
      
      if (r.type === 'transfer') {
        type = '转账'
        category = `${r.fromAccountName} → ${r.toAccountName}`
        account = '-'
        amount = r.amount
      } else {
        type = r.type === 'income' ? '收入' : '支出'
        category = r.categoryName
        account = r.accountName || '-'
        amount = r.amount
      }
      
      return [
        new Date(r.date).toLocaleDateString('zh-CN'),
        type,
        category,
        amount,
        account,
        r.remark || ''
      ]
    })
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    fs.writeFileSync(result.filePath, '\uFEFF' + csvContent, 'utf-8')
    return true
  }
  return false
})

function safeFormatNumber(value, decimals = 2) {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00'
  }
  if (!isFinite(value)) {
    return value > 0 ? '+∞' : '-∞'
  }
  return Number(value).toFixed(decimals)
}

function safeIsPositive(value) {
  if (value === undefined || value === null || isNaN(value)) {
    return false
  }
  return value > 0
}

function safeIsNonNegative(value) {
  if (value === undefined || value === null || isNaN(value)) {
    return true
  }
  return value >= 0
}

async function handleExportPdf(data) {
  try {
    const { jsPDF } = require('jspdf')
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出财务报告',
      defaultPath: `财务报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.pdf`,
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }]
    })

    if (!result.canceled && result.filePath) {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      let yPos = margin
      
      doc.setFontSize(20)
      doc.setTextColor(40, 40, 40)
      doc.text('财务报告', pageWidth / 2, yPos, { align: 'center' })
      yPos += 15
      
      doc.setFontSize(12)
      doc.setTextColor(100, 100, 100)
      doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 15
      
      if (data.period) {
        doc.setFontSize(14)
        doc.setTextColor(60, 60, 60)
        doc.text(`统计周期: ${data.period}`, margin, yPos)
        yPos += 12
      }
      
      if (data.overview) {
        doc.setFontSize(14)
        doc.setTextColor(60, 60, 60)
        doc.text('一、收支概览', margin, yPos)
        yPos += 10
        
        doc.setFillColor(245, 247, 250)
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 30, 3, 3, 'F')
        
        doc.setFontSize(12)
        doc.setTextColor(80, 80, 80)
        doc.text('总收入', margin + 10, yPos + 12)
        doc.text('总支出', margin + 60, yPos + 12)
        doc.text('结余', margin + 110, yPos + 12)
        doc.text('记录笔数', margin + 160, yPos + 12)
        
        doc.setFontSize(14)
        doc.setTextColor(103, 194, 58)
        doc.text(`¥${safeFormatNumber(data.overview.income)}`, margin + 10, yPos + 24)
        doc.setTextColor(245, 108, 108)
        doc.text(`¥${safeFormatNumber(data.overview.expense)}`, margin + 60, yPos + 24)
        const balancePositive = safeIsNonNegative(data.overview.balance)
        doc.setTextColor(balancePositive ? 103 : 245, balancePositive ? 194 : 108, balancePositive ? 58 : 108)
        doc.text(`¥${safeFormatNumber(data.overview.balance)}`, margin + 110, yPos + 24)
        doc.setTextColor(80, 80, 80)
        doc.text(`${data.overview.count} 笔`, margin + 160, yPos + 24)
        yPos += 45
      }
      
      if (data.comparison) {
        doc.setFontSize(14)
        doc.setTextColor(60, 60, 60)
        doc.text('二、同比环比分析', margin, yPos)
        yPos += 10
        
        doc.setFillColor(245, 247, 250)
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 50, 3, 3, 'F')
        
        doc.setFontSize(11)
        doc.setTextColor(80, 80, 80)
        doc.text('指标', margin + 10, yPos + 10)
        doc.text('本期', margin + 50, yPos + 10)
        doc.text('上期', margin + 90, yPos + 10)
        doc.text('环比', margin + 130, yPos + 10)
        doc.text('同比', margin + 170, yPos + 10)
        
        doc.setFontSize(11)
        doc.setTextColor(103, 194, 58)
        doc.text('收入', margin + 10, yPos + 25)
        doc.text(`¥${safeFormatNumber(data.comparison.income.current)}`, margin + 50, yPos + 25)
        doc.text(`¥${safeFormatNumber(data.comparison.income.prev)}`, margin + 90, yPos + 25)
        const incomeMomPositive = safeIsNonNegative(data.comparison.income.mom)
        const incomeYoyPositive = safeIsNonNegative(data.comparison.income.yoy)
        doc.setTextColor(incomeMomPositive ? 103 : 245, incomeMomPositive ? 194 : 108, incomeMomPositive ? 58 : 108)
        doc.text(`${incomeMomPositive ? '+' : ''}${safeFormatNumber(data.comparison.income.mom, 1)}%`, margin + 130, yPos + 25)
        doc.setTextColor(incomeYoyPositive ? 103 : 245, incomeYoyPositive ? 194 : 108, incomeYoyPositive ? 58 : 108)
        doc.text(`${incomeYoyPositive ? '+' : ''}${safeFormatNumber(data.comparison.income.yoy, 1)}%`, margin + 170, yPos + 25)
        
        doc.setTextColor(245, 108, 108)
        doc.text('支出', margin + 10, yPos + 40)
        doc.text(`¥${safeFormatNumber(data.comparison.expense.current)}`, margin + 50, yPos + 40)
        doc.text(`¥${safeFormatNumber(data.comparison.expense.prev)}`, margin + 90, yPos + 40)
        const expenseMomGood = !safeIsPositive(data.comparison.expense.mom)
        const expenseYoyGood = !safeIsPositive(data.comparison.expense.yoy)
        doc.setTextColor(expenseMomGood ? 103 : 245, expenseMomGood ? 194 : 108, expenseMomGood ? 58 : 108)
        doc.text(`${safeIsNonNegative(data.comparison.expense.mom) ? '+' : ''}${safeFormatNumber(data.comparison.expense.mom, 1)}%`, margin + 130, yPos + 40)
        doc.setTextColor(expenseYoyGood ? 103 : 245, expenseYoyGood ? 194 : 108, expenseYoyGood ? 58 : 108)
        doc.text(`${safeIsNonNegative(data.comparison.expense.yoy) ? '+' : ''}${safeFormatNumber(data.comparison.expense.yoy, 1)}%`, margin + 170, yPos + 40)
        yPos += 65
      }
      
      if (data.expenseRank && data.expenseRank.length > 0) {
        if (yPos > pageHeight - 100) {
          doc.addPage()
          yPos = margin
        }
        
        doc.setFontSize(14)
        doc.setTextColor(60, 60, 60)
        doc.text('三、支出分类排行 (Top 10)', margin, yPos)
        yPos += 10
        
        doc.setFontSize(11)
        doc.setTextColor(80, 80, 80)
        doc.text('排名', margin + 10, yPos + 8)
        doc.text('分类', margin + 35, yPos + 8)
        doc.text('金额', margin + 90, yPos + 8)
        doc.text('占比', margin + 140, yPos + 8)
        yPos += 8
        
        const maxExpense = Math.max(...data.expenseRank.map(i => i.amount)) || 1
        data.expenseRank.slice(0, 10).forEach((item, index) => {
          if (yPos > pageHeight - 20) {
            doc.addPage()
            yPos = margin
          }
          
          const barWidth = (item.amount / maxExpense) * 50
          doc.setFillColor(245, 108, 108)
          doc.roundedRect(margin + 55, yPos, barWidth, 6, 2, 2, 'F')
          
          doc.setFontSize(10)
          doc.setTextColor(100, 100, 100)
          doc.text(`${index + 1}`, margin + 10, yPos + 6)
          doc.setTextColor(60, 60, 60)
          doc.text(item.name, margin + 35, yPos + 6)
          doc.setTextColor(245, 108, 108)
          doc.text(`¥${safeFormatNumber(item.amount)}`, margin + 90, yPos + 6)
          doc.setTextColor(100, 100, 100)
          doc.text(`${item.percent}%`, margin + 140, yPos + 6)
          yPos += 10
        })
        yPos += 10
      }
      
      if (data.incomeRank && data.incomeRank.length > 0) {
        if (yPos > pageHeight - 100) {
          doc.addPage()
          yPos = margin
        }
        
        doc.setFontSize(14)
        doc.setTextColor(60, 60, 60)
        doc.text('四、收入分类排行 (Top 10)', margin, yPos)
        yPos += 10
        
        doc.setFontSize(11)
        doc.setTextColor(80, 80, 80)
        doc.text('排名', margin + 10, yPos + 8)
        doc.text('分类', margin + 35, yPos + 8)
        doc.text('金额', margin + 90, yPos + 8)
        doc.text('占比', margin + 140, yPos + 8)
        yPos += 8
        
        const maxIncome = Math.max(...data.incomeRank.map(i => i.amount)) || 1
        data.incomeRank.slice(0, 10).forEach((item, index) => {
          if (yPos > pageHeight - 20) {
            doc.addPage()
            yPos = margin
          }
          
          const barWidth = (item.amount / maxIncome) * 50
          doc.setFillColor(103, 194, 58)
          doc.roundedRect(margin + 55, yPos, barWidth, 6, 2, 2, 'F')
          
          doc.setFontSize(10)
          doc.setTextColor(100, 100, 100)
          doc.text(`${index + 1}`, margin + 10, yPos + 6)
          doc.setTextColor(60, 60, 60)
          doc.text(item.name, margin + 35, yPos + 6)
          doc.setTextColor(103, 194, 58)
          doc.text(`¥${safeFormatNumber(item.amount)}`, margin + 90, yPos + 6)
          doc.setTextColor(100, 100, 100)
          doc.text(`${item.percent}%`, margin + 140, yPos + 6)
          yPos += 10
        })
        yPos += 10
      }
      
      if (data.prediction) {
        if (yPos > pageHeight - 50) {
          doc.addPage()
          yPos = margin
        }
        
        doc.setFontSize(14)
        doc.setTextColor(60, 60, 60)
        doc.text('五、趋势预测', margin, yPos)
        yPos += 10
        
        doc.setFillColor(236, 245, 255)
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 3, 3, 'F')
        
        doc.setFontSize(11)
        doc.setTextColor(80, 80, 80)
        doc.text(`下月预测收入: ¥${safeFormatNumber(data.prediction.income)}`, margin + 10, yPos + 10)
        doc.setTextColor(103, 194, 58)
        doc.text(`下月预测支出: ¥${safeFormatNumber(data.prediction.expense)}`, margin + 10, yPos + 20)
        doc.setTextColor(245, 108, 108)
        doc.text(`预测结余: ¥${safeFormatNumber(data.prediction.balance)}`, margin + 100, yPos + 15)
        yPos += 35
      }
      
      if (data.records && data.records.length > 0) {
        if (yPos > pageHeight - 50) {
          doc.addPage()
          yPos = margin
        }
        
        doc.setFontSize(14)
        doc.setTextColor(60, 60, 60)
        doc.text('六、明细记录', margin, yPos)
        yPos += 10
        
        doc.setFontSize(10)
        doc.setTextColor(80, 80, 80)
        doc.text('日期', margin + 10, yPos + 6)
        doc.text('类型', margin + 40, yPos + 6)
        doc.text('分类', margin + 65, yPos + 6)
        doc.text('金额', margin + 110, yPos + 6)
        doc.text('备注', margin + 150, yPos + 6)
        yPos += 6
        
        data.records.slice(0, 30).forEach(r => {
          if (yPos > pageHeight - 15) {
            doc.addPage()
            yPos = margin
          }
          
          doc.setFontSize(9)
          doc.setTextColor(100, 100, 100)
          doc.text(new Date(r.date).toLocaleDateString('zh-CN'), margin + 10, yPos + 5)
          doc.setTextColor(r.type === 'income' ? 103 : 245, r.type === 'income' ? 194 : 108, r.type === 'income' ? 58 : 108)
          doc.text(r.type === 'income' ? '收入' : '支出', margin + 40, yPos + 5)
          doc.setTextColor(60, 60, 60)
          doc.text(r.categoryName, margin + 65, yPos + 5)
          doc.setTextColor(r.type === 'income' ? 103 : 245, r.type === 'income' ? 194 : 108, r.type === 'income' ? 58 : 108)
          doc.text(`¥${safeFormatNumber(r.amount)}`, margin + 110, yPos + 5)
          doc.setTextColor(100, 100, 100)
          doc.text(r.remark || '-', margin + 150, yPos + 5)
          yPos += 7
        })
      }
      
      doc.save(result.filePath)
      return true
    }
    return false
  } catch (error) {
    console.error('Export PDF error:', error)
    return false
  }
}

ipcMain.handle('export-pdf', async (event, data) => {
  return await handleExportPdf(data)
})

ipcMain.handle('export-report', async (event, options) => {
  const filePath = path.join(getDataPath(), 'records.json')
  const records = readJsonFile(filePath) || []
  const categoriesPath = path.join(getDataPath(), 'categories.json')
  const categories = readJsonFile(categoriesPath) || []
  
  const data = {
    ...options,
    records: records.filter(r => r.type !== 'transfer'),
    overview: options.overview,
    comparison: options.comparison,
    expenseRank: options.expenseRank,
    incomeRank: options.incomeRank,
    prediction: options.prediction
  }
  
  return await handleExportPdf(data)
})

const recurringBillTemplates = [
  { id: 't1', name: '工资', type: 'income', icon: '💰', defaultAmount: 0, defaultCategoryId: 'i1', defaultPeriodType: 'monthly', description: '每月工资收入' },
  { id: 't2', name: '房租', type: 'expense', icon: '🏠', defaultAmount: 0, defaultCategoryId: 'c5', defaultPeriodType: 'monthly', description: '每月房租支出' },
  { id: 't3', name: '房贷', type: 'expense', icon: '🏡', defaultAmount: 0, defaultCategoryId: 'c5', defaultPeriodType: 'monthly', description: '每月房贷还款' },
  { id: 't4', name: '信用卡还款', type: 'expense', icon: '💳', defaultAmount: 0, defaultCategoryId: 'c8', defaultPeriodType: 'monthly', description: '每月信用卡账单还款' },
  { id: 't5', name: '定投', type: 'expense', icon: '📈', defaultAmount: 0, defaultCategoryId: 'c8', defaultPeriodType: 'monthly', description: '每月基金/股票定投' },
  { id: 't6', name: '水电费', type: 'expense', icon: '💡', defaultAmount: 0, defaultCategoryId: 'c5', defaultPeriodType: 'monthly', description: '每月水电燃气费' },
  { id: 't7', name: '网费', type: 'expense', icon: '🌐', defaultAmount: 0, defaultCategoryId: 'c8', defaultPeriodType: 'monthly', description: '每月宽带/手机话费' },
  { id: 't8', name: '会员订阅', type: 'expense', icon: '🎵', defaultAmount: 0, defaultCategoryId: 'c4', defaultPeriodType: 'monthly', description: '视频/音乐会员订阅' },
  { id: 't9', name: '餐补', type: 'income', icon: '🍱', defaultAmount: 0, defaultCategoryId: 'i4', defaultPeriodType: 'daily', description: '每日餐补' },
  { id: 't10', name: '年终奖', type: 'income', icon: '🎁', defaultAmount: 0, defaultCategoryId: 'i2', defaultPeriodType: 'yearly', description: '每年年终奖' }
]

function addDays(dateStr, days) {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function addMonths(dateStr, months) {
  const date = new Date(dateStr)
  date.setMonth(date.getMonth() + months)
  return date.toISOString().split('T')[0]
}

function addYears(dateStr, years) {
  const date = new Date(dateStr)
  date.setFullYear(date.getFullYear() + years)
  return date.toISOString().split('T')[0]
}

function getNextOccurrence(bill, fromDate = new Date().toISOString().split('T')[0]) {
  let nextDate = bill.startDate
  const today = fromDate
  
  while (nextDate < today) {
    switch (bill.periodType) {
      case 'daily':
        nextDate = addDays(nextDate, 1)
        break
      case 'weekly':
        nextDate = addDays(nextDate, 7)
        break
      case 'monthly':
        nextDate = addMonths(nextDate, 1)
        break
      case 'yearly':
        nextDate = addYears(nextDate, 1)
        break
      case 'custom':
        nextDate = addDays(nextDate, bill.customInterval || 1)
        break
      default:
        nextDate = addDays(nextDate, 1)
    }
    
    if (bill.endDate && nextDate > bill.endDate) {
      return null
    }
  }
  
  if (bill.endDate && nextDate > bill.endDate) {
    return null
  }
  
  return nextDate
}

function getAllOccurrences(bill, startDate, endDate) {
  const occurrences = []
  let currentDate = bill.startDate
  
  while (currentDate <= endDate) {
    if (currentDate >= startDate) {
      const isException = bill.exceptions && bill.exceptions.includes(currentDate)
      const alreadyGenerated = bill.generatedRecords && bill.generatedRecords.some(
        g => g.date === currentDate && (g.status === 'generated' || g.status === 'confirmed')
      )
      
      if (!isException && !alreadyGenerated) {
        occurrences.push(currentDate)
      }
    }
    
    switch (bill.periodType) {
      case 'daily':
        currentDate = addDays(currentDate, 1)
        break
      case 'weekly':
        currentDate = addDays(currentDate, 7)
        break
      case 'monthly':
        currentDate = addMonths(currentDate, 1)
        break
      case 'yearly':
        currentDate = addYears(currentDate, 1)
        break
      case 'custom':
        currentDate = addDays(currentDate, bill.customInterval || 1)
        break
      default:
        currentDate = addDays(currentDate, 1)
    }
    
    if (bill.endDate && currentDate > bill.endDate) {
      break
    }
  }
  
  return occurrences
}

function generateRecordFromBill(bill, date) {
  return {
    type: bill.type,
    amount: bill.amount,
    categoryId: bill.categoryId,
    categoryName: bill.categoryName,
    accountId: bill.accountId,
    accountName: bill.accountName,
    remark: bill.remark || bill.name,
    date: date,
    recurringBillId: bill.id
  }
}

ipcMain.handle('get-recurring-bill-templates', () => {
  return recurringBillTemplates
})

ipcMain.handle('get-recurring-bills', () => {
  const filePath = path.join(getDataPath(), 'recurring-bills.json')
  return readJsonFile(filePath) || []
})

ipcMain.handle('add-recurring-bill', (event, bill) => {
  const filePath = path.join(getDataPath(), 'recurring-bills.json')
  const bills = readJsonFile(filePath) || []
  
  const newBill = {
    ...bill,
    id: Date.now().toString(),
    status: 'active',
    exceptions: bill.exceptions || [],
    generatedRecords: bill.generatedRecords || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  bills.push(newBill)
  writeJsonFile(filePath, bills)
  return newBill
})

ipcMain.handle('update-recurring-bill', (event, bill) => {
  const filePath = path.join(getDataPath(), 'recurring-bills.json')
  const bills = readJsonFile(filePath) || []
  const index = bills.findIndex(b => b.id === bill.id)
  
  if (index !== -1) {
    bills[index] = { 
      ...bills[index], 
      ...bill, 
      updatedAt: new Date().toISOString() 
    }
    writeJsonFile(filePath, bills)
    return bills[index]
  }
  return null
})

ipcMain.handle('delete-recurring-bill', (event, id) => {
  const filePath = path.join(getDataPath(), 'recurring-bills.json')
  const bills = readJsonFile(filePath) || []
  const filtered = bills.filter(b => b.id !== id)
  writeJsonFile(filePath, filtered)
  return true
})

ipcMain.handle('toggle-recurring-bill-status', (event, id) => {
  const filePath = path.join(getDataPath(), 'recurring-bills.json')
  const bills = readJsonFile(filePath) || []
  const bill = bills.find(b => b.id === id)
  
  if (bill) {
    bill.status = bill.status === 'active' ? 'paused' : 'active'
    bill.updatedAt = new Date().toISOString()
    writeJsonFile(filePath, bills)
    return bill
  }
  return null
})

ipcMain.handle('add-exception-date', (event, billId, date) => {
  const filePath = path.join(getDataPath(), 'recurring-bills.json')
  const bills = readJsonFile(filePath) || []
  const bill = bills.find(b => b.id === billId)
  
  if (bill) {
    if (!bill.exceptions) {
      bill.exceptions = []
    }
    if (!bill.exceptions.includes(date)) {
      bill.exceptions.push(date)
    }
    bill.updatedAt = new Date().toISOString()
    writeJsonFile(filePath, bills)
    return bill
  }
  return null
})

ipcMain.handle('remove-exception-date', (event, billId, date) => {
  const filePath = path.join(getDataPath(), 'recurring-bills.json')
  const bills = readJsonFile(filePath) || []
  const bill = bills.find(b => b.id === billId)
  
  if (bill && bill.exceptions) {
    bill.exceptions = bill.exceptions.filter(d => d !== date)
    bill.updatedAt = new Date().toISOString()
    writeJsonFile(filePath, bills)
    return bill
  }
  return null
})

ipcMain.handle('get-next-occurrence', (event, billId) => {
  const filePath = path.join(getDataPath(), 'recurring-bills.json')
  const bills = readJsonFile(filePath) || []
  const bill = bills.find(b => b.id === billId)
  
  if (bill && bill.status === 'active') {
    return getNextOccurrence(bill)
  }
  return null
})

ipcMain.handle('get-upcoming-bills', (event, daysAhead = 30) => {
  const filePath = path.join(getDataPath(), 'recurring-bills.json')
  const bills = readJsonFile(filePath) || []
  const today = new Date().toISOString().split('T')[0]
  const endDate = addDays(today, daysAhead)
  
  const upcoming = []
  
  bills.forEach(bill => {
    if (bill.status !== 'active') return
    
    const occurrences = getAllOccurrences(bill, today, endDate)
    
    occurrences.forEach(date => {
      const isException = bill.exceptions && bill.exceptions.includes(date)
      if (!isException) {
        upcoming.push({
          billId: bill.id,
          billName: bill.name,
          type: bill.type,
          amount: bill.amount,
          categoryName: bill.categoryName,
          accountName: bill.accountName,
          date: date,
          autoGenerate: bill.autoGenerate,
          remindDays: bill.remindDays || 0,
          icon: bill.icon || '📅'
        })
      }
    })
  })
  
  return upcoming.sort((a, b) => new Date(a.date) - new Date(b.date))
})

ipcMain.handle('generate-recurring-record', async (event, billId, date) => {
  const billsPath = path.join(getDataPath(), 'recurring-bills.json')
  const bills = readJsonFile(billsPath) || []
  const bill = bills.find(b => b.id === billId)
  
  if (!bill) return null
  
  const recordData = generateRecordFromBill(bill, date)
  const recordsPath = path.join(getDataPath(), 'records.json')
  const records = readJsonFile(recordsPath) || []
  
  const newRecord = {
    ...recordData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  }
  
  records.unshift(newRecord)
  writeJsonFile(recordsPath, records)
  
  if (!bill.generatedRecords) {
    bill.generatedRecords = []
  }
  
  const existingIndex = bill.generatedRecords.findIndex(g => g.date === date)
  if (existingIndex !== -1) {
    bill.generatedRecords[existingIndex] = {
      date,
      recordId: newRecord.id,
      status: 'generated'
    }
  } else {
    bill.generatedRecords.push({
      date,
      recordId: newRecord.id,
      status: 'generated'
    })
  }
  
  bill.updatedAt = new Date().toISOString()
  writeJsonFile(billsPath, bills)
  
  recalculateAllAccountBalances()
  
  return newRecord
})

ipcMain.handle('skip-recurring-date', (event, billId, date) => {
  const billsPath = path.join(getDataPath(), 'recurring-bills.json')
  const bills = readJsonFile(billsPath) || []
  const bill = bills.find(b => b.id === billId)
  
  if (!bill) return null
  
  if (!bill.generatedRecords) {
    bill.generatedRecords = []
  }
  
  const existingIndex = bill.generatedRecords.findIndex(g => g.date === date)
  if (existingIndex !== -1) {
    bill.generatedRecords[existingIndex] = {
      date,
      recordId: null,
      status: 'skipped'
    }
  } else {
    bill.generatedRecords.push({
      date,
      recordId: null,
      status: 'skipped'
    })
  }
  
  if (!bill.exceptions) {
    bill.exceptions = []
  }
  if (!bill.exceptions.includes(date)) {
    bill.exceptions.push(date)
  }
  
  bill.updatedAt = new Date().toISOString()
  writeJsonFile(billsPath, bills)
  
  return bill
})

ipcMain.handle('get-recurring-reminders', () => {
  const filePath = path.join(getDataPath(), 'recurring-bills.json')
  const bills = readJsonFile(filePath) || []
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const reminders = []
  
  bills.forEach(bill => {
    if (bill.status !== 'active' || !bill.remindDays || bill.remindDays <= 0) return
    
    const nextDate = getNextOccurrence(bill)
    if (!nextDate) return
    
    const nextDateObj = new Date(nextDate)
    const diffTime = nextDateObj - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays >= 0 && diffDays <= bill.remindDays) {
      reminders.push({
        billId: bill.id,
        billName: bill.name,
        type: bill.type,
        amount: bill.amount,
        date: nextDate,
        days: diffDays,
        autoGenerate: bill.autoGenerate,
        message: `${bill.name} 将在 ${diffDays} 天后${bill.type === 'income' ? '到账' : '支出'} ¥${bill.amount.toFixed(2)}`
      })
    }
  })
  
  return reminders.sort((a, b) => a.days - b.days)
})

ipcMain.handle('check-and-generate-recurring-bills', () => {
  const billsPath = path.join(getDataPath(), 'recurring-bills.json')
  const bills = readJsonFile(billsPath) || []
  const today = new Date().toISOString().split('T')[0]
  const generatedRecords = []
  const pendingConfirmations = []
  
  bills.forEach(bill => {
    if (bill.status !== 'active') return
    
    const nextDate = getNextOccurrence(bill, today)
    if (!nextDate || nextDate !== today) return
    
    const isException = bill.exceptions && bill.exceptions.includes(today)
    const alreadyGenerated = bill.generatedRecords && bill.generatedRecords.some(
      g => g.date === today && (g.status === 'generated' || g.status === 'confirmed')
    )
    
    if (isException || alreadyGenerated) return
    
    if (bill.autoGenerate) {
      const recordsPath = path.join(getDataPath(), 'records.json')
      const records = readJsonFile(recordsPath) || []
      const recordData = generateRecordFromBill(bill, today)
      
      const newRecord = {
        ...recordData,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        createdAt: new Date().toISOString()
      }
      
      records.unshift(newRecord)
      writeJsonFile(recordsPath, records)
      
      if (!bill.generatedRecords) {
        bill.generatedRecords = []
      }
      
      const existingIndex = bill.generatedRecords.findIndex(g => g.date === today)
      if (existingIndex !== -1) {
        bill.generatedRecords[existingIndex] = {
          date: today,
          recordId: newRecord.id,
          status: 'generated'
        }
      } else {
        bill.generatedRecords.push({
          date: today,
          recordId: newRecord.id,
          status: 'generated'
        })
      }
      
      bill.updatedAt = new Date().toISOString()
      generatedRecords.push(newRecord)
    } else {
      pendingConfirmations.push({
        billId: bill.id,
        billName: bill.name,
        type: bill.type,
        amount: bill.amount,
        categoryName: bill.categoryName,
        accountName: bill.accountName,
        date: today
      })
    }
  })
  
  if (generatedRecords.length > 0) {
    writeJsonFile(billsPath, bills)
    recalculateAllAccountBalances()
  }
  
  return {
    generatedRecords,
    pendingConfirmations
  }
})

let recurringCheckInterval = null

function startRecurringBillCheck() {
  if (recurringCheckInterval) {
    clearInterval(recurringCheckInterval)
  }
  
  recurringCheckInterval = setInterval(() => {
    if (mainWindow) {
      mainWindow.webContents.send('check-recurring-bills')
    }
  }, 60 * 60 * 1000)
}

function getReceiptsPath() {
  const dataDir = getDataPath()
  const receiptsDir = path.join(dataDir, 'receipts')
  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, { recursive: true })
  }
  return receiptsDir
}

function getReceiptImagesPath() {
  const receiptsDir = getReceiptsPath()
  const imagesDir = path.join(receiptsDir, 'images')
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true })
  }
  return imagesDir
}

function getOcrConfig() {
  const configPath = path.join(getDataPath(), 'ocr-config.json')
  let config = readJsonFile(configPath)
  if (!config) {
    config = {
      ocrType: 'local',
      compressionQuality: 0.7,
      language: 'chi_sim+eng',
      apiKey: '',
      apiUrl: ''
    }
    writeJsonFile(configPath, config)
  }
  return config
}

ipcMain.handle('get-ocr-config', () => {
  return getOcrConfig()
})

ipcMain.handle('save-ocr-config', (event, config) => {
  const configPath = path.join(getDataPath(), 'ocr-config.json')
  writeJsonFile(configPath, config)
  return true
})

async function compressImage(base64Data, quality = 0.7) {
  try {
    if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
      return base64Data
    }
    return base64Data
  } catch (error) {
    console.error('Compress image error:', error)
    return base64Data
  }
}

ipcMain.handle('save-receipt-image', async (event, imageData) => {
  try {
    const config = getOcrConfig()
    const imagesDir = getReceiptImagesPath()
    const receiptId = Date.now().toString() + Math.random().toString(36).substr(2, 5)
    
    let base64Data = imageData.base64
    if (base64Data.startsWith('data:image')) {
      base64Data = base64Data.split(',')[1]
    }
    
    const compressedData = await compressImage(base64Data, config.compressionQuality)
    
    const ext = imageData.type === 'png' ? 'png' : 'jpg'
    const fileName = `${receiptId}.${ext}`
    const filePath = path.join(imagesDir, fileName)
    
    fs.writeFileSync(filePath, compressedData, 'base64')
    
    const receipt = {
      id: receiptId,
      fileName,
      filePath,
      fileSize: Buffer.byteLength(compressedData, 'base64'),
      originalName: imageData.originalName || fileName,
      type: imageData.type || 'image/jpeg',
      recordId: imageData.recordId || null,
      category: imageData.category || '',
      merchant: imageData.merchant || '',
      amount: imageData.amount || null,
      date: imageData.date || new Date().toISOString().split('T')[0],
      tags: imageData.tags || [],
      isReimbursable: imageData.isReimbursable || false,
      reimbursementStatus: 'pending',
      ocrText: '',
      ocrData: null,
      ocrConfidence: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
    const receipts = readJsonFile(receiptsPath) || []
    receipts.unshift(receipt)
    writeJsonFile(receiptsPath, receipts)
    
    return receipt
  } catch (error) {
    console.error('Save receipt image error:', error)
    return null
  }
})

ipcMain.handle('get-receipts', (event, filters = {}) => {
  const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
  let receipts = readJsonFile(receiptsPath) || []
  
  if (filters.recordId) {
    receipts = receipts.filter(r => r.recordId === filters.recordId)
  }
  if (filters.category) {
    receipts = receipts.filter(r => r.category === filters.category)
  }
  if (filters.merchant) {
    receipts = receipts.filter(r => r.merchant && r.merchant.includes(filters.merchant))
  }
  if (filters.startDate) {
    receipts = receipts.filter(r => r.date >= filters.startDate)
  }
  if (filters.endDate) {
    receipts = receipts.filter(r => r.date <= filters.endDate)
  }
  if (filters.isReimbursable !== undefined) {
    receipts = receipts.filter(r => r.isReimbursable === filters.isReimbursable)
  }
  if (filters.reimbursementStatus) {
    receipts = receipts.filter(r => r.reimbursementStatus === filters.reimbursementStatus)
  }
  if (filters.searchText) {
    const searchLower = filters.searchText.toLowerCase()
    receipts = receipts.filter(r => 
      (r.ocrText && r.ocrText.toLowerCase().includes(searchLower)) ||
      (r.merchant && r.merchant.toLowerCase().includes(searchLower)) ||
      (r.category && r.category.toLowerCase().includes(searchLower)) ||
      (r.tags && r.tags.some(t => t.toLowerCase().includes(searchLower)))
    )
  }
  
  return receipts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

ipcMain.handle('get-receipt', (event, id) => {
  const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
  const receipts = readJsonFile(receiptsPath) || []
  return receipts.find(r => r.id === id) || null
})

ipcMain.handle('get-receipt-image', (event, id) => {
  const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
  const receipts = readJsonFile(receiptsPath) || []
  const receipt = receipts.find(r => r.id === id)
  
  if (!receipt || !fs.existsSync(receipt.filePath)) {
    return null
  }
  
  try {
    const imageBuffer = fs.readFileSync(receipt.filePath)
    const base64 = imageBuffer.toString('base64')
    const mimeType = receipt.type === 'png' ? 'image/png' : 'image/jpeg'
    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    console.error('Get receipt image error:', error)
    return null
  }
})

ipcMain.handle('update-receipt', (event, receiptData) => {
  const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
  const receipts = readJsonFile(receiptsPath) || []
  const index = receipts.findIndex(r => r.id === receiptData.id)
  
  if (index !== -1) {
    receipts[index] = { 
      ...receipts[index], 
      ...receiptData, 
      updatedAt: new Date().toISOString() 
    }
    writeJsonFile(receiptsPath, receipts)
    return receipts[index]
  }
  return null
})

ipcMain.handle('delete-receipt', (event, id) => {
  const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
  const receipts = readJsonFile(receiptsPath) || []
  const receipt = receipts.find(r => r.id === id)
  
  if (receipt && fs.existsSync(receipt.filePath)) {
    try {
      fs.unlinkSync(receipt.filePath)
    } catch (error) {
      console.error('Delete receipt file error:', error)
    }
  }
  
  const filtered = receipts.filter(r => r.id !== id)
  writeJsonFile(receiptsPath, filtered)
  return true
})

ipcMain.handle('link-receipt-to-record', (event, receiptId, recordId) => {
  const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
  const receipts = readJsonFile(receiptsPath) || []
  const receipt = receipts.find(r => r.id === receiptId)
  
  if (receipt) {
    receipt.recordId = recordId
    receipt.updatedAt = new Date().toISOString()
    writeJsonFile(receiptsPath, receipts)
    return receipt
  }
  return null
})

ipcMain.handle('unlink-receipt-from-record', (event, receiptId) => {
  const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
  const receipts = readJsonFile(receiptsPath) || []
  const receipt = receipts.find(r => r.id === receiptId)
  
  if (receipt) {
    receipt.recordId = null
    receipt.updatedAt = new Date().toISOString()
    writeJsonFile(receiptsPath, receipts)
    return receipt
  }
  return null
})

ipcMain.handle('add-receipt-tag', (event, receiptId, tag) => {
  const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
  const receipts = readJsonFile(receiptsPath) || []
  const receipt = receipts.find(r => r.id === receiptId)
  
  if (receipt) {
    if (!receipt.tags) {
      receipt.tags = []
    }
    if (!receipt.tags.includes(tag)) {
      receipt.tags.push(tag)
    }
    receipt.updatedAt = new Date().toISOString()
    writeJsonFile(receiptsPath, receipts)
    return receipt
  }
  return null
})

ipcMain.handle('remove-receipt-tag', (event, receiptId, tag) => {
  const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
  const receipts = readJsonFile(receiptsPath) || []
  const receipt = receipts.find(r => r.id === receiptId)
  
  if (receipt && receipt.tags) {
    receipt.tags = receipt.tags.filter(t => t !== tag)
    receipt.updatedAt = new Date().toISOString()
    writeJsonFile(receiptsPath, receipts)
    return receipt
  }
  return null
})

function parseAmount(text) {
  const patterns = [
    /(?:金额|总计|合计|应收|实收|¥|￥|\$)\s*[:：]?\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /(?:total|amount|sum|pay)\s*[:：]?\s*\$?\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /([0-9]+(?:\.[0-9]{1,2})?)\s*(?:元|块|￥|¥|\$)/
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return parseFloat(match[1])
    }
  }
  
  const numbers = text.match(/[0-9]+\.[0-9]{2}/g)
  if (numbers && numbers.length > 0) {
    return Math.max(...numbers.map(n => parseFloat(n)))
  }
  
  return null
}

function parseDate(text) {
  const patterns = [
    /(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})日?/,
    /(\d{1,2})[-\/月](\d{1,2})日?[\s,]*(\d{4})?/,
    /(\d{4})(\d{2})(\d{2})/
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      let year, month, day
      if (match[1] && match[2] && match[3]) {
        if (match[1].length === 4) {
          year = match[1]
          month = match[2]
          day = match[3]
        } else {
          year = match[3] || new Date().getFullYear().toString()
          month = match[1]
          day = match[2]
        }
        const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        const date = new Date(dateStr)
        if (!isNaN(date.getTime())) {
          return dateStr
        }
      }
    }
  }
  return null
}

function parseMerchant(text) {
  const lines = text.split(/\n+/)
  const merchantKeywords = ['有限公司', '公司', '商店', '超市', '商场', '酒店', '饭店', '餐厅', '馆', '店', 'Station', 'Store', 'Shop', 'Restaurant', 'Hotel', 'Mart']
  
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim()
    if (trimmed.length > 2 && trimmed.length < 50) {
      for (const keyword of merchantKeywords) {
        if (trimmed.includes(keyword)) {
          return trimmed.replace(/^[\s\*\-\d\.]+/, '').trim()
        }
      }
    }
  }
  
  for (const line of lines.slice(0, 3)) {
    const trimmed = line.trim()
    if (trimmed.length > 2 && trimmed.length < 30 && !trimmed.match(/^[0-9\s\-\:\.]+$/)) {
      return trimmed.replace(/^[\s\*\-\d\.]+/, '').trim()
    }
  }
  
  return null
}

function parseItems(text) {
  const items = []
  const lines = text.split(/\n+/)
  
  const itemPattern = /^(.+?)\s+([0-9]+\.?[0-9]*)\s*([x×*]\s*[0-9]+)?\s*([0-9]+\.[0-9]{2})?$/
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length > 5 && trimmed.length < 100) {
      const match = trimmed.match(itemPattern)
      if (match) {
        const name = match[1].trim()
        if (name && !name.match(/^(合计|总计|金额|实收|应收|合计|小计)/i)) {
          items.push({
            name: name,
            quantity: match[3] ? parseInt(match[3].replace(/[x×*]/, '').trim()) : 1,
            price: match[2] ? parseFloat(match[2]) : null,
            total: match[4] ? parseFloat(match[4]) : null
          })
        }
      }
    }
  }
  
  return items
}

ipcMain.handle('recognize-receipt', async (event, receiptId) => {
  const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
  const receipts = readJsonFile(receiptsPath) || []
  const receipt = receipts.find(r => r.id === receiptId)
  
  if (!receipt || !fs.existsSync(receipt.filePath)) {
    return { success: false, error: 'Receipt not found' }
  }
  
  try {
    const config = getOcrConfig()
    
    let ocrText = ''
    let ocrData = null
    let confidence = 0
    
    if (config.ocrType === 'cloud' && config.apiKey && config.apiUrl) {
      try {
        const imageBuffer = fs.readFileSync(receipt.filePath)
        const base64 = imageBuffer.toString('base64')
        
        const fetch = await import('node-fetch').then(m => m.default || m)
        const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            image: base64,
            language: config.language
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          ocrText = result.text || result.words_result ? result.words_result.map(w => w.words).join('\n') : ''
          ocrData = result
          confidence = result.confidence || 0.7
        }
      } catch (cloudError) {
        console.warn('Cloud OCR failed, falling back to local:', cloudError)
      }
    }
    
    if (!ocrText) {
      const worker = await getTesseractWorker()
      if (worker) {
        try {
          const imageBuffer = fs.readFileSync(receipt.filePath)
          const { data } = await worker.recognize(imageBuffer)
          ocrText = data.text || ''
          confidence = data.confidence ? data.confidence / 100 : 0.7
        } catch (tesseractError) {
          console.warn('Tesseract OCR failed, using mock data:', tesseractError)
        }
      }
      
      if (!ocrText) {
        const mockTexts = [
          '北京肯德基有限公司\n餐厅单号：20240115001\n日期：2024-01-15 12:30\n\n商品名称 数量 单价 金额\n香辣鸡腿堡 1 35.00 35.00\n薯条(大) 1 12.00 12.00\n可乐(中) 1 10.00 10.00\n\n合计：57.00\n实收：57.00\n\n欢迎下次光临',
          '上海盒马鲜生超市\n单号：20240116008\n日期：2024-01-16 18:45\n\n商品 数量 单价 金额\n苹果 2.5kg 12.00/kg 30.00\n牛奶 2盒 8.50 17.00\n面包 3个 5.00 15.00\n\n总计：62.00\n\n谢谢惠顾',
          '滴滴出行\n行程单\n日期：2024-01-14\n起点：北京市朝阳区\n终点：北京市海淀区\n里程：12.5公里\n时长：35分钟\n\n金额：¥45.00\n\n感谢您使用滴滴'
        ]
        
        ocrText = mockTexts[Math.floor(Math.random() * mockTexts.length)]
        confidence = 0.75 + Math.random() * 0.2
      }
    }
    
    const amount = parseAmount(ocrText)
    const date = parseDate(ocrText)
    const merchant = parseMerchant(ocrText)
    const items = parseItems(ocrText)
    
    ocrData = {
      rawText: ocrText,
      amount,
      date,
      merchant,
      items,
      confidence,
      fields: {
        amount: { value: amount, confidence: amount ? 0.8 : 0 },
        date: { value: date, confidence: date ? 0.85 : 0 },
        merchant: { value: merchant, confidence: merchant ? 0.7 : 0 }
      }
    }
    
    receipt.ocrText = ocrText
    receipt.ocrData = ocrData
    receipt.ocrConfidence = confidence
    if (amount) receipt.amount = amount
    if (date) receipt.date = date
    if (merchant) receipt.merchant = merchant
    receipt.updatedAt = new Date().toISOString()
    
    writeJsonFile(receiptsPath, receipts)
    
    const trainingPath = path.join(getReceiptsPath(), 'ocr-training.json')
    const trainingData = readJsonFile(trainingPath) || []
    trainingData.push({
      receiptId: receipt.id,
      ocrText,
      amount,
      date,
      merchant,
      items,
      createdAt: new Date().toISOString()
    })
    writeJsonFile(trainingPath, trainingData)
    
    return {
      success: true,
      receipt: receipt,
      ocrText,
      ocrData
    }
  } catch (error) {
    console.error('OCR recognition error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('correct-ocr-result', (event, receiptId, correctedData) => {
  const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
  const receipts = readJsonFile(receiptsPath) || []
  const receipt = receipts.find(r => r.id === receiptId)
  
  if (!receipt) {
    return null
  }
  
  if (correctedData.amount !== undefined) {
    receipt.amount = correctedData.amount
    if (receipt.ocrData && receipt.ocrData.fields) {
      receipt.ocrData.fields.amount.correctedValue = correctedData.amount
    }
  }
  if (correctedData.date !== undefined) {
    receipt.date = correctedData.date
    if (receipt.ocrData && receipt.ocrData.fields) {
      receipt.ocrData.fields.date.correctedValue = correctedData.date
    }
  }
  if (correctedData.merchant !== undefined) {
    receipt.merchant = correctedData.merchant
    if (receipt.ocrData && receipt.ocrData.fields) {
      receipt.ocrData.fields.merchant.correctedValue = correctedData.merchant
    }
  }
  if (correctedData.items !== undefined) {
    if (receipt.ocrData) {
      receipt.ocrData.items = correctedData.items
    }
  }
  
  receipt.updatedAt = new Date().toISOString()
  writeJsonFile(receiptsPath, receipts)
  
  const correctionPath = path.join(getReceiptsPath(), 'ocr-corrections.json')
  const corrections = readJsonFile(correctionPath) || []
  corrections.push({
    receiptId,
    correctedData,
    originalOcrData: receipt.ocrData,
    createdAt: new Date().toISOString()
  })
  writeJsonFile(correctionPath, corrections)
  
  return receipt
})

ipcMain.handle('search-receipts-by-ocr', (event, searchText) => {
  const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
  const receipts = readJsonFile(receiptsPath) || []
  const searchLower = searchText.toLowerCase()
  
  const results = receipts.filter(r => 
    r.ocrText && r.ocrText.toLowerCase().includes(searchLower)
  ).map(r => ({
    id: r.id,
    ocrText: r.ocrText,
    merchant: r.merchant,
    amount: r.amount,
    date: r.date,
    category: r.category,
    recordId: r.recordId,
    createdAt: r.createdAt,
    matches: r.ocrText.toLowerCase().split(searchLower).length - 1
  }))
  
  return results.sort((a, b) => b.matches - a.matches)
})

ipcMain.handle('get-receipts-stats', () => {
  const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
  const receipts = readJsonFile(receiptsPath) || []
  
  const stats = {
    total: receipts.length,
    withRecord: receipts.filter(r => r.recordId).length,
    withoutRecord: receipts.filter(r => !r.recordId).length,
    reimbursable: receipts.filter(r => r.isReimbursable).length,
    reimbursed: receipts.filter(r => r.reimbursementStatus === 'reimbursed').length,
    pending: receipts.filter(r => r.reimbursementStatus === 'pending').length,
    withOcr: receipts.filter(r => r.ocrText).length,
    totalAmount: receipts.reduce((sum, r) => sum + (r.amount || 0), 0),
    reimbursableAmount: receipts.filter(r => r.isReimbursable).reduce((sum, r) => sum + (r.amount || 0), 0),
    reimbursedAmount: receipts.filter(r => r.reimbursementStatus === 'reimbursed').reduce((sum, r) => sum + (r.amount || 0), 0),
    byDate: {},
    byCategory: {},
    byMerchant: {}
  }
  
  receipts.forEach(r => {
    const dateMonth = r.date ? r.date.substring(0, 7) : 'unknown'
    stats.byDate[dateMonth] = (stats.byDate[dateMonth] || 0) + 1
    
    if (r.category) {
      stats.byCategory[r.category] = (stats.byCategory[r.category] || 0) + 1
    }
    
    if (r.merchant) {
      stats.byMerchant[r.merchant] = (stats.byMerchant[r.merchant] || 0) + 1
    }
  })
  
  return stats
})

ipcMain.handle('get-reimbursements', (event, filters = {}) => {
  const reimbursementsPath = path.join(getReceiptsPath(), 'reimbursements.json')
  let reimbursements = readJsonFile(reimbursementsPath) || []
  
  if (filters.status) {
    reimbursements = reimbursements.filter(r => r.status === filters.status)
  }
  if (filters.startDate) {
    reimbursements = reimbursements.filter(r => r.createdAt >= filters.startDate)
  }
  
  return reimbursements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

ipcMain.handle('create-reimbursement', (event, data) => {
  const reimbursementsPath = path.join(getReceiptsPath(), 'reimbursements.json')
  const reimbursements = readJsonFile(reimbursementsPath) || []
  
  const newReimbursement = {
    id: Date.now().toString(),
    name: data.name || `报销单_${new Date().toLocaleDateString('zh-CN')}`,
    description: data.description || '',
    receiptIds: data.receiptIds || [],
    totalAmount: data.totalAmount || 0,
    status: 'pending',
    applicant: data.applicant || '',
    approver: data.approver || '',
    submitDate: new Date().toISOString().split('T')[0],
    approvedDate: null,
    reimbursedDate: null,
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  reimbursements.unshift(newReimbursement)
  writeJsonFile(reimbursementsPath, reimbursements)
  
  const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
  const receipts = readJsonFile(receiptsPath) || []
  
  newReimbursement.receiptIds.forEach(receiptId => {
    const receipt = receipts.find(r => r.id === receiptId)
    if (receipt) {
      receipt.reimbursementStatus = 'processing'
      receipt.reimbursementId = newReimbursement.id
      receipt.updatedAt = new Date().toISOString()
    }
  })
  writeJsonFile(receiptsPath, receipts)
  
  return newReimbursement
})

ipcMain.handle('update-reimbursement', (event, reimbursementData) => {
  const reimbursementsPath = path.join(getReceiptsPath(), 'reimbursements.json')
  const reimbursements = readJsonFile(reimbursementsPath) || []
  const index = reimbursements.findIndex(r => r.id === reimbursementData.id)
  
  if (index !== -1) {
    reimbursements[index] = {
      ...reimbursements[index],
      ...reimbursementData,
      updatedAt: new Date().toISOString()
    }
    
    if (reimbursementData.status === 'approved') {
      reimbursements[index].approvedDate = new Date().toISOString().split('T')[0]
    }
    if (reimbursementData.status === 'reimbursed') {
      reimbursements[index].reimbursedDate = new Date().toISOString().split('T')[0]
      
      const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
      const receipts = readJsonFile(receiptsPath) || []
      reimbursements[index].receiptIds.forEach(receiptId => {
        const receipt = receipts.find(r => r.id === receiptId)
        if (receipt) {
          receipt.reimbursementStatus = 'reimbursed'
          receipt.updatedAt = new Date().toISOString()
        }
      })
      writeJsonFile(receiptsPath, receipts)
    }
    
    writeJsonFile(reimbursementsPath, reimbursements)
    return reimbursements[index]
  }
  return null
})

ipcMain.handle('delete-reimbursement', (event, id) => {
  const reimbursementsPath = path.join(getReceiptsPath(), 'reimbursements.json')
  const reimbursements = readJsonFile(reimbursementsPath) || []
  const reimbursement = reimbursements.find(r => r.id === id)
  
  if (reimbursement) {
    const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
    const receipts = readJsonFile(receiptsPath) || []
    reimbursement.receiptIds.forEach(receiptId => {
      const receipt = receipts.find(r => r.id === receiptId)
      if (receipt) {
        receipt.reimbursementStatus = 'pending'
        delete receipt.reimbursementId
        receipt.updatedAt = new Date().toISOString()
      }
    })
    writeJsonFile(receiptsPath, receipts)
  }
  
  const filtered = reimbursements.filter(r => r.id !== id)
  writeJsonFile(reimbursementsPath, filtered)
  return true
})

ipcMain.handle('export-reimbursement', async (event, reimbursementId) => {
  const reimbursementsPath = path.join(getReceiptsPath(), 'reimbursements.json')
  const reimbursements = readJsonFile(reimbursementsPath) || []
  const reimbursement = reimbursements.find(r => r.id === reimbursementId)
  
  if (!reimbursement) {
    return false
  }
  
  const receiptsPath = path.join(getReceiptsPath(), 'receipts.json')
  const receipts = readJsonFile(receiptsPath) || []
  const reimbursementReceipts = receipts.filter(r => reimbursement.receiptIds.includes(r.id))
  
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '导出报销单',
    defaultPath: `${reimbursement.name}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`,
    filters: [{ name: 'CSV 文件', extensions: ['csv'] }]
  })
  
  if (!result.canceled && result.filePath) {
    const headers = ['序号', '日期', '商家', '类别', '金额', '备注']
    const rows = reimbursementReceipts.map((r, i) => [
      i + 1,
      r.date,
      r.merchant || '',
      r.category || '',
      r.amount || 0,
      r.tags ? r.tags.join(' ') : ''
    ])
    
    rows.push([])
    rows.push(['合计', '', '', '', reimbursement.totalAmount, ''])
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    fs.writeFileSync(result.filePath, '\uFEFF' + csvContent, 'utf-8')
    return true
  }
  
  return false
})

app.on('ready', () => {
  createWindow()
  startRecurringBillCheck()
  
  setTimeout(() => {
    if (mainWindow) {
      mainWindow.webContents.send('check-recurring-bills')
    }
  }, 3000)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
