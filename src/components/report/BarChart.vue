<template>
  <div class="report-chart" @click="handleClick">
    <div class="chart-header">
      <div class="chart-title">{{ component.title }}</div>
    </div>
    <div ref="chart" class="chart-content"></div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { groupRecords, filterRecords } from '@/utils/reportUtils'

export default {
  name: 'BarChart',
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
  data() {
    return {
      chart: null,
      chartData: []
    }
  },
  computed: {
    config() {
      return this.component.config || {}
    },
    dataType() {
      return this.config.dataType || 'both'
    },
    groupBy() {
      return this.config.groupBy || 'month'
    }
  },
  watch: {
    records: {
      handler() {
        this.updateChart()
      },
      deep: true
    },
    component: {
      handler() {
        this.updateChart()
      },
      deep: true
    }
  },
  mounted() {
    this.initChart()
    this.updateChart()
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    if (this.chart) {
      this.chart.dispose()
    }
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    initChart() {
      this.chart = echarts.init(this.$refs.chart)
      if (this.interactive) {
        this.chart.on('click', this.handleChartClick)
      }
    },
    handleResize() {
      this.chart && this.chart.resize()
    },
    updateChart() {
      if (!this.chart) return

      const groups = groupRecords(this.records, this.groupBy, this.config)
      const xAxisData = []
      const incomeData = []
      const expenseData = []
      const balanceData = []

      groups.forEach(group => {
        let label = group.key
        if (this.groupBy === 'category') {
          const cat = this.categories.find(c => c.id === group.key)
          label = cat ? cat.name : group.key
        } else if (this.groupBy === 'account') {
          const acc = this.accounts.find(a => a.id === group.key)
          label = acc ? acc.name : group.key
        } else if (this.groupBy === 'category_month' || this.groupBy === 'category_quarter') {
          const parts = group.key.split('_')
          const catId = parts[0]
          const period = parts[1]
          const cat = this.categories.find(c => c.id === catId)
          label = `${cat ? cat.name : catId} ${period}`
        }

        xAxisData.push(label)
        incomeData.push({
          value: group.income,
          groupKey: group.key,
          records: group.records.filter(r => r.type === 'income')
        })
        expenseData.push({
          value: group.expense,
          groupKey: group.key,
          records: group.records.filter(r => r.type === 'expense')
        })
        balanceData.push({
          value: group.income - group.expense,
          groupKey: group.key,
          records: group.records
        })
      })

      this.chartData = { xAxisData, incomeData, expenseData, balanceData }

      const series = []
      const legend = []

      if (this.dataType === 'income' || this.dataType === 'both') {
        series.push({
          name: '收入',
          type: 'bar',
          data: incomeData.map(d => d.value),
          itemStyle: { color: '#67c23a' },
          barMaxWidth: 30
        })
        legend.push('收入')
      }

      if (this.dataType === 'expense' || this.dataType === 'both') {
        series.push({
          name: '支出',
          type: 'bar',
          data: expenseData.map(d => d.value),
          itemStyle: { color: '#f56c6c' },
          barMaxWidth: 30
        })
        legend.push('支出')
      }

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: (params) => {
            let result = params[0].name + '<br/>'
            params.forEach(p => {
              result += `${p.marker}${p.seriesName}: ¥${p.value.toFixed(2)}<br/>`
            })
            return result
          }
        },
        legend: {
          show: this.config.showLegend !== false,
          data: legend,
          top: 0
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: 40,
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: xAxisData,
          axisLabel: {
            rotate: xAxisData.length > 6 ? 30 : 0,
            interval: 0
          }
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: (value) => {
              if (value >= 10000) {
                return (value / 10000) + '万'
              }
              return value
            }
          }
        },
        series
      }

      this.chart.setOption(option)
    },
    handleChartClick(params) {
      if (this.interactive) {
        const dataIndex = params.dataIndex
        const seriesName = params.seriesName
        let records = []
        if (seriesName === '收入') {
          records = this.chartData.incomeData[dataIndex]?.records || []
        } else if (seriesName === '支出') {
          records = this.chartData.expenseData[dataIndex]?.records || []
        }

        this.$emit('drill-down', {
          type: 'bar',
          groupBy: this.groupBy,
          groupKey: this.chartData.incomeData[dataIndex]?.groupKey,
          groupName: this.chartData.xAxisData[dataIndex],
          dataType: seriesName === '收入' ? 'income' : 'expense',
          records
        })
      }
    },
    handleClick() {
      if (this.interactive) {
        this.$emit('drill-down', {
          type: 'bar-overview',
          config: this.config,
          records: filterRecords(this.records, this.config)
        })
      }
    }
  }
}
</script>

<style scoped lang="scss">
@import './report-chart.scss';
</style>
