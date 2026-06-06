<template>
  <div class="report-templates">
    <div class="page-header">
      <h2 class="page-title">报表模板</h2>
      <div class="header-actions">
        <el-button
          type="primary"
          icon="el-icon-plus"
          @click="$router.push('/report-designer')"
        >
          创建设计
        </el-button>
        <el-button
          icon="el-icon-upload2"
          @click="handleImportTemplate"
        >
          导入模板
        </el-button>
      </div>
    </div>

    <div class="template-tabs">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="内置模板" name="builtIn">
          <div class="template-grid">
            <div
              v-for="template in builtInTemplates"
              :key="template.id"
              class="template-card"
            >
              <div class="card-preview">
                <i class="el-icon-document-copy"></i>
              </div>
              <div class="card-content">
                <div class="card-header">
                  <h3 class="template-name">{{ template.name }}</h3>
                  <el-tag size="mini" type="success">内置</el-tag>
                </div>
                <p class="template-desc">{{ template.description }}</p>
                <div class="template-meta">
                  <span>
                    <i class="el-icon-s-grid"></i>
                    {{ template.components?.length || 0 }} 个组件
                  </span>
                </div>
                <div class="card-actions">
                  <el-button size="small" @click="handlePreview(template)">
                    预览
                  </el-button>
                  <el-button size="small" type="primary" @click="handleUseTemplate(template)">
                    使用模板
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="我的模板" name="custom">
          <div class="template-grid" v-if="customTemplates.length > 0">
            <div
              v-for="template in customTemplates"
              :key="template.id"
              class="template-card"
            >
              <div class="card-preview">
                <i class="el-icon-document"></i>
              </div>
              <div class="card-content">
                <div class="card-header">
                  <h3 class="template-name">{{ template.name }}</h3>
                  <el-tag size="mini" type="info">自定义</el-tag>
                </div>
                <p class="template-desc">{{ template.description || '暂无描述' }}</p>
                <div class="template-meta">
                  <span>
                    <i class="el-icon-s-grid"></i>
                    {{ template.components?.length || 0 }} 个组件
                  </span>
                  <span>
                    <i class="el-icon-time"></i>
                    {{ formatDate(template.createdAt) }}
                  </span>
                </div>
                <div class="card-actions">
                  <el-button size="small" @click="handlePreview(template)">
                    预览
                  </el-button>
                  <el-button size="small" type="primary" @click="handleUseTemplate(template)">
                    使用模板
                  </el-button>
                  <el-dropdown @command="(cmd) => handleTemplateAction(cmd, template)">
                    <el-button size="small" icon="el-icon-more"></el-button>
                    <el-dropdown-menu slot="dropdown">
                      <el-dropdown-item command="export">
                        <i class="el-icon-download"></i> 导出模板
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" divided>
                        <i class="el-icon-delete" style="color: #f56c6c;"></i>
                        <span style="color: #f56c6c;">删除模板</span>
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </el-dropdown>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <i class="el-icon-folder-opened"></i>
            <p>暂无自定义模板</p>
            <el-button type="primary" @click="$router.push('/report-designer')">
              创建第一个模板
            </el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog
      :title="'预览：' + previewTemplate?.name"
      :visible.sync="showPreview"
      width="90%"
      top="5vh"
    >
      <div class="preview-content" v-if="previewTemplate">
        <div class="preview-grid">
          <div
            v-for="component in previewTemplate.components"
            :key="component.id"
            class="preview-item"
            :style="getPreviewStyle(component)"
          >
            <component
              :is="getComponentName(component.type)"
              :component="component"
              :records="records"
              :categories="categories"
              :accounts="accounts"
              :interactive="false"
            />
          </div>
        </div>
      </div>
      <span slot="footer">
        <el-button @click="showPreview = false">关闭</el-button>
        <el-button type="primary" @click="handleUseTemplate(previewTemplate)">
          使用此模板
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  COMPONENT_TYPES,
  getReportTemplates,
  deleteReportTemplate,
  exportReportTemplate,
  importReportTemplate,
  formatMoney
} from '@/utils/reportUtils'
import { recordApi, categoryApi, accountApi } from '@/api'
import OverviewCard from '@/components/report/OverviewCard.vue'
import PieChart from '@/components/report/PieChart.vue'
import BarChart from '@/components/report/BarChart.vue'
import LineChart from '@/components/report/LineChart.vue'
import DataTable from '@/components/report/DataTable.vue'
import RankingList from '@/components/report/RankingList.vue'
import TrendCompare from '@/components/report/TrendCompare.vue'
import DividerBlock from '@/components/report/DividerBlock.vue'
import TextBlock from '@/components/report/TextBlock.vue'
import SpacerBlock from '@/components/report/SpacerBlock.vue'

