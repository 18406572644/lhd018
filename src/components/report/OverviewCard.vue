<template>
  <div class="report-overview-card" @click="handleClick">
    <div class="card-icon" :class="iconClass">
      <i :class="icon"></i>
    </div>
    <div class="card-content">
      <div class="card-title">{{ component.title }}</div>
      <div class="card-value" :class="valueClass">{{ displayValue }}</div>
      <div v-if="showSubtitle" class="card-subtitle">{{ subtitle }}</div>
    </div>
  </div>
</template>

<script>
import { calculateMetric, formatMoney, filterRecords } from '@/utils/reportUtils'

export default {
  name: 'OverviewCard',
  props: {
    component: {
      type: Object,
      required: true
    },
    records: {
      type: Array,
      default: () => []
    },
    categories: {
      type: Array,
      default: () => []
    },
    accounts: {
      type: Array,
      default: () => []
    },
    interactive: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    config() {
      return this.component.config || {}
    },
    metric() {
      return this.config.metric || 'expense'
    },
    value() {
      return calculateMetric(this.records, this.metric, this.config)
    },
    displayValue() {
      if (this.metric === 'count') {
        return this.value + ' 笔'
      }
      return '¥' + formatMoney(this.value)
    },
    iconClass() {
      return {
        'income-icon': this.metric === 'income' || this.metric === 'avg_income' || this.metric === 'max_income',
        'expense-icon': this.metric === 'expense' || this.metric === 'avg_expense' || this.metric === 'max_expense',
        'balance-icon': this.metric === 'balance',
        'count-icon': this.metric === 'count'
      }
    },
    icon() {
      const icons = {
        income: 'el-icon-data-line',
        expense: 'el-icon-data-line',
        balance: 'el-icon-bank-card',
        count: 'el-icon-document',
        avg_expense: 'el-icon-calculator',
        avg_income: 'el-icon-calculator',
        max_expense: 'el-icon-top',
        max_income: 'el-icon-top'
      }
      return icons[this.metric] || 'el-icon-data-board'
    },
    valueClass() {
      return {
        'text-income': this.metric === 'income' || this.metric === 'avg_income' || this.metric === 'max_income',
        'text-expense': this.metric === 'expense' || this.metric === 'avg_expense' || this.metric === 'max_expense',
        'text-balance': this.metric === 'balance' && this.value >= 0,
        'text-negative': this.metric === 'balance' && this.value < 0
      }
    },
    showSubtitle() {
      return this.config.period && this.config.period !== 'custom'
    },
    subtitle() {
      const periodLabels = {
        week: '本周',
        month: '本月',
        quarter: '本季度',
        year: '本年',
        last_week: '上周',
        last_month: '上月',
        last_quarter: '上季度',
        last_year: '去年'
      }
      return periodLabels[this.config.period] || ''
    },
    filteredRecords() {
      return filterRecords(this.records, this.config)
    }
  },
  methods: {
    handleClick() {
      if (this.interactive) {
        this.$emit('drill-down', {
          type: 'overview',
          metric: this.metric,
          config: this.config,
          records: this.filteredRecords
        })
      }
    }
  }
}
</script>

<style scoped lang="scss">
.report-overview-card {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }

  .card-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin-right: 16px;
    flex-shrink: 0;

    &.income-icon {
      background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
      color: #fff;
    }

    &.expense-icon {
      background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
      color: #fff;
    }

    &.balance-icon {
      background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
      color: #fff;
    }

    &.count-icon {
      background: linear-gradient(135deg, #909399 0%, #a6a9ad 100%);
      color: #fff;
    }
  }

  .card-content {
    flex: 1;
    min-width: 0;
  }

  .card-title {
    font-size: 13px;
    color: #909399;
    margin-bottom: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-value {
    font-size: 22px;
    font-weight: 600;
    line-height: 1.2;

    &.text-income {
      color: #67c23a;
    }

    &.text-expense {
      color: #f56c6c;
    }

    &.text-balance {
      color: #409eff;
    }

    &.text-negative {
      color: #f56c6c;
    }
  }

  .card-subtitle {
    font-size: 12px;
    color: #c0c4cc;
    margin-top: 4px;
  }
}
</style>
