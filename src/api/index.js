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
  exportCsv: (records) => callIpc('export-csv', records)
}

export const categoryApi = {
  getCategories: () => callIpc('get-categories'),
  addCategory: (category) => callIpc('add-category', category),
  updateCategory: (category) => callIpc('update-category', category),
  deleteCategory: (id) => callIpc('delete-category', id)
}
