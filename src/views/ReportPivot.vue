<template>
  <div class="report-pivot">
    <div class="page-header">
      <h2 class="page-title">数据透视表</h2>
      <div class="header-actions">
        <el-button icon="el-icon-refresh" @click="loadPivotData">
          刷新
        </el-button>
        <el-button icon="el-icon-download" @click="handleExport">
          导出
        </el-button>
      </div>
    </div>

    <div class="pivot-config">
      <el-card>
        <div slot="header">
          <span>配置维度</span>
        </div>
        <el-form :inline="true" label-width="80px" size="small">
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="yyyy-MM-dd"
              @change="loadPivotData"
            />
          </el-form-item>
          <el-form-item label="行维度">
            <el-select v-model="rowDimension" @change="loadPivotData">
              <el-option
                v-for="opt in ROW_DIMENSIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="日期粒度">
            <el-select v-model="dateGranularity" @change="loadPivotData" :disabled="rowDimension !== 'date'">
              <el-option
                v-for="opt in DATE_GRANULARITY"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="列维度">
            <el-select v-model="columnDimension" @change="loadPivotData">
              <el-option
                v-for="opt in COLUMN_DIMENSIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="值维度">
            <el-select v-model="valueDimension" @change="loadPivotData">
              <el-option
                v-for="opt in VALUE_DIMENSIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <div class="pivot-result">
      <el-card>
        <div slot="header">
          <span>透视结果</span>
          <span class="result-info">
            共 {{ pivotData.rows?.length || 0 }} 行，{{ pivotData.columns?.length || 0 }} 列
          </span>
        </div>

        <div class="pivot-table-container" v-if="pivotData.rows && pivotData.rows.length > 0">
          <el-table
            :data="pivotData.rows"
            border
            size="small"
            height="500"
          >
            <el-table-column
              :label="getRowHeaderLabel()"
              fixed="left"
              width="150"
            >
              <template slot-scope="scope">
                <span class="row-label">{{ scope.row._label }}</span>
              </template>
            </el-table-column>

            <el-table-column
              v-for="col in pivotData.columns"
              :key="col.key"
              :label="col.label"
              align="right"
              width="120"
            >
              <template slot-scope="scope">
                <span :class="getValueClass(scope.row[col.key])">
                  {{ formatValue(scope.row[col.key]) }}
                </span>
              </template>
            </el-table-column>

            <el-table-column
              label="合计"
              fixed="right"
              width="120"
              align="right"
            >
              <template slot-scope="scope">
                <span class="total-value" :class="getValueClass(scope.row._total)">
                  {{ formatValue(scope.row._total) }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div v-else class="empty-state">
          <i class="el-icon-data-analysis"></i>
          <p>暂无数据，请调整筛选条件</p>
        </div>
      </el-card>
    </div>

    <div class="pivot-chart" v-if="pivotData.rows && pivotData.rows.length > 0">
      <el-card>
        <div slot="header">
          <span>数据可视化</span>
          <el-radio-group v-model="chartType" size="small">
            <el-radio-button label="bar">柱状图</el-radio-button>
            <el-radio-button label="line">折线图</el-radio-button>
            <el-radio-button label="pie">饼图</el-radio-button>
          </el-radio-group>
        </div>
        <div class="chart-container" ref="chartContainer">
          <div ref="pivotChart" class="pivot-chart-el"></div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import {
  ROW_DIMENSIONS,
  COLUMN_DIMENSIONS,
  VALUE_DIMENSIONS,
  DATE_GRANULARITY,
  getPivotData,
  formatMoney
} from '@/utils/reportUtils'

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null }

