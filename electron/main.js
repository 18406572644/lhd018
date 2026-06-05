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
  return record
})

ipcMain.handle('update-record', (event, record) => {
  const filePath = path.join(getDataPath(), 'records.json')
  const records = readJsonFile(filePath) || []
  const index = records.findIndex(r => r.id === record.id)
  if (index !== -1) {
    records[index] = { ...records[index], ...record }
    writeJsonFile(filePath, records)
    return records[index]
  }
  return null
})

ipcMain.handle('delete-record', (event, id) => {
  const filePath = path.join(getDataPath(), 'records.json')
  const records = readJsonFile(filePath) || []
  const filtered = records.filter(r => r.id !== id)
  writeJsonFile(filePath, filtered)
  return true
})

ipcMain.handle('get-categories', () => {
  const filePath = path.join(getDataPath(), 'categories.json')
  let categories = readJsonFile(filePath)
  if (!categories || categories.length === 0) {
    categories = [
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
    writeJsonFile(filePath, categories)
  }
  return categories
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

ipcMain.handle('export-csv', async (event, records) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '导出账单',
    defaultPath: `账单_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`,
    filters: [{ name: 'CSV 文件', extensions: ['csv'] }]
  })

  if (!result.canceled && result.filePath) {
    const headers = ['日期', '类型', '分类', '金额', '备注']
    const rows = records.map(r => [
      new Date(r.date).toLocaleDateString('zh-CN'),
      r.type === 'income' ? '收入' : '支出',
      r.categoryName,
      r.amount,
      r.remark || ''
    ])
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    fs.writeFileSync(result.filePath, '\uFEFF' + csvContent, 'utf-8')
    return true
  }
  return false
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
