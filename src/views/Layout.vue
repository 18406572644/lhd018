<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="logo">
        <span class="logo-icon">💰</span>
        <span class="logo-text">快捷记账</span>
      </div>
      <el-menu
        :default-active="$route.path"
        router
        class="menu"
        background-color="transparent"
        text-color="#606266"
        active-text-color="#409EFF"
        :collapse="false"
      >
        <el-menu-item
          v-for="route in menuRoutes"
          :key="route.path"
          :index="route.fullPath"
        >
          <i :class="route.meta.icon"></i>
          <span slot="title">{{ route.meta.title }}</span>
        </el-menu-item>
      </el-menu>
      <div class="sidebar-footer">
        <div class="reminders" v-if="reminders.length > 0">
          <div
            v-for="reminder in reminders"
            :key="reminder.accountId + reminder.type"
            class="reminder-item"
            :class="reminder.type"
          >
            <i :class="reminder.type === 'due' ? 'el-icon-warning' : 'el-icon-bell'"></i>
            <span class="reminder-text">{{ reminder.message }}</span>
          </div>
        </div>

        <div class="account-overview-card" v-if="accountOverview">
          <div class="overview-header">
            <span class="overview-title">账户总览</span>
            <span class="net-worth" :class="accountOverview.netWorth >= 0 ? 'positive' : 'negative'">
              {{ accountOverview.netWorth >= 0 ? '+' : '' }}{{ formatMoney(accountOverview.netWorth) }}
            </span>
          </div>
          <div class="overview-stats">
            <div class="stat-item">
              <span class="stat-label">资产</span>
              <span class="stat-value text-asset">+{{ formatMoney(accountOverview.totalAssets) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">负债</span>
              <span class="stat-value text-liability">-{{ formatMoney(accountOverview.totalLiabilities) }}</span>
            </div>
          </div>
          <div class="account-list" v-if="accountOverview.accounts.length > 0">
            <div
              v-for="account in accountOverview.accounts.slice(0, 4)"
              :key="account.id"
              class="account-item"
            >
              <span class="account-icon" :style="{ backgroundColor: account.color + '20', color: account.color }">
                {{ account.icon }}
              </span>
              <span class="account-name">{{ account.name }}</span>
              <span class="account-balance" :class="{ 'negative': account.balance < 0 }">
                {{ account.balance >= 0 ? '' : '-' }}{{ formatMoney(Math.abs(account.balance)) }}
              </span>
            </div>
            <div v-if="accountOverview.accounts.length > 4" class="more-accounts" @click="$router.push('/accounts')">
              还有 {{ accountOverview.accounts.length - 4 }} 个账户...
            </div>
          </div>
        </div>

        <div class="summary-card" v-if="monthSummary">
          <div class="summary-item">
            <span class="label">本月收入</span>
            <span class="value text-income">+{{ formatMoney(monthSummary.income) }}</span>
          </div>
          <div class="summary-item">
            <span class="label">本月支出</span>
            <span class="value text-expense">-{{ formatMoney(monthSummary.expense) }}</span>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-item">
            <span class="label">本月结余</span>
            <span class="value" :class="monthSummary.balance >= 0 ? 'text-income' : 'text-expense'">
              {{ monthSummary.balance >= 0 ? '+' : '' }}{{ formatMoney(monthSummary.balance) }}
            </span>
          </div>
        </div>
      </div>
    </aside>
    <main class="main-content">
      <router-view />
    </main>

    <el-dialog
      title="周期账单确认"
      :visible.sync="showConfirmDialog"
      width="420px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div v-if="currentConfirmation" class="confirm-content">
        <div class="confirm-icon" :class="currentConfirmation.type">
          {{ currentConfirmation.type === 'income' ? '📈' : '📉' }}
        </div>
        <div class="confirm-info">
          <div class="confirm-title">
            是否生成 "{{ currentConfirmation.billName }}" 记录？
          </div>
          <div class="confirm-detail">
            <div class="detail-row">
              <span class="label">类型：</span>
              <span :class="currentConfirmation.type">
                {{ currentConfirmation.type === 'income' ? '收入' : '支出' }}
              </span>
            </div>
            <div class="detail-row">
              <span class="label">金额：</span>
              <span class="amount" :class="currentConfirmation.type">
                {{ currentConfirmation.type === 'income' ? '+' : '-' }}¥{{ formatMoney(currentConfirmation.amount) }}
              </span>
            </div>
            <div class="detail-row">
              <span class="label">分类：</span>
              <span>{{ currentConfirmation.categoryName }}</span>
            </div>
            <div class="detail-row">
              <span class="label">账户：</span>
              <span>{{ currentConfirmation.accountName }}</span>
            </div>
            <div class="detail-row">
              <span class="label">日期：</span>
              <span>{{ currentConfirmation.date }}</span>
            </div>
          </div>
        </div>
      </div>
      <span slot="footer">
        <el-button @click="handleSkipConfirmation">跳过本期</el-button>
        <el-button type="primary" @click="handleConfirmGenerate">确认生成</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { recordApi, categoryApi, accountApi, recurringBillApi } from '@/api'
import { formatMoney, getMonthRange, formatDate } from '@/utils'

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null }

export default {
  name: 'Layout',
  data() {
    return {
      records: [],
      categories: [],
      accounts: [],
      monthSummary: null,
      accountOverview: null,
      reminders: [],
      pendingConfirmations: [],
      showConfirmDialog: false,
      currentConfirmation: null
    }
  },
  computed: {
    menuRoutes() {
      return this.$router.options.routes[0].children.map(route => ({
        ...route,
        fullPath: '/' + route.path
      }))
    }
  },
  created() {
    this.loadData()
    this.setupIpcListeners()
  },
  beforeDestroy() {
    if (ipcRenderer) {
      ipcRenderer.removeAllListeners('check-recurring-bills')
    }
  },
  methods: {
    formatMoney,
    setupIpcListeners() {
      if (ipcRenderer) {
        ipcRenderer.on('check-recurring-bills', () => {
          this.checkRecurringBills()
        })
      }
    },
    async checkRecurringBills() {
      const result = await recurringBillApi.checkAndGenerate()
      if (result) {
        if (result.generatedRecords && result.generatedRecords.length > 0) {
          this.$message.success(`已自动生成 ${result.generatedRecords.length} 条周期账单记录`)
          this.loadData()
        }
        if (result.pendingConfirmations && result.pendingConfirmations.length > 0) {
          this.pendingConfirmations = result.pendingConfirmations
          this.showNextConfirmation()
        }
      }
    },
    showNextConfirmation() {
      if (this.pendingConfirmations.length > 0) {
        this.currentConfirmation = this.pendingConfirmations[0]
        this.showConfirmDialog = true
      }
    },
    async handleConfirmGenerate() {
      if (!this.currentConfirmation) return
      
      const record = await recurringBillApi.generateRecord(
        this.currentConfirmation.billId,
        this.currentConfirmation.date
      )
      
      if (record) {
        this.$message.success(`已生成记录: ${this.currentConfirmation.billName}`)
      }
      
      this.pendingConfirmations.shift()
      this.showConfirmDialog = false
      this.currentConfirmation = null
      this.loadData()
      
      setTimeout(() => {
        this.showNextConfirmation()
      }, 500)
    },
    async handleSkipConfirmation() {
      if (!this.currentConfirmation) return
      
      await recurringBillApi.skipDate(
        this.currentConfirmation.billId,
        this.currentConfirmation.date
      )
      
      this.$message.info(`已跳过: ${this.currentConfirmation.billName}`)
      
      this.pendingConfirmations.shift()
      this.showConfirmDialog = false
      this.currentConfirmation = null
      
      setTimeout(() => {
        this.showNextConfirmation()
      }, 500)
    },
    async loadData() {
      const [records, categories, accountOverview, creditCardReminders, recurringReminders] = await Promise.all([
        recordApi.getRecords(),
        categoryApi.getCategories(),
        accountApi.getAccountOverview(),
        accountApi.getCreditCardReminders(),
        recurringBillApi.getReminders()
      ])
      this.records = records || []
      this.categories = categories || []
      this.accountOverview = accountOverview
      
      const allReminders = [...(creditCardReminders || []), ...(recurringReminders || [])]
      this.reminders = allReminders.sort((a, b) => a.days - b.days)
      
      this.calculateMonthSummary()
    },
    calculateMonthSummary() {
      const { start, end } = getMonthRange()
      const monthRecords = this.records.filter(r => {
        const date = new Date(r.date)
        return date >= start && date <= end
      })
      
      let income = 0
      let expense = 0
      monthRecords.forEach(r => {
        if (r.type === 'income') {
          income += Number(r.amount)
        } else if (r.type === 'expense') {
          expense += Number(r.amount)
        }
      })
      
      this.monthSummary = {
        income,
        expense,
        balance: income - expense
      }
    }
  },
  watch: {
    '$route'() {
      this.loadData()
    }
  }
}
</script>

<style lang="scss" scoped>
.layout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f2f5;
  
  .logo-icon {
    font-size: 28px;
    margin-right: 8px;
  }
  
  .logo-text {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }
}