export default {
  name: 'ReportTemplates',
  components: {
    OverviewCard,
    PieChart,
    BarChart,
    LineChart,
    DataTable,
    RankingList,
    TrendCompare,
    DividerBlock,
    TextBlock,
    SpacerBlock
  },
  data() {
    return {
      activeTab: 'builtIn',
      templates: [],
      records: [],
      categories: [],
      accounts: [],
      showPreview: false,
      previewTemplate: null,
      previewCellWidth: 70,
      previewCellHeight: 50
    }
  },
  computed: {
    builtInTemplates() {
      return this.templates.filter(t => t.builtIn)
    },
    customTemplates() {
      return this.templates.filter(t => !t.builtIn)
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    formatMoney,
    async loadData() {
      const [records, categories, accounts, templates] = await Promise.all([
        recordApi.getRecords(),
        categoryApi.getCategories(),
        accountApi.getAccounts(),
        getReportTemplates()
      ])
      this.records = records || []
      this.categories = categories || []
      this.accounts = accounts || []
      this.templates = templates || []
    },
    getComponentName(type) {
      const map = {
        [COMPONENT_TYPES.OVERVIEW_CARD]: 'OverviewCard',
        [COMPONENT_TYPES.PIE_CHART]: 'PieChart',
        [COMPONENT_TYPES.BAR_CHART]: 'BarChart',
        [COMPONENT_TYPES.LINE_CHART]: 'LineChart',
        [COMPONENT_TYPES.TABLE]: 'DataTable',
        [COMPONENT_TYPES.RANKING]: 'RankingList',
        [COMPONENT_TYPES.TREND_COMPARE]: 'TrendCompare',
        [COMPONENT_TYPES.DIVIDER]: 'DividerBlock',
        [COMPONENT_TYPES.TEXT]: 'TextBlock',
        [COMPONENT_TYPES.SPACER]: 'SpacerBlock'
      }
      return map[type] || 'div'
    },
    getPreviewStyle(component) {
      return {
        left: component.x * this.previewCellWidth + 'px',
        top: component.y * this.previewCellHeight + 'px',
        width: component.w * this.previewCellWidth - 8 + 'px',
        height: component.h * this.previewCellHeight - 8 + 'px'
      }
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleDateString('zh-CN')
    },
    handlePreview(template) {
      this.previewTemplate = template
      this.showPreview = true
    },
    handleUseTemplate(template) {
      this.$router.push({
        path: '/report-designer',
        query: { templateId: template.id }
      })
    },
    async handleTemplateAction(cmd, template) {
      if (cmd === 'export') {
        try {
          const result = await exportReportTemplate(template.id)
          if (result) {
            this.$message.success(`模板已导出到：${result}`)
          }
        } catch (e) {
          this.$message.error('导出失败：' + e.message)
        }
      } else if (cmd === 'delete') {
        this.$confirm('确定要删除该模板吗？此操作不可恢复。', '确认删除', {
          type: 'warning'
        }).then(async () => {
          const result = await deleteReportTemplate(template.id)
          if (result) {
            this.$message.success('删除成功')
            this.loadData()
          }
        }).catch(() => {})
      }
    },
    async handleImportTemplate() {
      try {
        const result = await importReportTemplate()
        if (result) {
          this.$message.success('导入成功')
          this.loadData()
          this.activeTab = 'custom'
        }
      } catch (e) {
        this.$message.error('导入失败：' + e.message)
      }
    }
  }
}
</script>

<style scoped lang="scss">
.report-templates {
  padding: 24px;
  height: 100%;
  overflow: auto;
  background: $bg-color;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

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

.template-tabs {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.template-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .card-preview {
    height: 120px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;

    i {
      font-size: 48px;
      color: rgba(255, 255, 255, 0.9);
    }
  }

  .card-content {
    padding: 16px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      .template-name {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: $text-primary;
      }
    }

    .template-desc {
      font-size: 13px;
      color: $text-secondary;
      margin-bottom: 12px;
      line-height: 1.5;
      min-height: 40px;
    }

    .template-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: $text-regular;
      margin-bottom: 16px;

      span {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }

    .card-actions {
      display: flex;
      gap: 8px;
    }
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: $text-placeholder;

  i {
    font-size: 64px;
    margin-bottom: 16px;
    display: block;
  }

  p {
    font-size: 14px;
    margin-bottom: 20px;
  }
}

.preview-content {
  .preview-grid {
    position: relative;
    min-height: 500px;
    background:
      linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
    background-size: 70px 50px;
    background-color: #fafafa;
    border-radius: 8px;

    .preview-item {
      position: absolute;
      margin: 4px;
    }
  }
}
</style>
