const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development'
let mainWindow = null

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
  { id: 'a1', name: '现金', type: 'cash', icon: '💵', color: '#27ae60', balance: 0, initialBalance: 0, accountNo: '', sort: 1, hidden: false, disabled: false, billDay: null, dueDay: null, creditLimit: null },
  { id: 'a2', name: '储蓄卡', type: 'debit', icon: '🏦', color: '#3498db', balance: 0, initialBalance: 0, accountNo: '', sort: 2, hidden: false, disabled: false, billDay: null, dueDay: null, creditLimit: null },
  { id: 'a3', name: '信用卡', type: 'credit', icon: '💳', color: '#e74c3c', balance: 0, initialBalance: 0, accountNo: '', sort: 3, hidden: false, disabled: false, billDay: 10, dueDay: 25, creditLimit: 10000 },
  { id: 'a4', name: '支付宝', type: 'alipay', icon: '📱', color: '#1677ff', balance: 0, initialBalance: 0, accountNo: '', sort: 4, hidden: false, disabled: false, billDay: null, dueDay: null, creditLimit: null },
  { id: 'a5', name: '微信', type: 'wechat', icon: '💬', color: '#07c160', balance: 0, initialBalance: 0, accountNo: '', sort: 5, hidden: false, disabled: false, billDay: null, dueDay: null, creditLimit: null },
  { id: 'a6', name: '投资账户', type: 'investment', icon: '📈', color: '#9b59b6', balance: 0, initialBalance: 0, accountNo: '', sort: 6, hidden: false, disabled: false, billDay: null, dueDay: null, creditLimit: null }
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
  
  return recalculateAllAccountBalances()
})

ipcMain.handle('add-account', (event, account) => {
  const filePath = path.join(getDataPath(), 'accounts.json')
  const accounts = readJsonFile(filePath) || defaultAccounts
  account.id = Date.now().toString()
  account.sort = accounts.length + 1
  account.balance = Number(account.initialBalance) || 0
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
        doc.text(`¥${Number(data.overview.income).toFixed(2)}`, margin + 10, yPos + 24)
        doc.setTextColor(245, 108, 108)
        doc.text(`¥${Number(data.overview.expense).toFixed(2)}`, margin + 60, yPos + 24)
        doc.setTextColor(data.overview.balance >= 0 ? 103 : 245, data.overview.balance >= 0 ? 194 : 108, data.overview.balance >= 0 ? 58 : 108)
        doc.text(`¥${Number(data.overview.balance).toFixed(2)}`, margin + 110, yPos + 24)
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
        doc.text(`¥${Number(data.comparison.income.current).toFixed(2)}`, margin + 50, yPos + 25)
        doc.text(`¥${Number(data.comparison.income.prev).toFixed(2)}`, margin + 90, yPos + 25)
        doc.setTextColor(data.comparison.income.mom >= 0 ? 103 : 245, data.comparison.income.mom >= 0 ? 194 : 108, data.comparison.income.mom >= 0 ? 58 : 108)
        doc.text(`${data.comparison.income.mom >= 0 ? '+' : ''}${data.comparison.income.mom.toFixed(1)}%`, margin + 130, yPos + 25)
        doc.setTextColor(data.comparison.income.yoy >= 0 ? 103 : 245, data.comparison.income.yoy >= 0 ? 194 : 108, data.comparison.income.yoy >= 0 ? 58 : 108)
        doc.text(`${data.comparison.income.yoy >= 0 ? '+' : ''}${data.comparison.income.yoy.toFixed(1)}%`, margin + 170, yPos + 25)
        
        doc.setTextColor(245, 108, 108)
        doc.text('支出', margin + 10, yPos + 40)
        doc.text(`¥${Number(data.comparison.expense.current).toFixed(2)}`, margin + 50, yPos + 40)
        doc.text(`¥${Number(data.comparison.expense.prev).toFixed(2)}`, margin + 90, yPos + 40)
        doc.setTextColor(data.comparison.expense.mom <= 0 ? 103 : 245, data.comparison.expense.mom <= 0 ? 194 : 108, data.comparison.expense.mom <= 0 ? 58 : 108)
        doc.text(`${data.comparison.expense.mom >= 0 ? '+' : ''}${data.comparison.expense.mom.toFixed(1)}%`, margin + 130, yPos + 40)
        doc.setTextColor(data.comparison.expense.yoy <= 0 ? 103 : 245, data.comparison.expense.yoy <= 0 ? 194 : 108, data.comparison.expense.yoy <= 0 ? 58 : 108)
        doc.text(`${data.comparison.expense.yoy >= 0 ? '+' : ''}${data.comparison.expense.yoy.toFixed(1)}%`, margin + 170, yPos + 40)
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
        
        const maxExpense = Math.max(...data.expenseRank.map(i => i.amount))
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
          doc.text(`¥${Number(item.amount).toFixed(2)}`, margin + 90, yPos + 6)
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
        
        const maxIncome = Math.max(...data.incomeRank.map(i => i.amount))
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
          doc.text(`¥${Number(item.amount).toFixed(2)}`, margin + 90, yPos + 6)
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
        doc.text(`下月预测收入: ¥${Number(data.prediction.income).toFixed(2)}`, margin + 10, yPos + 10)
        doc.setTextColor(103, 194, 58)
        doc.text(`下月预测支出: ¥${Number(data.prediction.expense).toFixed(2)}`, margin + 10, yPos + 20)
        doc.setTextColor(245, 108, 108)
        doc.text(`预测结余: ¥${Number(data.prediction.balance).toFixed(2)}`, margin + 100, yPos + 15)
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
          doc.text(`¥${Number(r.amount).toFixed(2)}`, margin + 110, yPos + 5)
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

app.on('ready', createWindow)

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