.menu {
  flex: 1;
  border-right: none;
  padding: 12px 0;
  
  ::v-deep .el-menu-item {
    height: 48px;
    line-height: 48px;
    margin: 4px 12px;
    border-radius: 6px;
    
    &:hover {
      background-color: #f5f7fa;
    }
    
    &.is-active {
      background-color: #ecf5ff;
    }
  }
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #f0f2f5;
}

.reminders {
  margin-bottom: 12px;
  
  .reminder-item {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 6px;
    margin-bottom: 6px;
    font-size: 12px;
    
    &.bill {
      background: #fdf6ec;
      color: #e6a23c;
    }
    
    &.due {
      background: #fef0f0;
      color: #f56c6c;
    }
    
    &:last-child {
      margin-bottom: 0;
    }
    
    i {
      font-size: 14px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    
    .reminder-text {
      line-height: 1.4;
    }
  }
}

.account-overview-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
  
  .overview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    
    .overview-title {
      font-size: 13px;
      font-weight: 600;
      color: $text-primary;
    }
    
    .net-worth {
      font-size: 14px;
      font-weight: 600;
      
      &.positive {
        color: $income-color;
      }
      
      &.negative {
        color: $expense-color;
      }
    }
  }
  
  .overview-stats {
    display: flex;
    gap: 12px;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #f0f2f5;
    
    .stat-item {
      flex: 1;
      text-align: center;
      
      .stat-label {
        display: block;
        font-size: 11px;
        color: $text-secondary;
        margin-bottom: 2px;
      }
      
      .stat-value {
        font-size: 13px;
        font-weight: 600;
        
        &.text-asset {
          color: #11998e;
        }
        
        &.text-liability {
          color: #eb3349;
        }
      }
    }
  }
  
  .account-list {
    .account-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      
      .account-icon {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }
      
      .account-name {
        flex: 1;
        font-size: 12px;
        color: $text-regular;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .account-balance {
        font-size: 12px;
        font-weight: 600;
        color: $text-primary;
        
        &.negative {
          color: $expense-color;
        }
      }
    }
    
    .more-accounts {
      text-align: center;
      font-size: 11px;
      color: $text-secondary;
      padding-top: 6px;
      cursor: pointer;
      
      &:hover {
        color: $primary-color;
      }
    }
  }
}

