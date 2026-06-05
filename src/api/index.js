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
