<template>
  <div class="report-ranking" @click="handleClick">
    <div class="chart-header">
      <div class="chart-title">{{ component.title }}</div>
    </div>
    <div class="ranking-list">
      <div
        v-for="(item, index) in rankingData"
        :key="item.key"
        class="ranking-item"
        @click.stop="handleItemClick(item)"
      >
        <div class="rank-number" :class="getRankClass(index)">
          {{ index + 1 }}
        </div>
        <div class="rank-info">
          <div class="rank-name">{{ item.name }}</div>
          <div class="rank-bar-wrapper">
            <div
              class="rank-bar"
              :style="{
                width: (item.percent || 0) + '%',
                backgroundColor: item.color
              }"
            ></div>
          </div>
        </div>
        <div class="rank-amount">
          <span class="amount-value">¥{{ formatMoney(item.value) }}</span>
          <span class="amount-percent">{{ item.percent?.toFixed(1) }}%</span>
        </div>
      </div>
      <div v-if="rankingData.length === 0" class="empty-state">
        <i class="el-icon-trophy"></i>
        <span>暂无数据</span>
      </div>
    </div>
  </div>
</template>

<script>
import { groupRecords, filterRecords, formatMoney } from '@/utils/reportUtils'

export default {
  name: 'RankingList',
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
    dataType() {
      return this.config.dataType || 'expense'
    },
    groupBy() {
      return this.config.groupBy || 'category'
    },
    limit() {
      return this.config.limit || 10
    },
    order() {
      return this.config.order || 'desc'
    },
    rankingData() {
      const groups = groupRecords(this.records, this.groupBy, this.config)
      const data = []

      groups.forEach(group => {
        let value = 0
        if (this.dataType === 'income') {
          value = group.income
        } else if (this.dataType === 'expense') {
          value = group.expense
        } else {
          value = Math.abs(group.income - group.expense)
        }

        if (value > 0) {
          let name = group.key
          let color = undefined

          if (this.groupBy === 'category') {
            const cat = this.categories.find(c => c.id === group.key)
            name = cat ? cat.name : group.key
            color = cat?.color
          } else if (this.groupBy === 'account') {
            const acc = this.accounts.find(a => a.id === group.key)
            name = acc ? acc.name : group.key
            color = acc?.color
          }

          data.push({
            key: group.key,
            name,
            value,
            color,
            records: group.records
          })
        }
      })

      const sorted = data.sort((a, b) =>
        this.order === 'desc' ? b.value - a.value : a.value - b.value
      ).slice(0, this.limit)

      const maxValue = Math.max(...sorted.map(d => d.value), 1)
      const totalValue = sorted.reduce((sum, d) => sum + d.value, 0)

      return sorted.map(d => ({
        ...d,
        percent: totalValue > 0 ? (d.value / totalValue * 100) : 0,
        barWidth: (d.value / maxValue * 100)
      }))
    }
  },
  methods: {
    formatMoney,
    getRankClass(index) {
      if (index === 0) return 'rank-first'
      if (index === 1) return 'rank-second'
      if (index === 2) return 'rank-third'
      return ''
    },
    handleItemClick(item) {
      if (this.interactive) {
        this.$emit('drill-down', {
          type: 'ranking',
          groupBy: this.groupBy,
          groupKey: item.key,
          groupName: item.name,
          dataType: this.dataType,
          records: item.records
        })
      }
    },
    handleClick() {
      if (this.interactive && this.rankingData.length > 0) {
        this.$emit('drill-down', {
          type: 'ranking-overview',
          config: this.config,
          records: filterRecords(this.records, this.config)
        })
      }
    }
  }
}
</script>

<style scoped lang="scss">
.report-ranking {
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

  .ranking-list {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .ranking-item {
    display: flex;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
    transition: background 0.2s ease;

    &:hover {
      background: #f5f7fa;
      border-radius: 4px;
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .rank-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #e4e7ed;
    color: #909399;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    flex-shrink: 0;

    &.rank-first {
      background: linear-gradient(135deg, #ffd700 0%, #ffb800 100%);
      color: #fff;
    }

    &.rank-second {
      background: linear-gradient(135deg, #c0c0c0 0%, #a8a8a8 100%);
      color: #fff;
    }

    &.rank-third {
      background: linear-gradient(135deg, #cd7f32 0%, #b87333 100%);
      color: #fff;
    }
  }

  .rank-info {
    flex: 1;
    min-width: 0;
    margin-right: 12px;
  }

  .rank-name {
    font-size: 13px;
    color: #303133;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rank-bar-wrapper {
    height: 6px;
    background: #f0f2f5;
    border-radius: 3px;
    overflow: hidden;
  }

  .rank-bar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.5s ease;
    min-width: 4px;
  }

  .rank-amount {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
  }

  .amount-value {
    font-size: 13px;
    font-weight: 600;
    color: #303133;
  }

  .amount-percent {
    font-size: 11px;
    color: #909399;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #c0c4cc;
    font-size: 13px;

    i {
      font-size: 32px;
      margin-bottom: 8px;
    }
  }
}
</style>