.summary-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  padding: 16px;
  color: #fff;
  
  .summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    
    .label {
      font-size: 12px;
      opacity: 0.85;
    }
    
    .value {
      font-size: 15px;
      font-weight: 600;
      
      &.text-income {
        color: #a8edea;
      }
      
      &.text-expense {
        color: #ffd3a5;
      }
    }
  }
  
  .summary-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.2);
    margin: 8px 0;
  }
}

.main-content {
  flex: 1;
  overflow: hidden;
  background: $bg-color;
}

.confirm-content {
  display: flex;
  gap: 16px;
  padding: 16px 0;
  
  .confirm-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    flex-shrink: 0;
    
    &.income {
      background: linear-gradient(135deg, #67C23A 0%, #52a82a 100%);
    }
    
    &.expense {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
    }
  }
  
  .confirm-info {
    flex: 1;
    
    .confirm-title {
      font-size: 16px;
      font-weight: 600;
      color: $text-primary;
      margin-bottom: 16px;
    }
    
    .confirm-detail {
      .detail-row {
        display: flex;
        margin-bottom: 8px;
        font-size: 14px;
        
        .label {
          color: $text-secondary;
          width: 60px;
          flex-shrink: 0;
        }
        
        .income {
          color: $income-color;
          font-weight: 500;
        }
        
        .expense {
          color: $expense-color;
          font-weight: 500;
        }
        
        .amount {
          font-weight: 600;
          font-size: 15px;
        }
      }
    }
  }
}
</style>
