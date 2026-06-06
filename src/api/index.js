const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null }

function callIpc(method, ...args) {
  if (ipcRenderer) {
    return ipcRenderer.invoke(method, ...args)
  }
  return Promise.resolve(null)
}

export const recordApi = {
  getRecords: () => callIpc('get-records'),
  addRecord: (record) => callIpc('add-record', record),
  updateRecord: (record) => callIpc('update-record', record),
  deleteRecord: (id) => callIpc('delete-record', id),
  exportCsv: (records) => callIpc('export-csv', records),
  exportPdf: (data) => callIpc('export-pdf', data)
}

export const categoryApi = {
  getCategories: () => callIpc('get-categories'),
  addCategory: (category) => callIpc('add-category', category),
  updateCategory: (category) => callIpc('update-category', category),
  deleteCategory: (id) => callIpc('delete-category', id),
  resetCategories: () => callIpc('reset-categories')
}

export const accountApi = {
  getAccounts: () => callIpc('get-accounts'),
  addAccount: (account) => callIpc('add-account', account),
  updateAccount: (account) => callIpc('update-account', account),
  deleteAccount: (id) => callIpc('delete-account', id),
  updateAccountSort: (accountIds) => callIpc('update-account-sort', accountIds),
  toggleAccountHidden: (id) => callIpc('toggle-account-hidden', id),
  toggleAccountDisabled: (id) => callIpc('toggle-account-disabled', id),
  transfer: (transferData) => callIpc('transfer', transferData),
  getAccountOverview: () => callIpc('get-account-overview'),
  getCreditCardReminders: () => callIpc('get-credit-card-reminders')
}

export const statsApi = {
  exportReport: (options) => callIpc('export-report', options)
}

export const recurringBillApi = {
  getTemplates: () => callIpc('get-recurring-bill-templates'),
  getBills: () => callIpc('get-recurring-bills'),
  addBill: (bill) => callIpc('add-recurring-bill', bill),
  updateBill: (bill) => callIpc('update-recurring-bill', bill),
  deleteBill: (id) => callIpc('delete-recurring-bill', id),
  toggleStatus: (id) => callIpc('toggle-recurring-bill-status', id),
  addExceptionDate: (billId, date) => callIpc('add-exception-date', billId, date),
  removeExceptionDate: (billId, date) => callIpc('remove-exception-date', billId, date),
  getNextOccurrence: (billId) => callIpc('get-next-occurrence', billId),
  getUpcomingBills: (daysAhead) => callIpc('get-upcoming-bills', daysAhead),
  generateRecord: (billId, date) => callIpc('generate-recurring-record', billId, date),
  skipDate: (billId, date) => callIpc('skip-recurring-date', billId, date),
  getReminders: () => callIpc('get-recurring-reminders'),
  checkAndGenerate: () => callIpc('check-and-generate-recurring-bills')
}

export const receiptApi = {
  saveImage: (imageData) => callIpc('save-receipt-image', imageData),
  getReceipts: (filters) => callIpc('get-receipts', filters),
  getReceipt: (id) => callIpc('get-receipt', id),
  getImage: (id) => callIpc('get-receipt-image', id),
  updateReceipt: (receiptData) => callIpc('update-receipt', receiptData),
  deleteReceipt: (id) => callIpc('delete-receipt', id),
  linkToRecord: (receiptId, recordId) => callIpc('link-receipt-to-record', receiptId, recordId),
  unlinkFromRecord: (receiptId) => callIpc('unlink-receipt-from-record', receiptId),
  addTag: (receiptId, tag) => callIpc('add-receipt-tag', receiptId, tag),
  removeTag: (receiptId, tag) => callIpc('remove-receipt-tag', receiptId, tag),
  getStats: () => callIpc('get-receipts-stats')
}

export const ocrApi = {
  getConfig: () => callIpc('get-ocr-config'),
  saveConfig: (config) => callIpc('save-ocr-config', config),
  recognize: (receiptId) => callIpc('recognize-receipt', receiptId),
  correctResult: (receiptId, correctedData) => callIpc('correct-ocr-result', receiptId, correctedData),
  searchByText: (searchText) => callIpc('search-receipts-by-ocr', searchText)
}

export const reimbursementApi = {
  getReimbursements: (filters) => callIpc('get-reimbursements', filters),
  create: (data) => callIpc('create-reimbursement', data),
  update: (reimbursementData) => callIpc('update-reimbursement', reimbursementData),
  delete: (id) => callIpc('delete-reimbursement', id),
  export: (reimbursementId) => callIpc('export-reimbursement', reimbursementId)
}
