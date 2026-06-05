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
  </div>
</template>

<script>
import { recordApi, categoryApi } from '@/api'
import { formatMoney, getMonthRange } from '@/utils'

export default {
  name: 'Layout',
  data() {
    return {
      records: [],
      categories: [],
      monthSummary: null
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
        } else {
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
</style>
