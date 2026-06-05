<template>
  <div class="page-container statistics">
    <div class="header flex-between">
      <div class="header-left">
        <h2 class="page-title">统计图表</h2>
      </div>
      <div class="header-right">
        <el-radio-group v-model="activeTab" size="mini" class="tab-switcher">
          <el-radio-button label="overview">概览</el-radio-button>
          <el-radio-button label="ranking">排行榜</el-radio-button>
          <el-radio-button label="prediction">趋势预测</el-radio-button>
          <el-radio-button label="compare">自定义对比</el-radio-button>
        </el-radio-group>
        <el-dropdown @command="handleExport" class="export-dropdown">
          <el-button type="primary" icon="el-icon-download" size="small">
            导出报告 <i class="el-icon-arrow-down el-icon--right"></i>
          </el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="monthly">月度报告 (PDF)</el-dropdown-item>
            <el-dropdown-item command="yearly">年度报告 (PDF)</el-dropdown-item>
            <el-dropdown-item command="current">当前视图 (PDF)</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </div>

    <div v-if="activeTab === 'overview'" class="time-dimension-section">
      <el-radio-group v-model="timeDimension" class="time-dimension-tabs" size="mini" @change="handleTimeDimensionChange">
        <el-radio-button label="day">按日</el-radio-button>
        <el-radio-button label="week">按周</el-radio-button>
        <el-radio-button label="month">按月</el-radio-button>
        <el-radio-button label="quarter">按季</el-radio-button>
        <el-radio-button label="year">按年</el-radio-button>
      </el-radio-group>
      
      <div class="date-picker-wrapper">
        <el-date-picker
          v-if="timeDimension === 'day'"
          v-model="currentDate"
          type="date"
          format="yyyy-MM-dd"
          placeholder="选择日期"
          size="small"
          @change="loadData"
        />
        <el-date-picker
          v-if="timeDimension === 'week'"
          v-model="currentDate"
          type="week"
          format="yyyy 第 WW 周"
          placeholder="选择周"
          size="small"
          @change="loadData"
        />
        <el-date-picker
          v-if="timeDimension === 'month'"
          v-model="currentDate"
          type="month"
          format="yyyy-MM"
          placeholder="选择月份"
          size="small"
          @change="loadData"
        />
        <el-date-picker
          v-if="timeDimension === 'quarter'"
          v-model="currentDate"
          type="month"
          format="yyyy 第 Q季度"
          placeholder="选择季度"
          size="small"
          @change="loadData"
        />
        <el-date-picker
          v-if="timeDimension === 'year'"
          v-model="currentDate"
          type="year"
          format="yyyy"
          placeholder="选择年份"
          size="small"
          @change="loadData"
        />
      </div>
    </div>

    <div v-show="activeTab === 'overview'">
      <el-row :gutter="16" class="overview-row">
        <el-col :span="6">
          <div class="overview-card">
            <div class="overview-icon income-icon">📈</div>
            <div class="overview-info">
              <div class="overview-label">{{ periodLabel }}收入</div>
              <div class="overview-value text-income">+{{ formatMoney(overview.income) }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-card">
            <div class="overview-icon expense-icon">📉</div>
            <div class="overview-info">
              <div class="overview-label">{{ periodLabel }}支出</div>
              <div class="overview-value text-expense">-{{ formatMoney(overview.expense) }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-card">
            <div class="overview-icon balance-icon">💵</div>
            <div class="overview-info">
              <div class="overview-label">{{ periodLabel }}结余</div>
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
              <div class="overview-value">{{ periodRecords.length }}</div>
            </div>
          </div>
        </el-col>
      </el-row>

      <el-card class="card comparison-card" shadow="never">
        <div class="card-header">
          <span class="card-title">同比环比分析</span>
          <span class="card-subtitle">本期 vs 上期 vs 去年同期</span>
        </div>
        <el-row :gutter="16">
          <el-col :span="12">
            <div class="comparison-item income-comparison">
              <div class="comparison-header">
                <span class="comparison-label">收入</span>
              </div>
              <div class="comparison-body">
                <div class="comparison-value">
                  <span class="current-value text-income">¥{{ formatMoney(comparison.income.current) }}</span>
                  <span class="period-label">本期</span>
                </div>
                <div class="comparison-diff">
                  <div class="diff-item">
                    <span class="diff-label">环比</span>
                    <span class="diff-value" :class="comparison.income.mom >= 0 ? 'text-income' : 'text-expense'">
                      {{ formatGrowthRate(comparison.income.mom) }}
                    </span>
                    <span class="diff-amount">
                      {{ comparison.income.mom >= 0 ? '+' : '' }}¥{{ formatMoney(comparison.income.current - comparison.income.prev) }}
                    </span>
                  </div>
                  <div class="diff-item">
                    <span class="diff-label">同比</span>
                    <span class="diff-value" :class="comparison.income.yoy >= 0 ? 'text-income' : 'text-expense'">
                      {{ formatGrowthRate(comparison.income.yoy) }}
                    </span>
                    <span class="diff-amount">
                      {{ comparison.income.yoy >= 0 ? '+' : '' }}¥{{ formatMoney(comparison.income.current - comparison.income.lastYear) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="comparison-item expense-comparison">
              <div class="comparison-header">
                <span class="comparison-label">支出</span>
              </div>
              <div class="comparison-body">
                <div class="comparison-value">
                  <span class="current-value text-expense">¥{{ formatMoney(comparison.expense.current) }}</span>
                  <span class="period-label">本期</span>
                </div>
                <div class="comparison-diff">
                  <div class="diff-item">
                    <span class="diff-label">环比</span>
                    <span class="diff-value" :class="comparison.expense.mom <= 0 ? 'text-income' : 'text-expense'">
                      {{ formatGrowthRate(comparison.expense.mom) }}
                    </span>
                    <span class="diff-amount">
                      {{ comparison.expense.mom >= 0 ? '+' : '' }}¥{{ formatMoney(comparison.expense.current - comparison.expense.prev) }}
                    </span>
                  </div>
                  <div class="diff-item">
                    <span class="diff-label">同比</span>
                    <span class="diff-value" :class="comparison.expense.yoy <= 0 ? 'text-income' : 'text-expense'">
                      {{ formatGrowthRate(comparison.expense.yoy) }}
                    </span>
                    <span class="diff-amount">
                      {{ comparison.expense.yoy >= 0 ? '+' : '' }}¥{{ formatMoney(comparison.expense.current - comparison.expense.lastYear) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-card>

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
          <span class="card-title">收支趋势</span>
          <el-radio-group v-model="trendType" size="mini">
            <el-radio-button label="expense">支出</el-radio-button>
            <el-radio-button label="income">收入</el-radio-button>
            <el-radio-button label="all">全部</el-radio-button>
          </el-radio-group>
        </div>
        <div ref="trendChart" class="chart trend-chart"></div>
      </el-card>
    </div>

    <div v-show="activeTab === 'ranking'">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-card class="card ranking-card" shadow="never">
            <div class="card-header">
              <span class="card-title">🏆 支出分类排行榜</span>
              <el-select v-model="rankingPeriod" size="mini" @change="loadData" style="width: 120px;">
                <el-option label="本月" value="month"></el-option>
                <el-option label="本季度" value="quarter"></el-option>
                <el-option label="本年" value="year"></el-option>
              </el-select>
            </div>
            <div class="ranking-list">
              <div
                v-for="(item, index) in expenseRanking"
                :key="item.categoryId"
                class="ranking-item"
              >
                <div class="ranking-rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</div>
                <div class="ranking-icon" :style="{ backgroundColor: item.color + '20', color: item.color }">
                  {{ item.icon }}
                </div>
                <div class="ranking-info">
                  <div class="ranking-name">{{ item.name }}</div>
                  <div class="ranking-bar">
                    <div
                      class="ranking-bar-inner"
                      :style="{ width: (item.amount / maxExpenseAmount * 100) + '%', backgroundColor: item.color }"
                    ></div>
                  </div>
                </div>
                <div class="ranking-amount">
                  <span class="amount-value">¥{{ formatMoney(item.amount) }}</span>
                  <span class="amount-percent">{{ item.percent }}%</span>
                </div>
              </div>
              <el-empty v-if="expenseRanking.length === 0" description="暂无支出数据" :image-size="80" />
            </div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="card ranking-card" shadow="never">
            <div class="card-header">
              <span class="card-title">🏆 收入分类排行榜</span>
              <el-select v-model="rankingPeriod" size="mini" @change="loadData" style="width: 120px;">
                <el-option label="本月" value="month"></el-option>
                <el-option label="本季度" value="quarter"></el-option>
                <el-option label="本年" value="year"></el-option>
              </el-select>
            </div>
            <div class="ranking-list">
              <div
                v-for="(item, index) in incomeRanking"
                :key="item.categoryId"
                class="ranking-item"
              >
                <div class="ranking-rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</div>
                <div class="ranking-icon" :style="{ backgroundColor: item.color + '20', color: item.color }">
                  {{ item.icon }}
                </div>
                <div class="ranking-info">
                  <div class="ranking-name">{{ item.name }}</div>
                  <div class="ranking-bar">
                    <div
                      class="ranking-bar-inner"
                      :style="{ width: (item.amount / maxIncomeAmount * 100) + '%', backgroundColor: item.color }"
                    ></div>
                  </div>
                </div>
                <div class="ranking-amount">
                  <span class="amount-value">¥{{ formatMoney(item.amount) }}</span>
                  <span class="amount-percent">{{ item.percent }}%</span>
                </div>
              </div>
              <el-empty v-if="incomeRanking.length === 0" description="暂无收入数据" :image-size="80" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div v-show="activeTab === 'prediction'">
      <el-card class="card prediction-card" shadow="never">
        <div class="card-header">
          <span class="card-title">📊 趋势预测</span>
          <span class="card-subtitle">基于近6个月历史数据，使用简单线性回归预测</span>
        </div>
        <div class="prediction-overview">
          <div class="prediction-item">
            <div class="prediction-icon income-icon">📈</div>
            <div class="prediction-info">
              <div class="prediction-label">下月预测收入</div>
              <div class="prediction-value text-income">+¥{{ formatMoney(prediction.income) }}</div>
            </div>
          </div>
          <div class="prediction-item">
            <div class="prediction-icon expense-icon">📉</div>
            <div class="prediction-info">
              <div class="prediction-label">下月预测支出</div>
              <div class="prediction-value text-expense">-¥{{ formatMoney(prediction.expense) }}</div>
            </div>
          </div>
          <div class="prediction-item">
            <div class="prediction-icon balance-icon">💵</div>
            <div class="prediction-info">
              <div class="prediction-label">预测结余</div>
              <div class="prediction-value" :class="prediction.balance >= 0 ? 'text-income' : 'text-expense'">
                {{ prediction.balance >= 0 ? '+' : '' }}¥{{ formatMoney(prediction.balance) }}
              </div>
            </div>
          </div>
        </div>
        <div class="card-header" style="margin-top: 20px;">
          <span class="card-title">历史趋势与预测</span>
          <el-radio-group v-model="predictionTrendType" size="mini">
            <el-radio-button label="expense">支出</el-radio-button>
            <el-radio-button label="income">收入</el-radio-button>
          </el-radio-group>
        </div>
        <div ref="predictionChart" class="chart prediction-chart"></div>
        <div class="prediction-tips">
          <el-alert
            title="预测说明"
            type="info"
            :closable="false"
            show-icon
          >
            <div slot="title">
              <p>本预测基于简单线性回归算法，仅供参考。实际收支可能受多种因素影响。</p>
              <p>• 预测周期：未来一个月</p>
              <p>• 数据基础：最近6个月的历史数据</p>
              <p>• 算法：最小二乘法线性回归</p>
            </div>
          </el-alert>
        </div>
      </el-card>
    </div>

    <div v-show="activeTab === 'compare'">
      <el-card class="card compare-card" shadow="never">
        <div class="card-header">
          <span class="card-title">⚖️ 自定义时间段对比</span>
        </div>
        <div class="compare-selectors">
          <div class="selector-group">
            <label>时间段1</label>
            <el-date-picker
              v-model="compareRange1"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="yyyy-MM-dd"
              value-format="yyyy-MM-dd"
              size="small"
              @change="loadData"
            />
          </div>
          <div class="selector-group">
            <label>时间段2</label>
            <el-date-picker
              v-model="compareRange2"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="yyyy-MM-dd"
              value-format="yyyy-MM-dd"
              size="small"
              @change="loadData"
            />
          </div>
        </div>

        <div class="compare-results" v-if="compareData.period1.records.length > 0 || compareData.period2.records.length > 0">
          <el-row :gutter="16">
            <el-col :span="12">
              <div class="compare-period-card period1">
                <div class="period-header">
                  <span class="period-title">时间段1</span>
                  <span class="period-date">{{ compareRange1 ? compareRange1[0] + ' 至 ' + compareRange1[1] : '未选择' }}</span>
                </div>
                <div class="period-stats">
                  <div class="stat-item">
                    <span class="stat-label">收入</span>
                    <span class="stat-value text-income">+¥{{ formatMoney(compareData.period1.income) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">支出</span>
                    <span class="stat-value text-expense">-¥{{ formatMoney(compareData.period1.expense) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">结余</span>
                    <span class="stat-value" :class="compareData.period1.balance >= 0 ? 'text-income' : 'text-expense'">
                      {{ compareData.period1.balance >= 0 ? '+' : '' }}¥{{ formatMoney(compareData.period1.balance) }}
                    </span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">记录</span>
                    <span class="stat-value">{{ compareData.period1.records.length }} 笔</span>
                  </div>
                </div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="compare-period-card period2">
                <div class="period-header">
                  <span class="period-title">时间段2</span>
                  <span class="period-date">{{ compareRange2 ? compareRange2[0] + ' 至 ' + compareRange2[1] : '未选择' }}</span>
                </div>
                <div class="period-stats">
                  <div class="stat-item">
                    <span class="stat-label">收入</span>
                    <span class="stat-value text-income">+¥{{ formatMoney(compareData.period2.income) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">支出</span>
                    <span class="stat-value text-expense">-¥{{ formatMoney(compareData.period2.expense) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">结余</span>
                    <span class="stat-value" :class="compareData.period2.balance >= 0 ? 'text-income' : 'text-expense'">
                      {{ compareData.period2.balance >= 0 ? '+' : '' }}¥{{ formatMoney(compareData.period2.balance) }}
                    </span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">记录</span>
                    <span class="stat-value">{{ compareData.period2.records.length }} 笔</span>
                  </div>
                </div>
              </div>
            </el-col>
          </el-row>

          <el-card class="card compare-diff-card" shadow="never">
            <div class="card-header">
              <span class="card-title">差异对比 (时间段2 - 时间段1)</span>
            </div>
            <el-row :gutter="16">
              <el-col :span="8">
                <div class="diff-card">
                  <div class="diff-label">收入差异</div>
                  <div class="diff-value" :class="compareData.diff.income >= 0 ? 'text-income' : 'text-expense'">
                    {{ compareData.diff.income >= 0 ? '+' : '' }}¥{{ formatMoney(compareData.diff.income) }}
                  </div>
                  <div class="diff-rate" :class="compareData.diff.incomeRate >= 0 ? 'text-income' : 'text-expense'">
                    {{ formatGrowthRate(compareData.diff.incomeRate) }}
                  </div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="diff-card">
                  <div class="diff-label">支出差异</div>
                  <div class="diff-value" :class="compareData.diff.expense <= 0 ? 'text-income' : 'text-expense'">
                    {{ compareData.diff.expense >= 0 ? '+' : '' }}¥{{ formatMoney(compareData.diff.expense) }}
                  </div>
                  <div class="diff-rate" :class="compareData.diff.expenseRate <= 0 ? 'text-income' : 'text-expense'">
                    {{ formatGrowthRate(compareData.diff.expenseRate) }}
                  </div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="diff-card">
                  <div class="diff-label">结余差异</div>
                  <div class="diff-value" :class="compareData.diff.balance >= 0 ? 'text-income' : 'text-expense'">
                    {{ compareData.diff.balance >= 0 ? '+' : '' }}¥{{ formatMoney(compareData.diff.balance) }}
                  </div>
                  <div class="diff-rate" :class="compareData.diff.balanceRate >= 0 ? 'text-income' : 'text-expense'">
                    {{ formatGrowthRate(compareData.diff.balanceRate) }}
                  </div>
                </div>
              </el-col>
            </el-row>
          </el-card>

          <div ref="compareChart" class="chart compare-chart"></div>
        </div>
        <el-empty v-else description="请选择两个时间段进行对比" :image-size="120" />
      </el-card>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { recordApi, categoryApi } from '@/api'
import {
  formatMoney,
  formatDate,
  formatGrowthRate,
  calcGrowthRate,
  getTimeRange,
  getPrevPeriodDate,
  getSamePeriodLastYear,
  linearRegression,
  getMonthLabels,
  getRecordsInRange,
  sumAmountByType,
  groupByCategory
} from '@/utils'

export default {
  name: 'Statistics',
  data() {
    return {
      activeTab: 'overview',
      timeDimension: 'month',
      currentDate: new Date(),
      rankingPeriod: 'month',
      trendType: 'expense',
      predictionTrendType: 'income',
      compareRange1: null,
      compareRange2: null,
      records: [],
      categories: [],
      expensePieChart: null,
      incomePieChart: null,
      trendChart: null,
      predictionChart: null,
      compareChart: null
    }
  },
  computed: {
    periodLabel() {
      const labels = { day: '本日', week: '本周', month: '本月', quarter: '本季', year: '本年' }
      return labels[this.timeDimension] || '本期'
    },
    baseDate() {
      return this.currentDate instanceof Date && !isNaN(this.currentDate.getTime())
        ? this.currentDate
        : new Date()
    },
    periodRange() {
      return getTimeRange(this.baseDate, this.timeDimension)
    },
    periodRecords() {
      const { start, end } = this.periodRange
      return getRecordsInRange(this.records, start, end)
    },
    overview() {
      const income = sumAmountByType(this.periodRecords, 'income')
      const expense = sumAmountByType(this.periodRecords, 'expense')
      return {
        income,
        expense,
        balance: income - expense
      }
    },
    prevPeriodRange() {
      const prevDate = getPrevPeriodDate(this.baseDate, this.timeDimension)
      return getTimeRange(prevDate, this.timeDimension)
    },
    prevPeriodRecords() {
      const { start, end } = this.prevPeriodRange
      return getRecordsInRange(this.records, start, end)
    },
    lastYearPeriodRange() {
      const lastYearDate = getSamePeriodLastYear(this.baseDate)
      return getTimeRange(lastYearDate, this.timeDimension)
    },
    lastYearPeriodRecords() {
      const { start, end } = this.lastYearPeriodRange
      return getRecordsInRange(this.records, start, end)
    },
    comparison() {
      const currentIncome = sumAmountByType(this.periodRecords, 'income')
      const currentExpense = sumAmountByType(this.periodRecords, 'expense')
      const prevIncome = sumAmountByType(this.prevPeriodRecords, 'income')
      const prevExpense = sumAmountByType(this.prevPeriodRecords, 'expense')
      const lastYearIncome = sumAmountByType(this.lastYearPeriodRecords, 'income')
      const lastYearExpense = sumAmountByType(this.lastYearPeriodRecords, 'expense')

      return {
        income: {
          current: currentIncome,
          prev: prevIncome,
          lastYear: lastYearIncome,
          mom: calcGrowthRate(currentIncome, prevIncome),
          yoy: calcGrowthRate(currentIncome, lastYearIncome)
        },
        expense: {
          current: currentExpense,
          prev: prevExpense,
          lastYear: lastYearExpense,
          mom: calcGrowthRate(currentExpense, prevExpense),
          yoy: calcGrowthRate(currentExpense, lastYearExpense)
        }
      }
    },
    expenseByCategory() {
      return groupByCategory(this.periodRecords, this.categories, 'expense')
    },
    incomeByCategory() {
      return groupByCategory(this.periodRecords, this.categories, 'income')
    },
    rankingRange() {
      return getTimeRange(this.baseDate, this.rankingPeriod)
    },
    rankingRecords() {
      const { start, end } = this.rankingRange
      return getRecordsInRange(this.records, start, end)
    },
    expenseRanking() {
      return groupByCategory(this.rankingRecords, this.categories, 'expense').slice(0, 10)
    },
    incomeRanking() {
      return groupByCategory(this.rankingRecords, this.categories, 'income').slice(0, 10)
    },
    maxExpenseAmount() {
      return this.expenseRanking.length > 0 ? Math.max(...this.expenseRanking.map(i => i.amount)) : 1
    },
    maxIncomeAmount() {
      return this.incomeRanking.length > 0 ? Math.max(...this.incomeRanking.map(i => i.amount)) : 1
    },
    monthlyData() {
      const labels = getMonthLabels(this.baseDate, 6)
      const result = labels.map(label => {
        const [year, month] = label.split('-').map(Number)
        const date = new Date(year, month - 1, 1)
        const { start, end } = getTimeRange(date, 'month')
        const records = getRecordsInRange(this.records, start, end)
        return {
          label,
          income: sumAmountByType(records, 'income'),
          expense: sumAmountByType(records, 'expense')
        }
      })
      return result
    },
    prediction() {
      const incomeData = this.monthlyData.map((item, index) => ({ x: index + 1, y: item.income }))
      const expenseData = this.monthlyData.map((item, index) => ({ x: index + 1, y: item.expense }))
      
      const incomeModel = linearRegression(incomeData)
      const expenseModel = linearRegression(expenseData)
      
      const nextX = this.monthlyData.length + 1
      const predictedIncome = Math.max(0, incomeModel.predict(nextX))
      const predictedExpense = Math.max(0, expenseModel.predict(nextX))
      
      return {
        income: predictedIncome,
        expense: predictedExpense,
        balance: predictedIncome - predictedExpense
      }
    },
    compareData() {
      const emptyResult = {
        period1: { records: [], income: 0, expense: 0, balance: 0 },
        period2: { records: [], income: 0, expense: 0, balance: 0 },
        diff: { income: 0, expense: 0, balance: 0, incomeRate: 0, expenseRate: 0, balanceRate: 0 }
      }

      if (!this.compareRange1 || !this.compareRange2) {
        return emptyResult
      }

      const start1 = new Date(this.compareRange1[0])
      const end1 = new Date(this.compareRange1[1])
      end1.setHours(23, 59, 59, 999)
      
      const start2 = new Date(this.compareRange2[0])
      const end2 = new Date(this.compareRange2[1])
      end2.setHours(23, 59, 59, 999)

      const records1 = getRecordsInRange(this.records, start1, end1)
      const records2 = getRecordsInRange(this.records, start2, end2)

      const income1 = sumAmountByType(records1, 'income')
      const expense1 = sumAmountByType(records1, 'expense')
      const income2 = sumAmountByType(records2, 'income')
      const expense2 = sumAmountByType(records2, 'expense')

      return {
        period1: {
          records: records1,
          income: income1,
          expense: expense1,
          balance: income1 - expense1
        },
        period2: {
          records: records2,
          income: income2,
          expense: expense2,
          balance: income2 - expense2
        },
        diff: {
          income: income2 - income1,
          expense: expense2 - expense1,
          balance: (income2 - expense2) - (income1 - expense1),
          incomeRate: calcGrowthRate(income2, income1),
          expenseRate: calcGrowthRate(expense2, expense1),
          balanceRate: calcGrowthRate(income2 - expense2, income1 - expense1)
        }
      }
    },
    trendData() {
      const { start, end } = this.periodRange
      
      if (this.timeDimension === 'day') {
        return this.getHourlyTrend(start)
      } else if (this.timeDimension === 'week') {
        return this.getDailyTrend(start, 7)
      } else if (this.timeDimension === 'month') {
        const year = this.baseDate.getFullYear()
        const month = this.baseDate.getMonth() + 1
        const daysInMonth = new Date(year, month, 0).getDate()
        return this.getDailyTrend(new Date(year, month - 1, 1), daysInMonth)
      } else if (this.timeDimension === 'quarter') {
        return this.getMonthlyTrend(start, 3)
      } else if (this.timeDimension === 'year') {
        return this.getMonthlyTrend(start, 12)
      }
      return []
    }
  },
  watch: {
    trendType() {
      this.renderTrendChart()
    },
    predictionTrendType() {
      this.renderPredictionChart()
    },
    activeTab() {
      this.$nextTick(() => {
        if (this.activeTab === 'overview') {
          this.renderExpensePieChart()
          this.renderIncomePieChart()
          this.renderTrendChart()
        } else if (this.activeTab === 'prediction') {
          this.renderPredictionChart()
        } else if (this.activeTab === 'compare') {
          this.renderCompareChart()
        }
      })
    }
  },
  mounted() {
    this.loadData()
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
    this.disposeCharts()
  },
  methods: {
    formatMoney,
    formatGrowthRate,
    getHourlyTrend(startDate) {
      const data = []
      for (let i = 0; i < 24; i++) {
        data.push({ label: `${i}时`, income: 0, expense: 0 })
      }
      this.periodRecords.forEach(r => {
        const hour = new Date(r.date).getHours()
        if (data[hour]) {
          data[hour][r.type] += Number(r.amount)
        }
      })
      return data
    },
    getDailyTrend(startDate, days) {
      const data = []
      for (let i = 0; i < days; i++) {
        const d = new Date(startDate)
        d.setDate(startDate.getDate() + i)
        data.push({ label: `${i + 1}日`, income: 0, expense: 0, date: formatDate(d, 'YYYY-MM-DD') })
      }
      this.periodRecords.forEach(r => {
        const dateStr = r.date
        const item = data.find(d => d.date === dateStr)
        if (item) {
          item[r.type] += Number(r.amount)
        }
      })
      return data
    },
    getMonthlyTrend(startDate, months) {
      const data = []
      for (let i = 0; i < months; i++) {
        const d = new Date(startDate)
        d.setMonth(startDate.getMonth() + i)
        data.push({ label: `${i + 1}月`, income: 0, expense: 0, month: formatDate(d, 'YYYY-MM') })
      }
      this.periodRecords.forEach(r => {
        const monthStr = r.date.substring(0, 7)
        const item = data.find(d => d.month === monthStr)
        if (item) {
          item[r.type] += Number(r.amount)
        }
      })
      return data
    },
    async loadData() {
      const [records, categories] = await Promise.all([
        recordApi.getRecords(),
        categoryApi.getCategories()
      ])
      this.records = (records || []).filter(r => r.type !== 'transfer')
      this.categories = categories || []
      this.$nextTick(() => {
        this.initCharts()
      })
    },
    handleTimeDimensionChange(value) {
      this.currentDate = new Date()
      this.loadData()
    },
    handleResize() {
      this.expensePieChart?.resize()
      this.incomePieChart?.resize()
      this.trendChart?.resize()
      this.predictionChart?.resize()
      this.compareChart?.resize()
    },
    disposeCharts() {
      this.expensePieChart?.dispose()
      this.incomePieChart?.dispose()
      this.trendChart?.dispose()
      this.predictionChart?.dispose()
      this.compareChart?.dispose()
    },
    initCharts() {
      if (this.activeTab === 'overview') {
        this.renderExpensePieChart()
        this.renderIncomePieChart()
        this.renderTrendChart()
      } else if (this.activeTab === 'prediction') {
        this.renderPredictionChart()
      } else if (this.activeTab === 'compare') {
        this.renderCompareChart()
      }
    },
    renderExpensePieChart() {
      if (!this.$refs.expensePieChart) return
      if (this.expensePieChart) this.expensePieChart.dispose()
      
      this.expensePieChart = echarts.init(this.$refs.expensePieChart)
      const data = this.expenseByCategory.map(item => ({
        value: item.amount,
        name: item.name,
        itemStyle: { color: item.color }
      }))
      
      const option = {
        tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
        series: [{
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.2)' }
          },
          labelLine: { show: false },
          data
        }]
      }
      this.expensePieChart.setOption(option)
    },
    renderIncomePieChart() {
      if (!this.$refs.incomePieChart) return
      if (this.incomePieChart) this.incomePieChart.dispose()
      
      this.incomePieChart = echarts.init(this.$refs.incomePieChart)
      const data = this.incomeByCategory.map(item => ({
        value: item.amount,
        name: item.name,
        itemStyle: { color: item.color }
      }))
      
      const option = {
        tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
        series: [{
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.2)' }
          },
          labelLine: { show: false },
          data
        }]
      }
      this.incomePieChart.setOption(option)
    },
    renderTrendChart() {
      if (!this.$refs.trendChart) return
      if (this.trendChart) this.trendChart.dispose()
      
      this.trendChart = echarts.init(this.$refs.trendChart)
      const xData = this.trendData.map(item => item.label)
      let series = []
      
      if (this.trendType === 'all' || this.trendType === 'income') {
        series.push({
          name: '收入',
          type: 'bar',
          data: this.trendData.map(item => item.income),
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
          data: this.trendData.map(item => item.expense),
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
          axisPointer: { type: 'shadow' },
          formatter: (params) => {
            let result = params[0].axisValue + '<br/>'
            params.forEach(param => {
              result += `${param.marker} ${param.seriesName}: ¥${param.value.toFixed(2)}<br/>`
            })
            return result
          }
        },
        legend: { show: this.trendType === 'all', data: ['收入', '支出'], top: 0, right: 0 },
        grid: { left: '3%', right: '4%', bottom: '3%', top: this.trendType === 'all' ? 40 : 10, containLabel: true },
        xAxis: {
          type: 'category',
          data: xData,
          axisLine: { lineStyle: { color: '#e4e7ed' } },
          axisLabel: { color: '#909399', interval: 'auto', fontSize: 11 }
        },
        yAxis: {
          type: 'value',
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#f0f2f5', type: 'dashed' } },
          axisLabel: { color: '#909399', formatter: (value) => value >= 1000 ? (value / 1000) + 'k' : value }
        },
        series
      }
      this.trendChart.setOption(option)
    },
    renderPredictionChart() {
      if (!this.$refs.predictionChart) return
      if (this.predictionChart) this.predictionChart.dispose()
      
      this.predictionChart = echarts.init(this.$refs.predictionChart)
      
      const historyLabels = this.monthlyData.map(item => item.label)
      const allLabels = [...historyLabels, '预测']
      const type = this.predictionTrendType
      
      const historyData = this.monthlyData.map(item => item[type])
      const predictedValue = this.prediction[type]
      const allData = [...historyData, predictedValue]
      
      const dataPoints = historyData.map((y, x) => ({ x: x + 1, y }))
      const model = linearRegression(dataPoints)
      const regressionData = allLabels.map((_, i) => model.predict(i + 1))
      
      const option = {
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            let result = params[0].axisValue + '<br/>'
            params.forEach(param => {
              const value = param.value === null || param.value === undefined ? '-' : '¥' + Number(param.value).toFixed(2)
              result += `${param.marker} ${param.seriesName}: ${value}<br/>`
            })
            return result
          }
        },
        legend: { data: ['实际值', '预测值', '趋势线'], top: 0, right: 0 },
        grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
        xAxis: {
          type: 'category',
          data: allLabels,
          axisLine: { lineStyle: { color: '#e4e7ed' } },
          axisLabel: { color: '#909399', fontSize: 11 }
        },
        yAxis: {
          type: 'value',
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#f0f2f5', type: 'dashed' } },
          axisLabel: { color: '#909399', formatter: (value) => value >= 1000 ? (value / 1000) + 'k' : value }
        },
        series: [
          {
            name: '实际值',
            type: 'bar',
            data: [...historyData, null],
            itemStyle: {
              color: type === 'income' ? '#67C23A' : '#F56C6C',
              borderRadius: [4, 4, 0, 0]
            }
          },
          {
            name: '预测值',
            type: 'bar',
            data: [...Array(historyData.length).fill(null), predictedValue],
            itemStyle: {
              color: type === 'income' 
                ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#67C23A' },
                    { offset: 1, color: '#95D475' }
                  ])
                : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#F56C6C' },
                    { offset: 1, color: '#F89898' }
                  ]),
              borderRadius: [4, 4, 0, 0]
            }
          },
          {
            name: '趋势线',
            type: 'line',
            data: regressionData,
            smooth: true,
            lineStyle: { type: 'dashed', color: '#909399', width: 2 },
            itemStyle: { color: '#909399' },
            symbol: 'circle',
            symbolSize: 6
          }
        ]
      }
      this.predictionChart.setOption(option)
    },
    renderCompareChart() {
      if (!this.$refs.compareChart) return
      if (this.compareChart) this.compareChart.dispose()
      
      if (!this.compareRange1 || !this.compareRange2) return
      
      this.compareChart = echarts.init(this.$refs.compareChart)
      
      const p1Categories = groupByCategory(this.compareData.period1.records, this.categories, 'expense').slice(0, 8)
      const p2Categories = groupByCategory(this.compareData.period2.records, this.categories, 'expense').slice(0, 8)
      
      const categoryNames = [...new Set([...p1Categories.map(c => c.name), ...p2Categories.map(c => c.name)])]
      
      const p1Data = categoryNames.map(name => {
        const item = p1Categories.find(c => c.name === name)
        return item ? item.amount : 0
      })
      const p2Data = categoryNames.map(name => {
        const item = p2Categories.find(c => c.name === name)
        return item ? item.amount : 0
      })
      
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params) => {
            let result = params[0].axisValue + '<br/>'
            params.forEach(param => {
              result += `${param.marker} ${param.seriesName}: ¥${param.value.toFixed(2)}<br/>`
            })
            return result
          }
        },
        legend: { data: ['时间段1', '时间段2'], top: 0, right: 0 },
        grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
        xAxis: {
          type: 'category',
          data: categoryNames,
          axisLine: { lineStyle: { color: '#e4e7ed' } },
          axisLabel: { color: '#909399', fontSize: 11 }
        },
        yAxis: {
          type: 'value',
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#f0f2f5', type: 'dashed' } },
          axisLabel: { color: '#909399', formatter: (value) => value >= 1000 ? (value / 1000) + 'k' : value }
        },
        series: [
          {
            name: '时间段1',
            type: 'bar',
            data: p1Data,
            itemStyle: { color: '#409EFF', borderRadius: [4, 4, 0, 0] }
          },
          {
            name: '时间段2',
            type: 'bar',
            data: p2Data,
            itemStyle: { color: '#67C23A', borderRadius: [4, 4, 0, 0] }
          }
        ]
      }
      this.compareChart.setOption(option)
    },
    async handleExport(command) {
      const loading = this.$loading({ lock: true, text: '正在生成报告...', background: 'rgba(0, 0, 0, 0.7)' })
      
      try {
        let data
        let periodLabel = ''
        
        if (command === 'monthly') {
          const now = new Date()
          const { start, end } = getTimeRange(now, 'month')
          const records = getRecordsInRange(this.records, start, end)
          const income = sumAmountByType(records, 'income')
          const expense = sumAmountByType(records, 'expense')
          
          const prevDate = getPrevPeriodDate(now, 'month')
          const prevRange = getTimeRange(prevDate, 'month')
          const prevRecords = getRecordsInRange(this.records, prevRange.start, prevRange.end)
          
          const lastYearDate = getSamePeriodLastYear(now)
          const lastYearRange = getTimeRange(lastYearDate, 'month')
          const lastYearRecords = getRecordsInRange(this.records, lastYearRange.start, lastYearRange.end)
          
          periodLabel = formatDate(now, 'YYYY年MM月')
          
          data = {
            period: periodLabel,
            overview: { income, expense, balance: income - expense, count: records.length },
            comparison: {
              income: {
                current: income,
                prev: sumAmountByType(prevRecords, 'income'),
                lastYear: sumAmountByType(lastYearRecords, 'income'),
                mom: calcGrowthRate(income, sumAmountByType(prevRecords, 'income')),
                yoy: calcGrowthRate(income, sumAmountByType(lastYearRecords, 'income'))
              },
              expense: {
                current: expense,
                prev: sumAmountByType(prevRecords, 'expense'),
                lastYear: sumAmountByType(lastYearRecords, 'expense'),
                mom: calcGrowthRate(expense, sumAmountByType(prevRecords, 'expense')),
                yoy: calcGrowthRate(expense, sumAmountByType(lastYearRecords, 'expense'))
              }
            },
            expenseRank: groupByCategory(records, this.categories, 'expense'),
            incomeRank: groupByCategory(records, this.categories, 'income'),
            prediction: this.prediction,
            records
          }
        } else if (command === 'yearly') {
          const now = new Date()
          const { start, end } = getTimeRange(now, 'year')
          const records = getRecordsInRange(this.records, start, end)
          const income = sumAmountByType(records, 'income')
          const expense = sumAmountByType(records, 'expense')
          
          const lastYearDate = getSamePeriodLastYear(now)
          const lastYearRange = getTimeRange(lastYearDate, 'year')
          const lastYearRecords = getRecordsInRange(this.records, lastYearRange.start, lastYearRange.end)
          
          periodLabel = formatDate(now, 'YYYY年')
          
          data = {
            period: periodLabel,
            overview: { income, expense, balance: income - expense, count: records.length },
            comparison: {
              income: {
                current: income,
                prev: sumAmountByType(lastYearRecords, 'income'),
                lastYear: sumAmountByType(lastYearRecords, 'income'),
                mom: calcGrowthRate(income, sumAmountByType(lastYearRecords, 'income')),
                yoy: calcGrowthRate(income, sumAmountByType(lastYearRecords, 'income'))
              },
              expense: {
                current: expense,
                prev: sumAmountByType(lastYearRecords, 'expense'),
                lastYear: sumAmountByType(lastYearRecords, 'expense'),
                mom: calcGrowthRate(expense, sumAmountByType(lastYearRecords, 'expense')),
                yoy: calcGrowthRate(expense, sumAmountByType(lastYearRecords, 'expense'))
              }
            },
            expenseRank: groupByCategory(records, this.categories, 'expense'),
            incomeRank: groupByCategory(records, this.categories, 'income'),
            prediction: this.prediction,
            records
          }
        } else {
          data = {
            period: this.periodLabel,
            overview: { ...this.overview, count: this.periodRecords.length },
            comparison: this.comparison,
            expenseRank: this.expenseByCategory,
            incomeRank: this.incomeByCategory,
            prediction: this.prediction,
            records: this.periodRecords
          }
        }
        
        const result = await recordApi.exportPdf(data)
        loading.close()
        
        if (result) {
          this.$message.success('报告导出成功')
        } else {
          this.$message.info('已取消导出')
        }
      } catch (error) {
        loading.close()
        console.error('Export error:', error)
        this.$message.error('导出失败: ' + error.message)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.statistics {
  .header {
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    
    .header-left {
      .page-title {
        font-size: 22px;
        font-weight: 600;
        color: $text-primary;
        margin: 0;
      }
    }
    
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .tab-switcher {
        ::v-deep .el-radio-button__inner {
          padding: 8px 16px;
        }
      }
    }
  }
  
  .time-dimension-tabs {
    margin-bottom: 20px;
    
    ::v-deep .el-tabs__header {
      margin-bottom: 16px;
    }
    
    ::v-deep .el-tabs__item {
      height: 36px;
      line-height: 36px;
      
      .el-date-picker {
        margin-left: 12px;
      }
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
      
      &.income-icon { background: #f0f9eb; }
      &.expense-icon { background: #fef0f0; }
      &.balance-icon { background: #ecf5ff; }
      &.count-icon { background: #fdf6ec; }
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
  
  .comparison-card {
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
      
      .card-subtitle {
        font-size: 12px;
        color: $text-secondary;
      }
    }
  }
  
  .comparison-item {
    padding: 16px;
    border-radius: 8px;
    
    &.income-comparison {
      background: linear-gradient(135deg, #f0f9eb 0%, #ffffff 100%);
    }
    
    &.expense-comparison {
      background: linear-gradient(135deg, #fef0f0 0%, #ffffff 100%);
    }
    
    .comparison-header {
      margin-bottom: 12px;
      
      .comparison-label {
        font-size: 14px;
        font-weight: 500;
        color: $text-primary;
      }
    }
    
    .comparison-body {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      
      .comparison-value {
        .current-value {
          font-size: 24px;
          font-weight: 600;
        }
        
        .period-label {
          display: block;
          font-size: 12px;
          color: $text-secondary;
          margin-top: 4px;
        }
      }
      
      .comparison-diff {
        .diff-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          
          &:last-child {
            margin-bottom: 0;
          }
          
          .diff-label {
            font-size: 12px;
            color: $text-secondary;
            width: 30px;
          }
          
          .diff-value {
            font-size: 14px;
            font-weight: 500;
            width: 60px;
          }
          
          .diff-amount {
            font-size: 12px;
            color: $text-regular;
          }
        }
      }
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
  
  .ranking-card {
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
    
    .ranking-list {
      .ranking-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 8px;
        transition: background 0.2s;
        
        &:hover {
          background: #f5f7fa;
        }
        
        .ranking-rank {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          background: #f0f2f5;
          color: $text-secondary;
          
          &.rank-1 { background: linear-gradient(135deg, #FFD700, #FFA500); color: #fff; }
          &.rank-2 { background: linear-gradient(135deg, #C0C0C0, #A8A8A8); color: #fff; }
          &.rank-3 { background: linear-gradient(135deg, #CD7F32, #8B4513); color: #fff; }
        }
        
        .ranking-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        
        .ranking-info {
          flex: 1;
          min-width: 0;
          
          .ranking-name {
            font-size: 14px;
            font-weight: 500;
            color: $text-primary;
            margin-bottom: 6px;
          }
          
          .ranking-bar {
            height: 6px;
            background: #f0f2f5;
            border-radius: 3px;
            overflow: hidden;
            
            .ranking-bar-inner {
              height: 100%;
              border-radius: 3px;
              transition: width 0.3s;
            }
          }
        }
        
        .ranking-amount {
          text-align: right;
          
          .amount-value {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: $text-primary;
          }
          
          .amount-percent {
            display: block;
            font-size: 12px;
            color: $text-secondary;
          }
        }
      }
    }
  }
  
  .prediction-card {
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
      
      .card-subtitle {
        font-size: 12px;
        color: $text-secondary;
      }
    }
    
    .prediction-overview {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 20px;
      
      .prediction-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: #fff;
        border-radius: 10px;
        border: 1px solid #f0f2f5;
        
        .prediction-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          
          &.income-icon { background: #f0f9eb; }
          &.expense-icon { background: #fef0f0; }
          &.balance-icon { background: #ecf5ff; }
        }
        
        .prediction-info {
          .prediction-label {
            font-size: 13px;
            color: $text-secondary;
            margin-bottom: 4px;
          }
          
          .prediction-value {
            font-size: 20px;
            font-weight: 600;
          }
        }
      }
    }
    
    .prediction-chart {
      height: 300px;
    }
    
    .prediction-tips {
      margin-top: 20px;
    }
  }
  
  .compare-card {
    .card-header {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f0f2f5;
      
      .card-title {
        font-size: 15px;
        font-weight: 500;
        color: $text-primary;
      }
    }
    
    .compare-selectors {
      display: flex;
      gap: 24px;
      margin-bottom: 24px;
      
      .selector-group {
        flex: 1;
        
        label {
          display: block;
          font-size: 13px;
          color: $text-secondary;
          margin-bottom: 8px;
        }
        
        .el-date-editor {
          width: 100%;
        }
      }
    }
    
    .compare-results {
      .compare-period-card {
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 20px;
        
        &.period1 {
          background: linear-gradient(135deg, #ecf5ff 0%, #ffffff 100%);
          border: 1px solid #d9ecff;
        }
        
        &.period2 {
          background: linear-gradient(135deg, #f0f9eb 0%, #ffffff 100%);
          border: 1px solid #e1f3d8;
        }
        
        .period-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px dashed #e4e7ed;
          
          .period-title {
            font-size: 16px;
            font-weight: 600;
            color: $text-primary;
          }
          
          .period-date {
            font-size: 12px;
            color: $text-secondary;
          }
        }
        
        .period-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          
          .stat-item {
            .stat-label {
              display: block;
              font-size: 12px;
              color: $text-secondary;
              margin-bottom: 4px;
            }
            
            .stat-value {
              font-size: 18px;
              font-weight: 600;
            }
          }
        }
      }
    }
    
    .compare-diff-card {
      margin-bottom: 20px;
      
      .card-header {
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #f0f2f5;
        
        .card-title {
          font-size: 15px;
          font-weight: 500;
          color: $text-primary;
        }
      }
      
      .diff-card {
        text-align: center;
        padding: 20px;
        background: #fafafa;
        border-radius: 10px;
        
        .diff-label {
          font-size: 13px;
          color: $text-secondary;
          margin-bottom: 8px;
        }
        
        .diff-value {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .diff-rate {
          font-size: 14px;
          font-weight: 500;
        }
      }
    }
    
    .compare-chart {
      height: 300px;
    }
  }
  
  .text-income {
    color: #67C23A;
  }
  
  .text-expense {
    color: #F56C6C;
  }
}
</style>