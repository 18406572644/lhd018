<template>
  <div class="page-container quick-add">
    <div class="header">
      <h2 class="page-title">快速记一笔</h2>
      <el-date-picker
        v-model="currentDate"
        type="date"
        format="yyyy-MM-dd"
        value-format="yyyy-MM-dd"
        :clearable="false"
        class="date-picker"
      />
    </div>

    <el-card class="card form-card" shadow="never">
      <el-radio-group v-model="form.type" class="type-switch">
        <el-radio-button label="expense" class="type-btn">
          <span class="type-label">支出</span>
        </el-radio-button>
        <el-radio-button label="income" class="type-btn">
          <span class="type-label">收入</span>
        </el-radio-button>
      </el-radio-group>

      <div class="amount-section">
        <span class="currency">¥</span>
        <el-input
          v-model="form.amount"
          type="number"
          placeholder="0.00"
          class="amount-input"
          :class="{ 'expense-input': form.type === 'expense', 'income-input': form.type === 'income' }"
          ref="amountInput"
        />
      </div>

      <div class="categories-section">
        <div class="section-title">选择分类</div>
        <div class="categories-grid">
          <div
            v-for="cat in filteredCategories"
            :key="cat.id"
            class="category-item"
            :class="{ active: form.categoryId === cat.id }"
            :style="{ borderColor: form.categoryId === cat.id ? cat.color : 'transparent' }"
            @click="selectCategory(cat)"
          >
            <div class="category-icon" :style="{ backgroundColor: cat.color + '20', color: cat.color }">
              {{ cat.icon }}
            </div>
            <div class="category-name">{{ cat.name }}</div>
          </div>
        </div>
      </div>

      <div class="remark-section">
        <el-input
          v-model="form.remark"
          placeholder="添加备注（可选）"
          class="remark-input"
          maxlength="50"
          show-word-limit
        />
      </div>

      <div class="actions">
        <el-button size="large" @click="resetForm">重置</el-button>
        <el-button
          type="primary"
          size="large"
          :disabled="!canSubmit"
          @click="handleSubmit"
          :class="form.type === 'expense' ? 'expense-btn' : 'income-btn'"
        >
          保存
        </el-button>
      </div>
    </el-card>

    <div class="recent-records" v-if="todayRecords.length > 0">
      <div class="section-title">今日记录</div>
      <el-card class="card" shadow="never">
        <div class="record-item" v-for="record in todayRecords" :key="record.id">
          <div class="record-left">
            <div
              class="record-icon"
              :style="{ backgroundColor: getCategory(record.categoryId)?.color + '20', color: getCategory(record.categoryId)?.color }"
            >
              {{ getCategory(record.categoryId)?.icon }}
            </div>
            <div class="record-info">
              <div class="record-category">{{ getCategory(record.categoryId)?.name }}</div>
              <div class="record-remark" v-if="record.remark">{{ record.remark }}</div>
            </div>
          </div>
          <div class="record-amount" :class="record.type">
            {{ record.type === 'income' ? '+' : '-' }}{{ formatMoney(record.amount) }}
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
import { recordApi, categoryApi } from '@/api'
import { formatMoney, formatDate } from '@/utils'

