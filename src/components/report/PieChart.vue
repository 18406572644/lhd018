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
  name: 'PieChart',
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
      return this.config.dataType || 'expense'
    },
    groupBy() {
      return this.config.groupBy || 'category'
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
      const data = []

      groups.forEach(group => {
        let value = 0
        if (this.dataType === 'income') {
          value = group.income
        } else if (this.dataType === 'expense') {
          value = group.expense
        } else {
          value = group.income + group.expense
        }

        if (value > 0) {
          let name = group.key
          if (this.groupBy === 'category') {
            const cat = this.categories.find(c => c.id === group.key)
            name = cat ? cat.name : group.key
          } else if (this.groupBy === 'account') {
            const acc = this.accounts.find(a => a.id === group.key)
            name = acc ? acc.name : group.key
          }

          data.push({
            name,
            value,
            groupKey: group.key,
            records: group.records
          })
        }
      })

      this.chartData = data

      const colors = this.categories.map(c => c.color)
      
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: ¥{c} ({d}%)'
        },
        legend: {
          show: this.config.showLegend !== false,
          orient: 'vertical',
          right: '5%',
          top: 'center',
          textStyle: {
            fontSize: 12
          }
        },
        color: colors.length > 0 ? colors : undefined,
        series: [
          {
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['35%', '50%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 6,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: this.config.showLabel !== false,
              formatter: '{b}\n{d}%'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 14,
                fontWeight: 'bold'
              },
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            data
          }
        ]
      }

      this.chart.setOption(option)
    },
    handleChartClick(params) {
      if (this.interactive) {
        const item = this.chartData.find(d => d.name === params.name)
        if (item) {
          this.$emit('drill-down', {
            type: 'pie',
            groupBy: this.groupBy,
            groupKey: item.groupKey,
            groupName: item.name,
            dataType: this.dataType,
            records: item.records
          })
        }
      }
    },
    handleClick() {
      if (this.interactive && this.chartData.length > 0) {
        this.$emit('drill-down', {
          type: 'pie-overview',
          config: this.config,
          records: filterRecords(this.records, this.config)
        })
      }
    }
  }
}
</script>

<style scoped lang="scss">
.report-chart {
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
    margin-bottom: 8px;
  }

  .chart-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  .chart-content {
    flex: 1;
    min-height: 0;
  }
}
</style>
