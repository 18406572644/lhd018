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
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filters.categoryId" placeholder="全部" clearable style="width: 140px">
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
      <el-col :span="8">
        <div class="stat-card income-card">
          <div class="stat-label">总收入</div>
          <div class="stat-value">+{{ formatMoney(stats.income) }}</div>
          <div class="stat-count">{{ stats.incomeCount }} 笔</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card expense-card">
          <div class="stat-label">总支出</div>
          <div class="stat-value">-{{ formatMoney(stats.expense) }}</div>
          <div class="stat-count">{{ stats.expenseCount }} 笔</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card balance-card">
          <div class="stat-label">净结余</div>
          <div class="stat-value" :class="stats.balance >= 0 ? 'positive' : 'negative'">
            {{ stats.balance >= 0 ? '+' : '' }}{{ formatMoney(stats.balance) }}
          </div>
          <div class="stat-count">共 {{ filteredRecords.length }} 笔记录</div>
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
            <el-tag :type="scope.row.type === 'income' ? 'success' : 'danger'" size="mini">
              {{ scope.row.type === 'income' ? '收入' : '支出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="140">
          <template slot-scope="scope">
            <div class="category-cell">
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
        <el-table-column label="金额" width="120" align="right">
          <template slot-scope="scope">
            <span :class="scope.row.type === 'income' ? 'text-income' : 'text-expense'" class="amount">
              {{ scope.row.type === 'income' ? '+' : '-' }}{{ formatMoney(scope.row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="备注" show-overflow-tooltip>
          <template slot-scope="scope">
            <span class="remark">{{ scope.row.remark || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right" align="center">
          <template slot-scope="scope">
            <el-button size="mini" type="primary" icon="el-icon-edit" @click="handleEdit(scope.row)" />
            <el-button size="mini" type="danger" icon="el-icon-delete" @click="handleDelete(scope.row)" />
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
      :title="isEdit ? '编辑记录' : '新增记录'"
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
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%" @change="handleCategoryChange">
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
            style="width: 100%"
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
  </div>
</template>

<script>
import { recordApi, categoryApi } from '@/api'
import { formatMoney, formatDate } from '@/utils'

export default {
  name: 'Records',
  data() {
    return {
      loading: false,
      records: [],
      categories: [],
      filters: {
        type: '',
        categoryId: '',
        dateRange: [],
        keyword: ''
      },
      pagination: {
        page: 1,
        pageSize: 20
      },
      dialogVisible: false,
      isEdit: false,
      form: {
        id: '',
        type: 'expense',
        categoryId: '',
        categoryName: '',
        amount: '',
        date: formatDate(new Date()),
        remark: ''
      },
      rules: {
        type: [{ required: true, message: '请选择类型', trigger: 'change' }],
        categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
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
    filteredRecords() {
      let result = [...this.records]
      
      if (this.filters.type) {
        result = result.filter(r => r.type === this.filters.type)
      }
      
      if (this.filters.categoryId) {
        result = result.filter(r => r.categoryId === this.filters.categoryId)
      }
      
      if (this.filters.dateRange && this.filters.dateRange.length === 2) {
        const [start, end] = this.filters.dateRange
        result = result.filter(r => r.date >= start && r.date <= end)
      }
      
      if (this.filters.keyword) {
        const keyword = this.filters.keyword.toLowerCase()
        result = result.filter(r => 
          (r.remark && r.remark.toLowerCase().includes(keyword)) ||
          r.categoryName.toLowerCase().includes(keyword)
        )
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
      
      this.filteredRecords.forEach(r => {
        const amount = Number(r.amount)
        if (r.type === 'income') {
          income += amount
          incomeCount++
        } else {
          expense += amount
          expenseCount++
        }
      })
      
      return {
        income,
        expense,
        balance: income - expense,
        incomeCount,
        expenseCount
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
        const [records, categories] = await Promise.all([
          recordApi.getRecords(),
          categoryApi.getCategories()
        ])
        this.records = records || []
        this.categories = categories || []
      } finally {
        this.loading = false
      }
    },
    getCategory(id) {
      return this.categories.find(c => c.id === id)
    },
    handleCategoryChange(id) {
      const cat = this.getCategory(id)
      if (cat) {
        this.form.categoryName = cat.name
      }
    },
    handleSearch() {
      this.pagination.page = 1
    },
    handleReset() {
      this.filters = {
        type: '',
        categoryId: '',
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
    handleEdit(record) {
      this.isEdit = true
      this.form = { ...record }
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs.form.clearValidate()
      })
    },
    async handleDelete(record) {
      try {
        await this.$confirm(`确定要删除这条记录吗？`, '提示', {
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
          const data = {
            ...this.form,
            amount: parseFloat(this.form.amount)
          }
          let result
          if (this.isEdit) {
            result = await recordApi.updateRecord(data)
          } else {
            result = await recordApi.addRecord(data)
          }
          if (result) {
            this.$message.success(this.isEdit ? '更新成功' : '创建成功')
            this.dialogVisible = false
            this.loadData()
          }
        }
      })
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
  
  .amount {
    font-weight: 600;
    font-size: 15px;
  }
  
  .remark {
    color: $text-regular;
  }
  
  .pagination {
    padding: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
