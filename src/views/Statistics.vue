<template>
  <div class="page-container statistics">
    <div class="header flex-between">
      <h2 class="page-title">统计图表</h2>
      <el-date-picker
        v-model="currentMonth"
        type="month"
        format="yyyy-MM"
        value-format="yyyy-MM"
        placeholder="选择月份"
        class="month-picker"
        @change="loadData"
      />
    </div>

    <el-row :gutter="16" class="overview-row">
      <el-col :span="6">
        <div class="overview-card">
          <div class="overview-icon income-icon">📈</div>
          <div class="overview-info">
            <div class="overview-label">本月收入</div>
            <div class="overview-value text-income">+{{ formatMoney(overview.income) }}</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="overview-card">
          <div class="overview-icon expense-icon">📉</div>
          <div class="overview-info">
            <div class="overview-label">本月支出</div>
            <div class="overview-value text-expense">-{{ formatMoney(overview.expense) }}</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="overview-card">
          <div class="overview-icon balance-icon">💵</div>
          <div class="overview-info">
            <div class="overview-label">本月结余</div>
            <div class="overview-value" :class="overview.balance >= 0 ? 'text-income' : 'text-expense'">
              {{ overview.balance >= 0 ? '+' : '' }}{{ formatMoney(overview.balance) }}
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="overview-card">
          <div class="overview-icon count-icon">📝</div>
          <div class="overview-info">
            <div class="overview-label">记录笔数</div>
            <div class="overview-value">{{ monthRecords.length }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card class="card chart-card" shadow="never">
          <div class="card-header">
            <span class="card-title">支出分类占比</span>
          </div>
          <div ref="expensePieChart" class="chart"></div>
          <div class="chart-legend" v-if="expenseByCategory.length > 0">
            <div
              v-for="(item, index) in expenseByCategory"
              :key="item.categoryId"
              class="legend-item"
            >
              <span class="legend-color" :style="{ backgroundColor: item.color }"></span>
              <span class="legend-name">{{ item.name }}</span>
              <span class="legend-value">¥{{ formatMoney(item.amount) }}</span>
              <span class="legend-percent">{{ item.percent }}%</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="card chart-card" shadow="never">
          <div class="card-header">
            <span class="card-title">收入分类占比</span>
          </div>
          <div ref="incomePieChart" class="chart"></div>
          <div class="chart-legend" v-if="incomeByCategory.length > 0">
            <div
              v-for="(item, index) in incomeByCategory"
              :key="item.categoryId"
              class="legend-item"
            >
              <span class="legend-color" :style="{ backgroundColor: item.color }"></span>
              <span class="legend-name">{{ item.name }}</span>
              <span class="legend-value">¥{{ formatMoney(item.amount) }}</span>
              <span class="legend-percent">{{ item.percent }}%</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="card chart-card" shadow="never">
      <div class="card-header">
        <span class="card-title">每日收支趋势</span>
        <el-radio-group v-model="trendType" size="mini">
          <el-radio-button label="expense">支出</el-radio-button>
          <el-radio-button label="income">收入</el-radio-button>
          <el-radio-button label="all">全部</el-radio-button>
        </el-radio-group>
      </div>
      <div ref="trendChart" class="chart trend-chart"></div>
    </el-card>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { recordApi, categoryApi } from '@/api'
import { formatMoney, formatDate, getMonthRange } from '@/utils'

export default {
  name: 'Statistics',
  data() {
    return {
      currentMonth: formatDate(new Date(), 'YYYY-MM'),
      trendType: 'expense',
      records: [],
      categories: [],
      expensePieChart: null,
      incomePieChart: null,
      trendChart: null
    }
  },
  computed: {
    monthRecords() {
      const [year, month] = this.currentMonth.split('-').map(Number)
      const { start, end } = getMonthRange(new Date(year, month - 1))
      return this.records.filter(r => {
        const date = new Date(r.date)
        return date >= start && date <= end
      })
    },
    overview() {
      let income = 0
      let expense = 0
      this.monthRecords.forEach(r => {
        if (r.type === 'income') {
          income += Number(r.amount)
        } else {
          expense += Number(r.amount)
        }
      })
      return {
        income,
        expense,
        balance: income - expense
      }
    },
    expenseByCategory() {
      const map = {}
      let total = 0
      this.monthRecords
        .filter(r => r.type === 'expense')
        .forEach(r => {
          if (!map[r.categoryId]) {
            const cat = this.getCategory(r.categoryId)
            map[r.categoryId] = {
              categoryId: r.categoryId,
              name: r.categoryName,
              amount: 0,
              color: cat?.color || '#909399'
            }
          }
          map[r.categoryId].amount += Number(r.amount)
          total += Number(r.amount)
        })
      
      return Object.values(map)
        .sort((a, b) => b.amount - a.amount)
        .map(item => ({
          ...item,
          percent: total > 0 ? ((item.amount / total) * 100).toFixed(1) : 0
        }))
    },
    incomeByCategory() {
      const map = {}
      let total = 0
      this.monthRecords
        .filter(r => r.type === 'income')
        .forEach(r => {
          if (!map[r.categoryId]) {
            const cat = this.getCategory(r.categoryId)
            map[r.categoryId] = {
              categoryId: r.categoryId,
              name: r.categoryName,
              amount: 0,
              color: cat?.color || '#909399'
            }
          }
          map[r.categoryId].amount += Number(r.amount)
          total += Number(r.amount)
        })
      
      return Object.values(map)
        .sort((a, b) => b.amount - a.amount)
        .map(item => ({
          ...item,
          percent: total > 0 ? ((item.amount / total) * 100).toFixed(1) : 0
        }))
    },
    dailyTrend() {
      const [year, month] = this.currentMonth.split('-').map(Number)
      const daysInMonth = new Date(year, month, 0).getDate()
      const dailyData = {}
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        dailyData[dateStr] = { income: 0, expense: 0 }
      }
      
      this.monthRecords.forEach(r => {
        if (dailyData[r.date]) {
          dailyData[r.date][r.type] += Number(r.amount)
        }
      })
      
      return Object.entries(dailyData).map(([date, values]) => ({
        date,
        day: parseInt(date.split('-')[2]),
        ...values
      }))
    }
  },
  watch: {
    trendType() {
      this.renderTrendChart()
    }
  },
  mounted() {
    this.loadData()
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
    this.expensePieChart?.dispose()
    this.incomePieChart?.dispose()
    this.trendChart?.dispose()
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
      this.$nextTick(() => {
        this.initCharts()
      })
    },
    getCategory(id) {
      return this.categories.find(c => c.id === id)
    },
    handleResize() {
      this.expensePieChart?.resize()
      this.incomePieChart?.resize()
      this.trendChart?.resize()
    },
    initCharts() {
      this.renderExpensePieChart()
      this.renderIncomePieChart()
      this.renderTrendChart()
    },
    renderExpensePieChart() {
      if (!this.$refs.expensePieChart) return
      
      if (this.expensePieChart) {
        this.expensePieChart.dispose()
      }
      
      this.expensePieChart = echarts.init(this.$refs.expensePieChart)
      
      const data = this.expenseByCategory.map(item => ({
        value: item.amount,
        name: item.name,
        itemStyle: { color: item.color }
      }))
      
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: ¥{c} ({d}%)'
        },
        series: [{
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false
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
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            }
          },
          labelLine: {
            show: false
          },
          data: data
        }]
      }
      
      this.expensePieChart.setOption(option)
    },
    renderIncomePieChart() {
      if (!this.$refs.incomePieChart) return
      
      if (this.incomePieChart) {
        this.incomePieChart.dispose()
      }
      
      this.incomePieChart = echarts.init(this.$refs.incomePieChart)
      
      const data = this.incomeByCategory.map(item => ({
        value: item.amount,
        name: item.name,
        itemStyle: { color: item.color }
      }))
      
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: ¥{c} ({d}%)'
        },
        series: [{
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false
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
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            }
          },
          labelLine: {
            show: false
          },
          data: data
        }]
      }
      
      this.incomePieChart.setOption(option)
    },
    renderTrendChart() {
      if (!this.$refs.trendChart) return
      
      if (this.trendChart) {
        this.trendChart.dispose()
      }
      
      this.trendChart = echarts.init(this.$refs.trendChart)
      
      const xData = this.dailyTrend.map(item => item.day + '日')
      let series = []
      
      if (this.trendType === 'all' || this.trendType === 'income') {
        series.push({
          name: '收入',
          type: 'bar',
          data: this.dailyTrend.map(item => item.income),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#67C23A' },
              { offset: 1, color: '#95D475' }
            ]),
            borderRadius: [4, 4, 0, 0]
          }
        })
      }
      
      if (this.trendType === 'all' || this.trendType === 'expense') {
        series.push({
          name: '支出',
          type: 'bar',
          data: this.dailyTrend.map(item => item.expense),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#F56C6C' },
              { offset: 1, color: '#F89898' }
            ]),
            borderRadius: [4, 4, 0, 0]
          }
        })
      }
      
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: (params) => {
            let result = params[0].axisValue + '<br/>'
            params.forEach(param => {
              result += `${param.marker} ${param.seriesName}: ¥${param.value.toFixed(2)}<br/>`
            })
            return result
          }
        },
        legend: {
          show: this.trendType === 'all',
          data: ['收入', '支出'],
          top: 0,
          right: 0
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: this.trendType === 'all' ? 40 : 10,
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: xData,
          axisLine: {
            lineStyle: { color: '#e4e7ed' }
          },
          axisLabel: {
            color: '#909399',
            interval: 'auto',
            fontSize: 11
          }
        },
        yAxis: {
          type: 'value',
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: {
            lineStyle: {
              color: '#f0f2f5',
              type: 'dashed'
            }
          },
          axisLabel: {
            color: '#909399',
            formatter: (value) => value >= 1000 ? (value / 1000) + 'k' : value
          }
        },
        series: series
      }
      
      this.trendChart.setOption(option)
    }
  }
}
</script>

