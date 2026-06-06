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
  name: 'LineChart',
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
      chartData: {}
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
      const series = []
      const legend = []
      const dataMap = {}

      if (this.groupBy === 'category_month' || this.groupBy === 'category_quarter') {
        const categoryTotals = {}
        groups.forEach(group => {
          const parts = group.key.split('_')
          const catId = parts[0]
          const period = parts[1]
          const cat = this.categories.find(c => c.id === catId)
          const catName = cat ? cat.name : catId
          const value = this.dataType === 'income' ? group.income :
                       this.dataType === 'expense' ? group.expense :
                       group.income - group.expense

          if (!categoryTotals[catId]) {
            categoryTotals[catId] = { name: catName, total: 0, color: cat?.color }
          }
          categoryTotals[catId].total += Math.abs(value)
        })

        const topCategories = Object.entries(categoryTotals)
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, this.config.topCategories || 5)
          .map(([id, data]) => ({ id, ...data }))

        const periods = [...new Set(groups.map(g => g.key.split('_')[1]))].sort()
        xAxisData.push(...periods)

        topCategories.forEach(cat => {
          const data = periods.map(period => {
            const group = groups.find(g => g.key === `${cat.id}_${period}`)
            if (!group) return 0
            return this.dataType === 'income' ? group.income :
                   this.dataType === 'expense' ? group.expense :
                   group.income - group.expense
          })

          series.push({
            name: cat.name,
            type: 'line',
            smooth: this.config.smooth !== false,
            data,
            itemStyle: { color: cat.color },
            lineStyle: { color: cat.color, width: 2 }
          })
          legend.push(cat.name)
        })

        this.chartData = { groups, topCategories, periods }
      } else {
        groups.forEach(group => {
          let label = group.key
          if (this.groupBy === 'category') {
            const cat = this.categories.find(c => c.id === group.key)
            label = cat ? cat.name : group.key
          } else if (this.groupBy === 'account') {
            const acc = this.accounts.find(a => a.id === group.key)
            label = acc ? acc.name : group.key
          }

          xAxisData.push(label)
        })

        if (this.dataType === 'income' || this.dataType === 'both') {
          series.push({
            name: '收入',
            type: 'line',
            smooth: this.config.smooth !== false,
            data: groups.map(g => g.income),
            itemStyle: { color: '#67c23a' },
            lineStyle: { color: '#67c23a', width: 2 },
            areaStyle: this.dataType === 'income' ? {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
                { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
              ])
            } : undefined
          })
          legend.push('收入')
        }

        if (this.dataType === 'expense' || this.dataType === 'both') {
          series.push({
            name: '支出',
            type: 'line',
            smooth: this.config.smooth !== false,
            data: groups.map(g => g.expense),
            itemStyle: { color: '#f56c6c' },
            lineStyle: { color: '#f56c6c', width: 2 },
            areaStyle: this.dataType === 'expense' ? {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(245, 108, 108, 0.3)' },
                { offset: 1, color: 'rgba(245, 108, 108, 0.05)' }
              ])
            } : undefined
          })
          legend.push('支出')
        }

        this.chartData = { groups }
      }

      const option = {
        tooltip: {
          trigger: 'axis',
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
          boundaryGap: false,
          data: xAxisData,
          axisLabel: {
            rotate: xAxisData.length > 8 ? 30 : 0
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

        if (this.groupBy === 'category_month' || this.groupBy === 'category_quarter') {
          const period = this.chartData.periods[dataIndex]
          const cat = this.chartData.topCategories.find(c => c.name === seriesName)
          if (cat) {
            const group = this.chartData.groups.find(g => g.key === `${cat.id}_${period}`)
            records = group?.records || []
          }
        } else {
          const group = this.chartData.groups[dataIndex]
          if (seriesName === '收入') {
            records = group?.records.filter(r => r.type === 'income') || []
          } else if (seriesName === '支出') {
            records = group?.records.filter(r => r.type === 'expense') || []
          }
        }

        this.$emit('drill-down', {
          type: 'line',
          groupBy: this.groupBy,
          groupName: params.name,
          seriesName,
          records
        })
      }
    },
    handleClick() {
      if (this.interactive) {
        this.$emit('drill-down', {
          type: 'line-overview',
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
