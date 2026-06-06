<template>
  <div class="component-config-panel">
    <div class="panel-header">
      <span class="panel-title">组件配置</span>
      <el-button
        type="text"
        icon="el-icon-close"
        @click="$emit('close')"
      ></el-button>
    </div>

    <div class="panel-content" v-if="component">
      <el-form label-width="80px" size="small">
        <el-form-item label="标题">
          <el-input
            v-model="localComponent.title"
            placeholder="组件标题"
            @input="emitUpdate"
          />
        </el-form-item>

        <el-divider v-if="hasDataConfig" />

        <template v-if="component.type === 'overview-card'">
          <el-form-item label="指标">
            <el-select v-model="localComponent.config.metric" @change="emitUpdate">
              <el-option
                v-for="opt in METRIC_TYPES"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
        </template>

        <template v-if="hasPeriodConfig">
          <el-form-item label="时间范围">
            <el-select v-model="localComponent.config.period" @change="emitUpdate">
              <el-option
                v-for="opt in PERIOD_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item
            v-if="localComponent.config.period === 'custom'"
            label="自定义"
          >
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="yyyy-MM-dd"
              @change="handleDateRangeChange"
            />
          </el-form-item>
        </template>

        <template v-if="hasDataTypeConfig">
          <el-form-item label="数据类型">
            <el-select v-model="localComponent.config.dataType" @change="emitUpdate">
              <el-option
                v-for="opt in DATA_TYPES"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
        </template>

        <template v-if="hasGroupByConfig">
          <el-form-item label="分组方式">
            <el-select v-model="localComponent.config.groupBy" @change="emitUpdate">
              <el-option
                v-for="opt in GROUP_BY_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
        </template>

        <template v-if="component.type === 'ranking'">
          <el-form-item label="显示数量">
            <el-input-number
              v-model="localComponent.config.limit"
              :min="3"
              :max="20"
              @change="emitUpdate"
            />
          </el-form-item>
          <el-form-item label="排序方式">
            <el-radio-group v-model="localComponent.config.order" @change="emitUpdate">
              <el-radio-button label="desc">降序</el-radio-button>
              <el-radio-button label="asc">升序</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </template>

        <template v-if="component.type === 'table'">
          <el-form-item label="显示数量">
            <el-input-number
              v-model="localComponent.config.limit"
              :min="5"
              :max="100"
              @change="emitUpdate"
            />
          </el-form-item>
          <el-form-item label="显示列">
            <el-checkbox-group v-model="tableColumns" @change="handleTableColumnsChange">
              <el-checkbox label="showDate">日期</el-checkbox>
              <el-checkbox label="showType">类型</el-checkbox>
              <el-checkbox label="showCategory">分类</el-checkbox>
              <el-checkbox label="showAccount">账户</el-checkbox>
              <el-checkbox label="showAmount">金额</el-checkbox>
              <el-checkbox label="showRemark">备注</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </template>

        <template v-if="component.type === 'line-chart'">
          <el-form-item label="分类数量">
            <el-input-number
              v-model="localComponent.config.topCategories"
              :min="3"
              :max="10"
              @change="emitUpdate"
            />
          </el-form-item>
          <el-form-item label="平滑曲线">
            <el-switch
              v-model="localComponent.config.smooth"
              @change="emitUpdate"
            />
          </el-form-item>
        </template>

        <template v-if="hasChartConfig">
          <el-form-item label="显示图例">
            <el-switch
              v-model="localComponent.config.showLegend"
              @change="emitUpdate"
            />
          </el-form-item>
        </template>

        <template v-if="component.type === 'bar-chart'">
          <el-form-item label="堆叠显示">
            <el-switch
              v-model="localComponent.config.stacked"
              @change="emitUpdate"
            />
          </el-form-item>
        </template>

        <template v-if="component.type === 'pie-chart'">
          <el-form-item label="显示标签">
            <el-switch
              v-model="localComponent.config.showLabel"
              @change="emitUpdate"
            />
          </el-form-item>
        </template>

        <template v-if="component.type === 'text'">
          <el-form-item label="内容">
            <el-input
              type="textarea"
              :rows="4"
              v-model="localComponent.config.content"
              @input="emitUpdate"
            />
          </el-form-item>
          <el-form-item label="字号">
            <el-input-number
              v-model="localComponent.config.fontSize"
              :min="12"
              :max="32"
              @change="emitUpdate"
            />
          </el-form-item>
          <el-form-item label="字重">
            <el-select v-model="localComponent.config.fontWeight" @change="emitUpdate">
              <el-option label="正常" value="normal" />
              <el-option label="加粗" value="bold" />
            </el-select>
          </el-form-item>
          <el-form-item label="对齐">
            <el-radio-group v-model="localComponent.config.textAlign" @change="emitUpdate">
              <el-radio-button label="left">左</el-radio-button>
              <el-radio-button label="center">中</el-radio-button>
              <el-radio-button label="right">右</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="颜色">
            <el-color-picker
              v-model="localComponent.config.color"
              @change="emitUpdate"
            />
          </el-form-item>
        </template>

        <template v-if="component.type === 'divider'">
          <el-form-item label="显示线条">
            <el-switch
              v-model="localComponent.config.showLine"
              @change="emitUpdate"
            />
          </el-form-item>
        </template>

        <el-divider v-if="hasFilterConfig" />

        <template v-if="hasFilterConfig">
          <el-form-item label="分类筛选">
            <el-select
              v-model="localComponent.config.categoryIds"
              multiple
              filterable
              placeholder="选择分类"
              @change="emitUpdate"
            >
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
                :value="cat.id"
              >
                <span style="float: left;">{{ cat.icon }} {{ cat.name }}</span>
                <span style="float: right; color: #8492a6; font-size: 13px;">
                  {{ cat.type === 'income' ? '收入' : '支出' }}
                </span>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="账户筛选">
            <el-select
              v-model="localComponent.config.accountIds"
              multiple
              filterable
              placeholder="选择账户"
              @change="emitUpdate"
            >
              <el-option
                v-for="acc in accounts"
                :key="acc.id"
                :label="acc.name"
                :value="acc.id"
              >
                <span style="float: left;">{{ acc.icon }} {{ acc.name }}</span>
              </el-option>
            </el-select>
          </el-form-item>
        </template>

        <el-divider />

        <el-form-item>
          <el-button
            type="danger"
            icon="el-icon-delete"
            @click="$emit('delete', component.id)"
            size="small"
          >
            删除组件
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div v-else class="empty-state">
      <i class="el-icon-setting"></i>
      <p>选择组件进行配置</p>
    </div>
  </div>