<style lang="scss" scoped>
.statistics {
  .header {
    margin-bottom: 20px;
    
    .page-title {
      font-size: 22px;
      font-weight: 600;
      color: $text-primary;
    }
    
    .month-picker {
      width: 160px;
    }
  }
  
  .overview-row {
    margin-bottom: 20px;
  }
  
  .overview-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    
    .overview-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      
      &.income-icon {
        background: #f0f9eb;
      }
      
      &.expense-icon {
        background: #fef0f0;
      }
      
      &.balance-icon {
        background: #ecf5ff;
      }
      
      &.count-icon {
        background: #fdf6ec;
      }
    }
    
    .overview-label {
      font-size: 13px;
      color: $text-secondary;
      margin-bottom: 4px;
    }
    
    .overview-value {
      font-size: 20px;
      font-weight: 600;
    }
  }
  
  .chart-card {
    margin-bottom: 20px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f0f2f5;
      
      .card-title {
        font-size: 15px;
        font-weight: 500;
        color: $text-primary;
      }
    }
    
    .chart {
      width: 100%;
      height: 260px;
    }
    
    .trend-chart {
      height: 300px;
    }
    
    .chart-legend {
      padding: 0 20px 10px;
      max-height: 180px;
      overflow-y: auto;
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 0;
        font-size: 13px;
        
        .legend-color {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .legend-name {
          flex: 1;
          color: $text-regular;
        }
        
        .legend-value {
          color: $text-primary;
          font-weight: 500;
        }
        
        .legend-percent {
          color: $text-secondary;
          width: 50px;
          text-align: right;
        }
      }
    }
  }
}
</style>
