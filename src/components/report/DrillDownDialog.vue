<template>
  <el-dialog
    :visible.sync="visible"
    :title="title"
    width="80%"
    top="5vh"
    @close="handleClose"
  >
    <div class="drill-down-content">
      <div class="drill-down-info">
        <el-tag type="info" size="small">{{ drillTypeLabel }}</el-tag>
        <span v-if="drillData.groupName" class="group-name">
          {{ drillData.groupName }}
        </span>
        <span v-if="drillData.dataType" class="data-type">
          {{ dataTypeLabel }}
        </span>
      </div>

      <div class="drill-down-records" v-if="records && records.length > 0">
        <el-table
          :data="records"
          size="small"
          height="400"
          stripe
        >
          <el-table-column
            prop="date"
            label="日期"
            width="110"
            fixed="left"
          />
          <el-table-column
            label="类型"
            width="70"
          >
            <template slot-scope="scope">
              <el-tag
                :type="scope.row.type === 'income' ? 'success' : 'danger'"
                size="mini"
              >
                {{ scope.row.type === 'income' ? '收入' : '支出' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="categoryName"
            label="分类"
            width="100"
            show-overflow-tooltip
          />
          <el-table-column
            prop="accountName"
            label="账户"
            width="100"
            show-overflow-tooltip
          />
          <el-table-column
            label="金额"
            width="120"
            fixed="right"
          >
            <template slot-scope="scope">
              <span :class="scope.row.type === 'income' ? 'text-income' : 'text-expense'">
                {{ scope.row.type === 'income' ? '+' : '-' }}¥{{ formatMoney(scope.row.amount) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column
            prop="remark"
            label="备注"
            show-overflow-tooltip
          />
        </el-table>

        <div class="drill-down-summary">
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">记录笔数</div>
                <div class="summary-value">{{ records.length }} 笔</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">总收入</div>
                <div class="summary-value income">¥{{ formatMoney(totalIncome) }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">总支出</div>
                <div class="summary-value expense">¥{{ formatMoney(totalExpense) }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">净结余</div>
                <div class="summary-value" :class="totalBalance >= 0 ? 'income' : 'expense'">
                  {{ totalBalance >= 0 ? '+' : '' }}¥{{ formatMoney(totalBalance) }}
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>

      <div v-else class="empty-state">
        <i class="el-icon-document"></i>
        <span>暂无明细数据</span>
      </div>
    </div>

    <div slot="footer">
      <el-button @click="handleClose">关闭</el-button>
      <el-button type="primary" @click="handleExport" v-if="records && records.length > 0">
        导出明细
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
import { ipcRenderer } from 'electron'
import { formatMoney } from '@/utils/reportUtils'

export default {
  name: 'DrillDownDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    drillData: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    records() {
      return this.drillData.records || []
    },
    title() {
      const typeLabels = {
        overview: '总览卡片明细',
        pie: '饼图数据明细',
        bar: '柱状图数据明细',
        line: '折线图数据明细',
        ranking: '排行榜数据明细',
        'table-row': '记录明细',
        'table-overview': '表格数据明细',
        'trend-compare': '趋势对比明细',
        'pie-overview': '饼图数据明细',
        'bar-overview': '柱状图数据明细',
        'line-overview': '折线图数据明细',
        'ranking-overview': '排行榜数据明细'
      }
      return typeLabels[this.drillData.type] || '数据明细'
    },
    drillTypeLabel() {
      const typeLabels = {
        category: '分类',
        account: '账户',
        month: '月份',
        quarter: '季度',
        year: '年份',
        day: '日期',
        week: '周'
      }
      return typeLabels[this.drillData.groupBy] || '明细'
    },
    dataTypeLabel() {
      if (!this.drillData.dataType) return ''
      const labels = {
        income: '收入',
        expense: '支出',
        both: '收支'
      }
      return ` - ${labels[this.drillData.dataType] || this.drillData.dataType}`
    },
    totalIncome() {
      return this.records
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + Number(r.amount), 0)
    },
    totalExpense() {
      return this.records
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + Number(r.amount), 0)
    },
    totalBalance() {
      return this.totalIncome - this.totalExpense
    }
  },
  methods: {
    formatMoney,
    handleClose() {
      this.$emit('update:visible', false)
    },
    async handleExport() {
      const result = await ipcRenderer.invoke('export-csv', this.records)
      if (result) {
        this.$message.success('导出成功')
      }
    }
  }
}
</script>

<style scoped lang="scss">
.drill-down-content {
  .drill-down-info {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #ebeef5;

    .group-name {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }

    .data-type {
      font-size: 14px;
      color: #909399;
    }
  }

  .text-income {
    color: #67c23a;
    font-weight: 600;
  }

  .text-expense {
    color: #f56c6c;
    font-weight: 600;
  }

  .drill-down-summary {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #ebeef5;

    .summary-item {
      text-align: center;
      padding: 16px;
      background: #f5f7fa;
      border-radius: 8px;
    }

    .summary-label {
      font-size: 13px;
      color: #909399;
      margin-bottom: 8px;
    }

    .summary-value {
      font-size: 20px;
      font-weight: 600;

      &.income {
        color: #67c23a;
      }

      &.expense {
        color: #f56c6c;
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    color: #c0c4cc;

    i {
      font-size: 48px;
      margin-bottom: 16px;
    }
  }
}
</style>
