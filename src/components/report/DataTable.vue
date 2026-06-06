<template>
  <div class="report-table" @click="handleClick">
    <div class="chart-header">
      <div class="chart-title">{{ component.title }}</div>
    </div>
    <div class="table-content">
      <el-table
        :data="tableData"
        size="mini"
        height="100%"
        @row-click="handleRowClick"
        stripe
      >
        <el-table-column
          v-if="config.showDate"
          prop="date"
          label="日期"
          width="100"
          show-overflow-tooltip
        />
        <el-table-column
          v-if="config.showType"
          label="类型"
          width="60"
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
          v-if="config.showCategory"
          prop="categoryName"
          label="分类"
          width="100"
          show-overflow-tooltip
        />
        <el-table-column
          v-if="config.showAccount"
          prop="accountName"
          label="账户"
          width="100"
          show-overflow-tooltip
        />
        <el-table-column
          v-if="config.showAmount"
          label="金额"
          width="100"
        >
          <template slot-scope="scope">
            <span :class="scope.row.type === 'income' ? 'text-income' : 'text-expense'">
              {{ scope.row.type === 'income' ? '+' : '-' }}¥{{ formatMoney(scope.row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          v-if="config.showRemark"
          prop="remark"
          label="备注"
          show-overflow-tooltip
        />
      </el-table>
      <div v-if="tableData.length === 0" class="empty-state">
        <i class="el-icon-document"></i>
        <span>暂无数据</span>
      </div>
    </div>
  </div>
</template>

<script>
import { filterRecords, formatMoney } from '@/utils/reportUtils'

export default {
  name: 'DataTable',
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
    limit() {
      return this.config.limit || 20
    },
    tableData() {
      const filtered = filterRecords(this.records, this.config)
      return filtered.slice(0, this.limit).map(r => ({
        ...r,
        amount: Number(r.amount)
      }))
    }
  },
  methods: {
    formatMoney,
    handleRowClick(row) {
      if (this.interactive) {
        this.$emit('drill-down', {
          type: 'table-row',
          record: row,
          records: [row]
        })
      }
    },
    handleClick() {
      if (this.interactive && this.tableData.length > 0) {
        this.$emit('drill-down', {
          type: 'table-overview',
          config: this.config,
          records: filterRecords(this.records, this.config)
        })
      }
    }
  }
}
</script>

<style scoped lang="scss">
.report-table {
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
    margin-bottom: 12px;
  }

  .chart-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  .table-content {
    flex: 1;
    min-height: 0;
    position: relative;
  }

  .text-income {
    color: #67c23a;
    font-weight: 600;
  }

  .text-expense {
    color: #f56c6c;
    font-weight: 600;
  }

  .empty-state {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #c0c4cc;
    font-size: 13px;

    i {
      font-size: 32px;
      margin-bottom: 8px;
    }
  }
}
</style>