</template>

<script>
import {
  METRIC_TYPES,
  DATA_TYPES,
  GROUP_BY_OPTIONS,
  PERIOD_OPTIONS
} from '@/utils/reportUtils'

export default {
  name: 'ComponentConfigPanel',
  props: {
    component: {
      type: Object,
      default: null
    },
    categories: {
      type: Array,
      default: () => []
    },
    accounts: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      METRIC_TYPES,
      DATA_TYPES,
      GROUP_BY_OPTIONS,
      PERIOD_OPTIONS,
      localComponent: null,
      dateRange: []
    }
  },
  computed: {
    hasDataConfig() {
      if (!this.component) return false
      return ['overview-card', 'pie-chart', 'bar-chart', 'line-chart', 'table', 'ranking', 'trend-compare']
        .includes(this.component.type)
    },
    hasPeriodConfig() {
      if (!this.component) return false
      return ['overview-card', 'pie-chart', 'bar-chart', 'line-chart', 'table', 'ranking', 'trend-compare']
        .includes(this.component.type)
    },
    hasDataTypeConfig() {
      if (!this.component) return false
      return ['pie-chart', 'bar-chart', 'line-chart', 'ranking']
        .includes(this.component.type)
    },
    hasGroupByConfig() {
      if (!this.component) return false
      return ['pie-chart', 'bar-chart', 'line-chart', 'ranking']
        .includes(this.component.type)
    },
    hasChartConfig() {
      if (!this.component) return false
      return ['pie-chart', 'bar-chart', 'line-chart']
        .includes(this.component.type)
    },
    hasFilterConfig() {
      if (!this.component) return false
      return ['overview-card', 'pie-chart', 'bar-chart', 'line-chart', 'table', 'ranking', 'trend-compare']
        .includes(this.component.type)
    },
    tableColumns: {
      get() {
        if (!this.localComponent) return []
        const config = this.localComponent.config
        return Object.keys(config).filter(k => k.startsWith('show') && config[k])
      },
      set(val) {
        if (!this.localComponent) return
        const columns = ['showDate', 'showType', 'showCategory', 'showAccount', 'showAmount', 'showRemark']
        columns.forEach(col => {
          this.localComponent.config[col] = val.includes(col)
        })
      }
    }
  },
  watch: {
    component: {
      immediate: true,
      handler(val) {
        if (val) {
          this.localComponent = JSON.parse(JSON.stringify(val))
          if (this.localComponent.config.startDate && this.localComponent.config.endDate) {
            this.dateRange = [this.localComponent.config.startDate, this.localComponent.config.endDate]
          } else {
            this.dateRange = []
          }
        }
      }
    }
  },
  methods: {
    emitUpdate() {
      this.$emit('update', this.localComponent)
    },
    handleDateRangeChange(val) {
      if (val && val.length === 2) {
        this.localComponent.config.startDate = val[0]
        this.localComponent.config.endDate = val[1]
      } else {
        this.localComponent.config.startDate = null
        this.localComponent.config.endDate = null
      }
      this.emitUpdate()
    },
    handleTableColumnsChange() {
      this.emitUpdate()
    }
  }
}
</script>

<style scoped lang="scss">
.component-config-panel {
  height: 100%;
  background: #fff;
  border-left: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #e4e7ed;

    .panel-title {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #c0c4cc;

    i {
      font-size: 48px;
      margin-bottom: 12px;
    }

    p {
      margin: 0;
      font-size: 13px;
    }
  }
}
</style>
