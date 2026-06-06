<template>
  <div class="page-container records">
    <div class="header flex-between">
      <h2 class="page-title">账单明细</h2>
      <el-button type="success" icon="el-icon-download" @click="handleExport" :disabled="filteredRecords.length === 0">
        导出 CSV
      </el-button>
    </div>

    <el-card class="card filter-card" shadow="never">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="类型">
          <el-select v-model="filters.type" placeholder="全部" clearable style="width: 120px">
            <el-option label="收入" value="income" />
            <el-option label="支出" value="expense" />
            <el-option label="转账" value="transfer" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filters.categoryId" placeholder="全部" clearable style="width: 140px" :disabled="filters.type === 'transfer'">
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            >
              <span>{{ cat.icon }} {{ cat.name }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="账户">
          <el-select v-model="filters.accountId" placeholder="全部" clearable style="width: 140px">
            <el-option
              v-for="account in availableAccounts"
              :key="account.id"
              :label="account.name"
              :value="account.id"
            >
              <span>{{ account.icon }} {{ account.name }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="yyyy-MM-dd"
            clearable
            style="width: 280px"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索备注"
            clearable
            style="width: 160px"
            @keyup.enter.native="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜索</el-button>
          <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16" class="stats-row" v-if="filteredRecords.length > 0">
      <el-col :span="6">
        <div class="stat-card income-card">
          <div class="stat-label">总收入</div>
          <div class="stat-value">+{{ formatMoney(stats.income) }}</div>
          <div class="stat-count">{{ stats.incomeCount }} 笔</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card expense-card">
          <div class="stat-label">总支出</div>
          <div class="stat-value">-{{ formatMoney(stats.expense) }}</div>
          <div class="stat-count">{{ stats.expenseCount }} 笔</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card transfer-card">
          <div class="stat-label">转账</div>
          <div class="stat-value">{{ formatMoney(0) }}</div>
          <div class="stat-count">{{ stats.transferCount }} 笔</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card balance-card">
          <div class="stat-label">净结余</div>
          <div class="stat-value" :class="stats.balance >= 0 ? 'positive' : 'negative'">
            {{ stats.balance >= 0 ? '+' : '' }}{{ formatMoney(stats.balance) }}
          </div>
          <div class="stat-count">共 {{ filteredRecords.length }} 笔</div>
        </div>
      </el-col>
    </el-row>

    <el-card class="card table-card" shadow="never">
      <el-table
        :data="pagedRecords"
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无账单记录"
      >
        <el-table-column label="日期" width="120">
          <template slot-scope="scope">
            {{ formatDate(scope.row.date, 'MM-DD') }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="80">
          <template slot-scope="scope">
            <el-tag
              :type="scope.row.type === 'income' ? 'success' : (scope.row.type === 'expense' ? 'danger' : 'warning')"
              size="mini"
            >
              {{ scope.row.type === 'income' ? '收入' : (scope.row.type === 'expense' ? '支出' : '转账') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分类/账户" min-width="200">
          <template slot-scope="scope">
            <div v-if="scope.row.type === 'transfer'" class="transfer-cell">
              <div class="transfer-accounts">
                <span
                  class="account-icon"
                  :style="{ backgroundColor: getAccount(scope.row.fromAccountId)?.color + '20', color: getAccount(scope.row.fromAccountId)?.color }"
                >
                  {{ getAccount(scope.row.fromAccountId)?.icon }}
                </span>
                <span class="account-name">{{ scope.row.fromAccountName }}</span>
                <i class="el-icon-right transfer-arrow"></i>
                <span
                  class="account-icon"
                  :style="{ backgroundColor: getAccount(scope.row.toAccountId)?.color + '20', color: getAccount(scope.row.toAccountId)?.color }"
                >
                  {{ getAccount(scope.row.toAccountId)?.icon }}
                </span>
                <span class="account-name">{{ scope.row.toAccountName }}</span>
              </div>
            </div>
            <div v-else class="category-cell">
              <span
                class="cat-icon"
                :style="{ backgroundColor: getCategory(scope.row.categoryId)?.color + '20', color: getCategory(scope.row.categoryId)?.color }"
              >
                {{ getCategory(scope.row.categoryId)?.icon }}
              </span>
              <span>{{ scope.row.categoryName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="支付账户" width="120">
          <template slot-scope="scope">
            <div v-if="scope.row.type !== 'transfer' && scope.row.accountName" class="account-cell">
              <span
                class="account-icon"
                :style="{ backgroundColor: getAccount(scope.row.accountId)?.color + '20', color: getAccount(scope.row.accountId)?.color }"
              >
                {{ getAccount(scope.row.accountId)?.icon }}
              </span>
              <span class="account-name">{{ scope.row.accountName }}</span>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="120" align="right">
          <template slot-scope="scope">
            <span v-if="scope.row.type === 'transfer'" class="amount text-transfer">
              {{ formatMoney(scope.row.amount) }}
            </span>
            <span
              v-else
              :class="scope.row.type === 'income' ? 'text-income' : 'text-expense'"
              class="amount"
            >
              {{ scope.row.type === 'income' ? '+' : '-' }}{{ formatMoney(scope.row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="票据" width="100" align="center">
          <template slot-scope="scope">
            <div v-if="scope.row.receiptIds && scope.row.receiptIds.length > 0" class="receipt-cell">
              <div
                class="receipt-preview"
                @click.stop="openReceipts(scope.row)"
              >
                <i class="el-icon-picture-outline"></i>
                <span class="receipt-count">{{ scope.row.receiptIds.length }}</span>
              </div>
            </div>
            <span v-else class="no-receipt">-</span>
          </template>
        </el-table-column>
        <el-table-column label="备注" show-overflow-tooltip>
          <template slot-scope="scope">
            <span class="remark">{{ scope.row.remark || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template slot-scope="scope">
            <el-button
              size="mini"
              type="primary"
              icon="el-icon-picture"
              @click.stop="openReceipts(scope.row)"
              v-if="scope.row.receiptIds && scope.row.receiptIds.length > 0"
            />
            <el-button
              size="mini"
              type="danger"
              icon="el-icon-delete"
              @click="handleDelete(scope.row)"
            />
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="filteredRecords.length > 0"
        class="pagination"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="pagination.page"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="pagination.pageSize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="filteredRecords.length"
      />
    </el-card>

    <el-dialog
      title="新增记录"
      :visible.sync="dialogVisible"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="form" label-width="80px">
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio label="expense">支出</el-radio>
            <el-radio label="income">收入</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%;" @change="handleCategoryChange">
            <el-option
              v-for="cat in filteredCategories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            >
              <span>{{ cat.icon }} {{ cat.name }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="支付账户" prop="accountId">
          <el-select v-model="form.accountId" placeholder="请选择账户" style="width: 100%;" @change="handleAccountChange">
            <el-option
              v-for="account in availableAccounts"
              :key="account.id"
              :label="account.name + ' (余额: ' + formatMoney(account.balance) + ')'"
              :value="account.id"
            >
              <span>{{ account.icon }} {{ account.name }}</span>
              <span style="float: right; color: #909399;">{{ formatMoney(account.balance) }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input v-model="form.amount" type="number" placeholder="请输入金额">
            <template slot="prepend">¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="form.date"
            type="date"
            placeholder="选择日期"
            value-format="yyyy-MM-dd"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            placeholder="添加备注（可选）"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </span>
    </el-dialog>

    <ReceiptViewer
      :visible="receiptViewerVisible"
      :images="currentReceiptImages"
      :receipts="currentReceipts"
      :start-index="0"
      title="票据详情"
      @close="receiptViewerVisible = false"
    />
  </div>
</template>

<script>
import { recordApi, categoryApi, accountApi, receiptApi } from '@/api'
import { formatMoney, formatDate } from '@/utils'
import ReceiptViewer from '@/components/ReceiptViewer.vue'

export default {
  name: 'Records',
  components: {
    ReceiptViewer
  },
  data() {
    return {
      loading: false,
      records: [],
      categories: [],
      accounts: [],
      filters: {
        type: '',
        categoryId: '',
        accountId: '',
        dateRange: [],
        keyword: ''
      },
      receiptViewerVisible: false,
      currentReceipts: [],
      currentReceiptImages: [],
      pagination: {
        page: 1,
        pageSize: 20
      },
      dialogVisible: false,
      form: {
        type: 'expense',
        categoryId: '',
        categoryName: '',
        accountId: '',
        accountName: '',
        amount: '',
        date: formatDate(new Date()),
        remark: ''
      },
      rules: {
        type: [{ required: true, message: '请选择类型', trigger: 'change' }],
        categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
        accountId: [{ required: true, message: '请选择账户', trigger: 'change' }],
        amount: [
          { required: true, message: '请输入金额', trigger: 'blur' },
          { validator: this.validateAmount, trigger: 'blur' }
        ],
        date: [{ required: true, message: '请选择日期', trigger: 'change' }]
      }
    }
  },
  computed: {
    filteredCategories() {
      return this.categories.filter(c => c.type === this.form.type)
    },
    availableAccounts() {
      return this.accounts.filter(a => !a.disabled && !a.hidden).sort((a, b) => a.sort - b.sort)
    },
    filteredRecords() {
      let result = [...this.records]
      
      if (this.filters.type) {
        result = result.filter(r => r.type === this.filters.type)
      }
      
      if (this.filters.categoryId) {
        result = result.filter(r => r.categoryId === this.filters.categoryId)
      }
      
      if (this.filters.accountId) {
        result = result.filter(r => 
          r.accountId === this.filters.accountId ||
          r.fromAccountId === this.filters.accountId ||
          r.toAccountId === this.filters.accountId
        )
      }
      
      if (this.filters.dateRange && this.filters.dateRange.length === 2) {
        const [start, end] = this.filters.dateRange
        result = result.filter(r => r.date >= start && r.date <= end)
      }
      
      if (this.filters.keyword) {
        const keyword = this.filters.keyword.toLowerCase()
        result = result.filter(r => {
          if (r.type === 'transfer') {
            return (r.remark && r.remark.toLowerCase().includes(keyword)) ||
                   r.fromAccountName?.toLowerCase().includes(keyword) ||
                   r.toAccountName?.toLowerCase().includes(keyword)
          }
          return (r.remark && r.remark.toLowerCase().includes(keyword)) ||
                 r.categoryName?.toLowerCase().includes(keyword) ||
                 r.accountName?.toLowerCase().includes(keyword)
        })
      }
      
      return result.sort((a, b) => new Date(b.date) - new Date(a.date))
    },
    pagedRecords() {
      const start = (this.pagination.page - 1) * this.pagination.pageSize
      const end = start + this.pagination.pageSize
      return this.filteredRecords.slice(start, end)
    },
    stats() {
      let income = 0
      let expense = 0
      let incomeCount = 0
      let expenseCount = 0
      let transferCount = 0
      
      this.filteredRecords.forEach(r => {
        const amount = Number(r.amount)
        if (r.type === 'income') {
          income += amount
          incomeCount++
        } else if (r.type === 'expense') {
          expense += amount
          expenseCount++
        } else if (r.type === 'transfer') {
          transferCount++
        }
      })
      
      return {
        income,
        expense,
        balance: income - expense,
        incomeCount,
        expenseCount,
        transferCount
      }
    }
  },
  watch: {
    'form.type'() {
      this.form.categoryId = ''
      this.form.categoryName = ''
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    formatMoney,
    formatDate,
    validateAmount(rule, value, callback) {
      if (parseFloat(value) <= 0) {
        callback(new Error('金额必须大于0'))
      } else {
        callback()
      }
    },
    async loadData() {
      this.loading = true
      try {
        const [records, categories, accounts] = await Promise.all([
          recordApi.getRecords(),
          categoryApi.getCategories(),
          accountApi.getAccounts()
        ])
        this.records = records || []
        this.categories = categories || []
        this.accounts = accounts || []
      } finally {
        this.loading = false
      }
    },
    getCategory(id) {
      return this.categories.find(c => c.id === id)
    },
    getAccount(id) {
      return this.accounts.find(a => a.id === id)
    },
    handleCategoryChange(id) {
      const cat = this.getCategory(id)
      if (cat) {
        this.form.categoryName = cat.name
      }
    },
    handleAccountChange(id) {
      const account = this.getAccount(id)
      if (account) {
        this.form.accountName = account.name
      }
    },
    handleSearch() {
      this.pagination.page = 1
    },
    handleReset() {
      this.filters = {
        type: '',
        categoryId: '',
        accountId: '',
        dateRange: [],
        keyword: ''
      }
      this.pagination.page = 1
    },
    handleSizeChange(val) {
      this.pagination.pageSize = val
      this.pagination.page = 1
    },
    handleCurrentChange(val) {
      this.pagination.page = val
    },
    async handleExport() {
      const result = await recordApi.exportCsv(this.filteredRecords)
      if (result) {
        this.$message.success('导出成功')
      }
    },
    async handleDelete(record) {
      const confirmText = record.type === 'transfer' 
        ? `确定要删除这条转账记录吗？这将同时恢复两个账户的余额。`
        : `确定要删除这条记录吗？`
      try {
        await this.$confirm(confirmText, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        const result = await recordApi.deleteRecord(record.id)
        if (result) {
          this.$message.success('删除成功')
          this.loadData()
        }
      } catch (e) {}
    },
    async handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (valid) {
          const account = this.getAccount(this.form.accountId)
          if (this.form.type === 'expense' && account && account.balance < parseFloat(this.form.amount)) {
            this.$message.error('账户余额不足')
            return
          }
          
          const data = {
            ...this.form,
            amount: parseFloat(this.form.amount)
          }
          const result = await recordApi.addRecord(data)
          if (result) {
            this.$message.success('创建成功')
            this.dialogVisible = false
            this.resetForm()
            this.loadData()
          }
        }
      })
    },
    resetForm() {
      this.form = {
        type: 'expense',
        categoryId: '',
        categoryName: '',
        accountId: '',
        accountName: '',
        amount: '',
        date: formatDate(new Date()),
        remark: ''
      }
      this.$nextTick(() => {
        if (this.$refs.form) {
          this.$refs.form.clearValidate()
        }
      })
    },
    async openReceipts(record) {
      if (!record.receiptIds || record.receiptIds.length === 0) {
        this.$message.info('该记录没有关联票据')
        return
      }

      try {
        const receipts = []
        const images = []
        
        for (const receiptId of record.receiptIds) {
          const receipt = await receiptApi.getReceipt(receiptId)
          if (receipt) {
            receipts.push(receipt)
            const imageData = await receiptApi.getImage(receiptId)
            if (imageData) {
              images.push(imageData.imageUrl)
              receipt.imageUrl = imageData.imageUrl
              receipt.thumbnailUrl = imageData.thumbnailUrl
            }
          }
        }

        this.currentReceipts = receipts
        this.currentReceiptImages = images
        this.receiptViewerVisible = true
      } catch (error) {
        console.error('Load receipts error:', error)
        this.$message.error('加载票据失败')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.records {
  .header {
    margin-bottom: 20px;
    
    .page-title {
      font-size: 22px;
      font-weight: 600;
      color: $text-primary;
    }
  }
  
  .filter-card {
    margin-bottom: 20px;
    padding: 8px 16px;
    
    ::v-deep .el-form-item {
      margin-bottom: 0;
      margin-right: 16px;
    }
  }
  
  .stats-row {
    margin-bottom: 20px;
    
    .stat-card {
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      
      .stat-label {
        font-size: 13px;
        color: $text-secondary;
        margin-bottom: 8px;
      }
      
      .stat-value {
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 4px;
        
        &.positive {
          color: $income-color;
        }
        
        &.negative {
          color: $expense-color;
        }
      }
      
      .stat-count {
        font-size: 12px;
        color: $text-secondary;
      }
      
      &.income-card {
        background: linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%);
        
        .stat-label, .stat-count {
          color: rgba(0, 0, 0, 0.5);
        }
        
        .stat-value {
          color: #2d8a3e;
        }
      }
      
      &.expense-card {
        background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
        
        .stat-label, .stat-count {
          color: rgba(0, 0, 0, 0.5);
        }
        
        .stat-value {
          color: #d9534f;
        }
      }
      
      &.transfer-card {
        background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
        
        .stat-label, .stat-count {
          color: rgba(0, 0, 0, 0.6);
        }
        
        .stat-value {
          color: #d97706;
        }
      }
      
      &.balance-card {
        background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);
        
        .stat-label, .stat-count {
          color: rgba(0, 0, 0, 0.5);
        }
        
        .stat-value.positive {
          color: #2563eb;
        }
        
        .stat-value.negative {
          color: #dc2626;
        }
      }
    }
  }
  
  .table-card {
    padding: 0;
    
    ::v-deep .el-table__header th {
      background: #fafafa;
    }
  }
  
  .category-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .cat-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
  }
  
  .transfer-cell {
    .transfer-accounts {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      
      .account-icon {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }
      
      .account-name {
        font-size: 13px;
        color: $text-regular;
      }
      
      .transfer-arrow {
        color: $primary-color;
        font-size: 12px;
      }
    }
  }
  
  .account-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    
    .account-icon {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }
    
    .account-name {
      font-size: 13px;
      color: $text-regular;
    }
  }
  
  .amount {
    font-weight: 600;
    font-size: 15px;
    
    &.text-transfer {
      color: $warning-color;
    }
  }
  
  .remark {
    color: $text-regular;
  }
  
  .pagination {
    padding: 20px;
    display: flex;
    justify-content: flex-end;
  }
  
  .receipt-cell {
    .receipt-preview {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: $primary-color;
      color: #fff;
      border-radius: 12px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: darken($primary-color, 10%);
        transform: scale(1.05);
      }
      
      i {
        font-size: 14px;
      }
    }
    
    .no-receipt {
      color: $text-secondary;
    }
  }
}
</style>