export default {
  name: 'QuickAdd',
  data() {
    return {
      currentDate: formatDate(new Date()),
      categories: [],
      records: [],
      form: {
        type: 'expense',
        amount: '',
        categoryId: '',
        categoryName: '',
        remark: '',
        date: formatDate(new Date())
      }
    }
  },
  computed: {
    filteredCategories() {
      return this.categories.filter(c => c.type === this.form.type)
    },
    canSubmit() {
      return this.form.amount && parseFloat(this.form.amount) > 0 && this.form.categoryId
    },
    todayRecords() {
      const today = formatDate(new Date())
      return this.records.filter(r => r.date === today).slice(0, 10)
    }
  },
  watch: {
    currentDate(val) {
      this.form.date = val
    },
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
    async loadData() {
      const [records, categories] = await Promise.all([
        recordApi.getRecords(),
        categoryApi.getCategories()
      ])
      this.records = records || []
      this.categories = categories || []
    },
    getCategory(id) {
      return this.categories.find(c => c.id === id)
    },
    selectCategory(cat) {
      this.form.categoryId = cat.id
      this.form.categoryName = cat.name
    },
    async handleSubmit() {
      if (!this.canSubmit) return
      
      const record = {
        ...this.form,
        amount: parseFloat(this.form.amount)
      }
      
      const result = await recordApi.addRecord(record)
      if (result) {
        this.$message.success('记账成功')
        this.resetForm()
        this.loadData()
      } else {
        this.$message.error('记账失败')
      }
    },
    resetForm() {
      this.form = {
        type: 'expense',
        amount: '',
        categoryId: '',
        categoryName: '',
        remark: '',
        date: this.currentDate
      }
      this.$nextTick(() => {
        if (this.$refs.amountInput) {
          this.$refs.amountInput.focus()
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.quick-add {
  max-width: 700px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  .page-title {
    font-size: 22px;
    font-weight: 600;
    color: $text-primary;
  }
  
  .date-picker {
    width: 160px;
  }
}

.form-card {
  padding: 8px;
  margin-bottom: 24px;
}

.type-switch {
  display: flex;
  margin-bottom: 24px;
  
  ::v-deep .el-radio-button {
    flex: 1;
    
    .el-radio-button__inner {
      width: 100%;
      padding: 12px 0;
      font-size: 15px;
      border-radius: 8px !important;
      border: none;
      background: #f5f7fa;
      color: $text-regular;
      
      &.is-active {
        background: $primary-color;
        color: #fff;
      }
    }
  }
  
  ::v-deep .el-radio-button:first-child .el-radio-button__inner {
    border-right: none;
    margin-right: 8px;
  }
}

.amount-section {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  
  .currency {
    font-size: 32px;
    font-weight: 600;
    color: $text-primary;
    margin-right: 8px;
  }
  
  .amount-input {
    width: 240px;
    
    ::v-deep .el-input__inner {
      font-size: 36px;
      font-weight: 600;
      text-align: center;
      border: none;
      border-bottom: 2px solid $border-color;
      border-radius: 0;
      padding: 8px 0;
      background: transparent;
      
      &:focus {
        border-bottom-color: $primary-color;
      }
    }
    
    &.expense-input ::v-deep .el-input__inner:focus {
      border-bottom-color: $expense-color;
    }
    
    &.income-input ::v-deep .el-input__inner:focus {
      border-bottom-color: $income-color;
    }
  }
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: $text-regular;
  margin-bottom: 12px;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  background: #fafafa;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  &.active {
    background: #fff;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
  
  .category-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    margin-bottom: 6px;
  }
  
  .category-name {
    font-size: 13px;
    color: $text-regular;
  }
}

.remark-section {
  margin-bottom: 24px;
  
  .remark-input {
    ::v-deep .el-input__inner {
      border-radius: 8px;
    }
  }
}

.actions {
  display: flex;
  gap: 12px;
  
  .el-button {
    flex: 1;
    border-radius: 8px;
    font-size: 15px;
    padding: 12px 0;
    
    &.expense-btn {
      background: $expense-color;
      border-color: $expense-color;
      
      &:hover {
        background: darken($expense-color, 5%);
        border-color: darken($expense-color, 5%);
      }
    }
    
    &.income-btn {
      background: $income-color;
      border-color: $income-color;
      
      &:hover {
        background: darken($income-color, 5%);
        border-color: darken($income-color, 5%);
      }
    }
  }
}

.recent-records {
  .record-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #f0f2f5;
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  .record-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .record-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }
  
  .record-category {
    font-size: 14px;
    color: $text-primary;
    font-weight: 500;
  }
  
  .record-remark {
    font-size: 12px;
    color: $text-secondary;
    margin-top: 2px;
  }
  
  .record-amount {
    font-size: 16px;
    font-weight: 600;
    
    &.income {
      color: $income-color;
    }
    
    &.expense {
      color: $expense-color;
    }
  }
}
</style>
