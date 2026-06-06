<template>
  <div class="report-trend-compare" @click="handleClick">
    <div class="chart-header">
      <div class="chart-title">{{ component.title }}</div>
    </div>
    <div class="compare-content">
      <div class="compare-item" v-for="item in compareData" :key="item.key">
        <div class="compare-label">{{ item.label }}</div>
        <div class="compare-values">
          <div class="value-row">
            <span class="value-label">本期</span>
            <span class="value-income" v-if="item.income !== undefined">
              收入 ¥{{ formatMoney(item.income) }}
            </span>
            <span class="value-expense" v-if="item.expense !== undefined">
              支出 ¥{{ formatMoney(item.expense) }}
            </span>
          </div>
          <div class="value-row">
            <span class="value-label">上期</span>
            <span class="value-income" v-if="item.prevIncome !== undefined">
              ¥{{ formatMoney(item.prevIncome) }}
            </span>
            <span class="value-expense" v-if="item.prevExpense !== undefined">
              ¥{{ formatMoney(item.prevExpense) }}
            </span>
          </div>
          <div class="value-row">
            <span class="value-label">同比</span>
            <span
              :class="getYoYClass(item.incomeYoy, true)"
              v-if="item.incomeYoy !== undefined"
            >
              {{ item.incomeYoy >= 0 ? '+' : '' }}{{ item.incomeYoy?.toFixed(1) }}%
            </span>
            <span
              :class="getYoYClass(item.expenseYoy, false)"
              v-if="item.expenseYoy !== undefined"
            >
              {{ item.expenseYoy >= 0 ? '+' : '' }}{{ item.expenseYoy?.toFixed(1) }}%
            </span>
          </div>
          <div class="value-row">
            <span class="value-label">环比</span>
            <span
              :class="getMoMClass(item.incomeMom, true)"
              v-if="item.incomeMom !== undefined"
            >
              {{ item.incomeMom >= 0 ? '+' : '' }}{{ item.incomeMom?.toFixed(1) }}%
            </span>
            <span
              :class="getMoMClass(item.expenseMom, false)"
              v-if="item.expenseMom !== undefined"
            >
              {{ item.expenseMom >= 0 ? '+' : '' }}{{ item.expenseMom?.toFixed(1) }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { calculateMetric, calculateYoY, calculateMoM, getPeriodRange, formatMoney, filterRecords } from '@/utils/reportUtils'

export default {
  name: 'TrendCompare',
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
    compareType() {
      return this.config.compareType || 'yoy_mom'
    },
    compareData() {
      const result = []
      const period = this.config.period || 'month'

      const currentConfig = { ...this.config, period }
      const prevPeriodConfig = { ...this.config, period: period === 'month' ? 'last_month' : period === 'year' ? 'last_year' : 'last_week' }
      const lastYearConfig = { ...this.config, period: 'last_year' }

      const currentIncome = calculateMetric(this.records, 'income', currentConfig)
      const currentExpense = calculateMetric(this.records, 'expense', currentConfig)
      const prevIncome = calculateMetric(this.records, 'income', prevPeriodConfig)
      const prevExpense = calculateMetric(this.records, 'expense', prevPeriodConfig)
      const lastYearIncome = calculateMetric(this.records, 'income', lastYearConfig)
      const lastYearExpense = calculateMetric(this.records, 'expense', lastYearConfig)

      const range = getPeriodRange(period, this.config.startDate, this.config.endDate)
      result.push({
        key: 'summary',
        label: this.getPeriodLabel(period),
        income: currentIncome,
        expense: currentExpense,
        prevIncome,
        prevExpense,
        incomeYoy: calculateYoY(currentIncome, lastYearIncome),
        expenseYoy: calculateYoY(currentExpense, lastYearExpense),
        incomeMom: calculateMoM(currentIncome, prevIncome),
        expenseMom: calculateMoM(currentExpense, prevExpense),
        period,
        range
      })

      return result
    }
  },
  methods: {
    formatMoney,
    getPeriodLabel(period) {
      const labels = {
        week: '本周',
        month: '本月',
        quarter: '本季度',
        year: '本年',
        last_week: '上周',
        last_month: '上月',
        last_quarter: '上季度',
        last_year: '去年'
      }
      return labels[period] || '当前周期'
    },
    getYoYClass(value, isIncome) {
      if (value === undefined || value === null) return ''
      if (isIncome) {
        return value >= 0 ? 'trend-positive' : 'trend-negative'
      } else {
        return value <= 0 ? 'trend-positive' : 'trend-negative'
      }
    },
    getMoMClass(value, isIncome) {
      return this.getYoYClass(value, isIncome)
    },
    handleClick() {
      if (this.interactive) {
        this.$emit('drill-down', {
          type: 'trend-compare',
          config: this.config,
          records: filterRecords(this.records, this.config)
        })
      }
    }
  }
}
</script>

<style scoped lang="scss">
.report-trend-compare {
  height: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 16px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  }

  .chart-header {
    margin-bottom: 16px;
  }

  .chart-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  .compare-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .compare-item {
    padding: 12px;
    background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
    border-radius: 8px;
  }

  .compare-label {
    font-size: 13px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 12px;
  }

  .compare-values {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .value-row {
    display: flex;
    align-items: center;
    gap: 16px;

    .value-label {
      width: 50px;
      font-size: 12px;
      color: #909399;
    }

    .value-income {
      font-size: 12px;
      color: #67c23a;
      min-width: 120px;
    }

    .value-expense {
      font-size: 12px;
      color: #f56c6c;
      min-width: 120px;
    }

    .trend-positive {
      color: #67c23a !important;
      font-size: 12px;
      min-width: 120px;
    }

    .trend-negative {
      color: #f56c6c !important;
      font-size: 12px;
      min-width: 120px;
    }
  }
}
</style>