export default {
  name: 'ReportPivot',
  data() {
    return {
      ROW_DIMENSIONS,
      COLUMN_DIMENSIONS,
      VALUE_DIMENSIONS,
      DATE_GRANULARITY,
      dateRange: [],
      rowDimension: 'date',
      dateGranularity: 'month',
      columnDimension: 'type',
      valueDimension: 'amount',
      chartType: 'bar',
      pivotData: {
        rows: [],
        columns: []
      },
      chart: null
    }
  },
  watch: {
    chartType() {
      this.renderChart()
    }
  },
  mounted() {
    this.initDateRange()
    this.loadPivotData()
    this.initChart()
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    if (this.chart) {
      this.chart.dispose()
    }
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    initDateRange() {
      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1)
      this.dateRange = [
        start.toISOString().split('T')[0],
        now.toISOString().split('T')[0]
      ]
    },
    async loadPivotData() {
      const config = {
        startDate: this.dateRange[0],
        endDate: this.dateRange[1],
        rowDimension: this.rowDimension,
        columnDimension: this.columnDimension,
        valueDimension: this.valueDimension,
        dateGranularity: this.dateGranularity
      }

      try {
        this.pivotData = await getPivotData(config) || { rows: [], columns: [] }
        this.$nextTick(() => {
          this.renderChart()
        })
      } catch (e) {
        this.$message.error('加载数据失败：' + e.message)
      }
    },
    getRowHeaderLabel() {
      const labels = {
        date: '日期',
        category: '分类',
        account: '账户'
      }
      return labels[this.rowDimension] || '行'
    },
    formatValue(value) {
      if (value === undefined || value === null || isNaN(value)) return '-'
      if (this.valueDimension === 'count') {
        return value + ' 笔'
      } else if (this.valueDimension === 'percent') {
        return value.toFixed(2) + '%'
      }
      return '¥' + formatMoney(value)
    },
    getValueClass(value) {
      if (this.valueDimension === 'amount' || this.valueDimension === 'percent') {
        if (value > 0) return 'text-income'
        if (value < 0) return 'text-expense'
      }
      return ''
    },
    initChart() {
      if (!this.$refs.pivotChart) return
      this.chart = echarts.init(this.$refs.pivotChart)
    },
    renderChart() {
      if (!this.chart || !this.pivotData.rows || this.pivotData.rows.length === 0) return

      const rows = this.pivotData.rows
      const columns = this.pivotData.columns

      const labels = rows.map(r => r._label)
      const series = columns.map(col => ({
        name: col.label,
        type: this.chartType === 'pie' ? undefined : this.chartType,
        data: rows.map(r => r[col.key] || 0)
      }))

      let option = {}

      if (this.chartType === 'pie') {
        const pieData = columns.map(col => ({
          name: col.label,
          value: rows.reduce((sum, r) => sum + (r[col.key] || 0), 0)
        }))

        option = {
          tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
          },
          legend: {
            orient: 'vertical',
            left: 'left'
          },
          series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            data: pieData,
            itemStyle: {
              borderRadius: 6,
              borderColor: '#fff',
              borderWidth: 2
            }
          }]
        }
      } else {
        option = {
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            }
          },
          legend: {
            data: columns.map(c => c.label)
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: labels,
            axisLabel: {
              rotate: 30
            }
          },
          yAxis: {
            type: 'value'
          },
          series: series
        }
      }

      this.chart.setOption(option, true)
    },
    handleResize() {
      if (this.chart) {
        this.chart.resize()
      }
    },
    async handleExport() {
      if (!this.pivotData.rows || this.pivotData.rows.length === 0) {
        this.$message.warning('暂无数据可导出')
        return
      }

      if (!ipcRenderer) return

      const result = await ipcRenderer.invoke('show-open-dialog', {
        properties: ['openDirectory']
      })

      if (result && !result.canceled && result.filePaths.length > 0) {
        const exportPath = result.filePaths[0] + '/pivot_data.csv'
        const csvContent = this.generateCsv()
        const fs = require('fs')
        fs.writeFileSync(exportPath, '\ufeff' + csvContent)
        this.$message.success(`导出成功：${exportPath}`)
      }
    },
    generateCsv() {
      const rows = this.pivotData.rows
      const columns = this.pivotData.columns

      let header = [this.getRowHeaderLabel()]
      columns.forEach(col => header.push(col.label))
      header.push('合计')

      const lines = [header.join(',')]

      rows.forEach(row => {
        const line = [row._label]
        columns.forEach(col => line.push(row[col.key] || 0))
        line.push(row._total)
        lines.push(line.join(','))
      })

      return lines.join('\n')
    }
  }
}
</script>

<style scoped lang="scss">
.report-pivot {
  padding: 24px;
  height: 100%;
  overflow: auto;
  background: $bg-color;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .page-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: $text-primary;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }
  }

  .pivot-config {
    margin-bottom: 20px;

    ::v-deep .el-card__header {
      padding: 12px 20px;
    }

    ::v-deep .el-card__body {
      padding: 16px 20px;
    }
  }

  .pivot-result {
    margin-bottom: 20px;

    .result-info {
      float: right;
      font-size: 12px;
      color: $text-secondary;
    }

    ::v-deep .el-card__header {
      padding: 12px 20px;
    }

    ::v-deep .el-card__body {
      padding: 16px 20px;
    }
  }

  .pivot-table-container {
    .row-label {
      font-weight: 500;
      color: $text-primary;
    }

    .total-value {
      font-weight: 600;
    }

    .text-income {
      color: $income-color;
    }

    .text-expense {
      color: $expense-color;
    }
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: $text-placeholder;

    i {
      font-size: 48px;
      margin-bottom: 12px;
      display: block;
    }

    p {
      margin: 0;
      font-size: 14px;
    }
  }

  .pivot-chart {
    .chart-container {
      height: 400px;

      .pivot-chart-el {
        width: 100%;
        height: 100%;
      }
    }

    ::v-deep .el-card__header {
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    ::v-deep .el-card__body {
      padding: 16px 20px;
    }
  }
}
</style>
