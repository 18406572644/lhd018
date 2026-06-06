<template>
  <div class="report-designer">
    <div class="designer-header">
      <div class="header-left">
        <el-input
          v-model="reportTitle"
          placeholder="请输入报表标题"
          class="title-input"
          size="small"
        />
      </div>
      <div class="header-right">
        <el-button size="small" icon="el-icon-folder-opened" @click="showTemplateDialog = true">
          从模板创建
        </el-button>
        <el-button size="small" icon="el-icon-download" @click="handleSaveTemplate">
          保存为模板
        </el-button>
        <el-button size="small" icon="el-icon-download" @click="handleExport">
          导出
        </el-button>
        <el-button type="primary" size="small" icon="el-icon-refresh" @click="loadData">
          刷新数据
        </el-button>
      </div>
    </div>

    <div class="designer-body">
      <div class="component-library">
        <div class="library-title">组件库</div>
        <div class="component-list">
          <div
            v-for="(config, type) in COMPONENT_CONFIG"
            :key="type"
            class="component-item"
            draggable="true"
            @dragstart="handleDragStart($event, type)"
          >
            <i :class="config.icon"></i>
            <span>{{ config.name }}</span>
          </div>
        </div>
      </div>

      <div
        class="designer-canvas"
        @dragover.prevent
        @drop="handleDrop"
        ref="canvas"
      >
        <div class="canvas-grid" ref="grid">
          <div
            v-for="component in components"
            :key="component.id"
            class="grid-item"
            :class="{ 'selected': selectedComponentId === component.id }"
            :style="getGridItemStyle(component)"
            @click.stop="selectComponent(component.id)"
            draggable="true"
            @dragstart="handleItemDragStart($event, component)"
            @dragover.prevent="handleItemDragOver"
            @drop="handleItemDrop"
          >
            <div class="resize-handle" @mousedown="handleResizeStart($event, component)"></div>
            <div class="component-wrapper">
              <component
                :is="getComponentName(component.type)"
                :component="component"
                :records="records"
                :categories="categories"
                :accounts="accounts"
                :interactive="true"
                @drill-down="handleDrillDown"
              />
            </div>
          </div>
          <div v-if="components.length === 0" class="empty-canvas">
            <i class="el-icon-s-grid"></i>
            <p>从左侧拖拽组件到此处开始设计报表</p>
          </div>
        </div>
      </div>

      <div class="config-panel">
        <ComponentConfigPanel
          v-if="selectedComponent"
          :component="selectedComponent"
          :categories="categories"
          :accounts="accounts"
          @close="selectedComponentId = null"
          @update="handleComponentUpdate"
          @delete="handleComponentDelete"
        />
        <div v-else class="empty-config">
          <i class="el-icon-setting"></i>
          <p>选择组件进行配置</p>
        </div>
      </div>
    </div>

    <el-dialog
      title="选择模板"
      :visible.sync="showTemplateDialog"
      width="60%"
    >
      <div class="template-list">
        <div
          v-for="template in templates"
          :key="template.id"
          class="template-card"
          :class="{ 'selected': selectedTemplateId === template.id }"
          @click="selectedTemplateId = template.id"
        >
          <div class="template-icon">
            <i class="el-icon-document"></i>
          </div>
          <div class="template-info">
            <div class="template-name">{{ template.name }}</div>
            <div class="template-desc">{{ template.description }}</div>
            <div class="template-meta">
              <el-tag size="mini" :type="template.builtIn ? 'success' : 'info'">
                {{ template.builtIn ? '内置模板' : '自定义' }}
              </el-tag>
              <span class="component-count">{{ template.components?.length || 0 }} 个组件</span>
            </div>
          </div>
        </div>
      </div>
      <span slot="footer">
        <el-button @click="showTemplateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleUseTemplate" :disabled="!selectedTemplateId">
          使用模板
        </el-button>
      </span>
    </el-dialog>

    <el-dialog
      title="保存为模板"
      :visible.sync="showSaveTemplateDialog"
      width="400px"
    >
      <el-form label-width="80px">
        <el-form-item label="模板名称">
          <el-input v-model="newTemplateName" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            type="textarea"
            v-model="newTemplateDesc"
            placeholder="请输入模板描述"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="showSaveTemplateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmSaveTemplate">保存</el-button>
      </span>
    </el-dialog>

    <el-dialog
      title="导出报表"
      :visible.sync="showExportDialog"
      width="400px"
    >
      <el-form label-width="80px">
        <el-form-item label="导出格式">
          <el-radio-group v-model="exportFormat">
            <el-radio label="pdf">PDF</el-radio>
            <el-radio label="image">图片</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="保存路径">
          <el-input v-model="exportPath" placeholder="请选择保存目录" readonly>
            <el-button slot="append" icon="el-icon-folder" @click="handleSelectExportPath">
              选择
            </el-button>
          </el-input>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="showExportDialog = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmExport">导出</el-button>
      </span>
    </el-dialog>

    <DrillDownDialog
      :visible.sync="showDrillDown"
      :drill-data="drillData"
    />
  </div>
</template>

<script>
import {
  COMPONENT_CONFIG,
  COMPONENT_TYPES,
  createComponent,
  getReportTemplates,
  saveReportTemplate,
  generateReportFile,
  formatMoney
} from '@/utils/reportUtils'
import { recordApi, categoryApi, accountApi } from '@/api'
import ComponentConfigPanel from '@/components/report/ComponentConfigPanel.vue'
import DrillDownDialog from '@/components/report/DrillDownDialog.vue'
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

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null }

export default {
  name: 'ReportDesigner',
  components: {
    ComponentConfigPanel,
    DrillDownDialog,
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
      COMPONENT_CONFIG,
      reportTitle: '自定义报表',
      components: [],
      selectedComponentId: null,
      records: [],
      categories: [],
      accounts: [],
      templates: [],
      showTemplateDialog: false,
      selectedTemplateId: null,
      showSaveTemplateDialog: false,
      newTemplateName: '',
      newTemplateDesc: '',
      showExportDialog: false,
      exportFormat: 'pdf',
      exportPath: '',
      showDrillDown: false,
      drillData: {},
      dragComponent: null,
      resizeInfo: null,
      gridCols: 12,
      cellWidth: 80,
      cellHeight: 60
    }
  },
  computed: {
    selectedComponent() {
      return this.components.find(c => c.id === this.selectedComponentId) || null
    }
  },
  created() {
    this.loadData()
    this.loadTemplates()
  },
  mounted() {
    if (this.$route.query.templateId) {
      this.loadTemplateById(this.$route.query.templateId)
    }
  },
  methods: {
    formatMoney,
    async loadData() {
      const [records, categories, accounts] = await Promise.all([
        recordApi.getRecords(),
        categoryApi.getCategories(),
        accountApi.getAccounts()
      ])
      this.records = records || []
      this.categories = categories || []
      this.accounts = accounts || []
    },
    async loadTemplates() {
      this.templates = await getReportTemplates() || []
    },
    async loadTemplateById(templateId) {
      await this.loadTemplates()
      const template = this.templates.find(t => t.id === templateId)
      if (template) {
        this.reportTitle = template.name
        this.components = JSON.parse(JSON.stringify(template.components || []))
        this.$message.success('已加载模板：' + template.name)
      }
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
    getGridItemStyle(component) {
      return {
        left: component.x * this.cellWidth + 'px',
        top: component.y * this.cellHeight + 'px',
        width: component.w * this.cellWidth - 8 + 'px',
        height: component.h * this.cellHeight - 8 + 'px'
      }
    },
    handleDragStart(event, type) {
      event.dataTransfer.setData('componentType', type)
      event.dataTransfer.effectAllowed = 'copy'
    },
    handleDrop(event) {
      const type = event.dataTransfer.getData('componentType')
      if (!type) return

      const rect = this.$refs.grid.getBoundingClientRect()
      const x = Math.floor((event.clientX - rect.left) / this.cellWidth)
      const y = Math.floor((event.clientY - rect.top) / this.cellHeight)

      const config = COMPONENT_CONFIG[type]
      const newComponent = createComponent(type, {
        x: Math.max(0, Math.min(x, this.gridCols - config.defaultWidth)),
        y: Math.max(0, y)
      })

      this.adjustComponentPosition(newComponent)
      this.components.push(newComponent)
      this.selectedComponentId = newComponent.id
    },
    adjustComponentPosition(newComponent) {
      let maxY = 0
      this.components.forEach(comp => {
        if (comp.x < newComponent.x + newComponent.w &&
            comp.x + comp.w > newComponent.x &&
            comp.y < newComponent.y + newComponent.h &&
            comp.y + comp.h > newComponent.y) {
          maxY = Math.max(maxY, comp.y + comp.h)
        }
      })
      if (maxY > 0) {
        newComponent.y = maxY
      }
    },
    handleItemDragStart(event, component) {
      this.dragComponent = component
      event.dataTransfer.setData('componentId', component.id)
      event.dataTransfer.effectAllowed = 'move'
    },
    handleItemDragOver(event) {
      event.dataTransfer.dropEffect = 'move'
    },
    handleItemDrop(event) {
      if (!this.dragComponent) return
      event.stopPropagation()

      const targetId = event.dataTransfer.getData('componentId')
      if (!targetId || targetId === this.dragComponent.id) {
        this.dragComponent = null
        return
      }

      const targetComp = this.components.find(c => c.id === targetId)
      if (targetComp) {
        const tempX = this.dragComponent.x
        const tempY = this.dragComponent.y
        this.dragComponent.x = targetComp.x
        this.dragComponent.y = targetComp.y
        targetComp.x = tempX
        targetComp.y = tempY
      }

      this.dragComponent = null
    },
    handleResizeStart(event, component) {
      event.stopPropagation()
      this.resizeInfo = {
        component,
        startX: event.clientX,
        startY: event.clientY,
        startW: component.w,
        startH: component.h
      }

      document.addEventListener('mousemove', this.handleResize)
      document.addEventListener('mouseup', this.handleResizeEnd)
    },
    handleResize(event) {
      if (!this.resizeInfo) return

      const deltaX = event.clientX - this.resizeInfo.startX
      const deltaY = event.clientY - this.resizeInfo.startY

      const newW = Math.max(1, Math.round(deltaX / this.cellWidth) + this.resizeInfo.startW)
      const newH = Math.max(1, Math.round(deltaY / this.cellHeight) + this.resizeInfo.startH)

      this.resizeInfo.component.w = Math.min(newW, this.gridCols - this.resizeInfo.component.x)
      this.resizeInfo.component.h = newH
    },
    handleResizeEnd() {
      this.resizeInfo = null
      document.removeEventListener('mousemove', this.handleResize)
      document.removeEventListener('mouseup', this.handleResizeEnd)
    },
    selectComponent(id) {
      this.selectedComponentId = id
    },
    handleComponentUpdate(updatedComponent) {
      const index = this.components.findIndex(c => c.id === updatedComponent.id)
      if (index !== -1) {
        this.$set(this.components, index, JSON.parse(JSON.stringify(updatedComponent)))
      }
    },
    handleComponentDelete(id) {
      this.$confirm('确定要删除该组件吗？', '提示', {
        type: 'warning'
      }).then(() => {
        this.components = this.components.filter(c => c.id !== id)
        if (this.selectedComponentId === id) {
          this.selectedComponentId = null
        }
        this.$message.success('删除成功')
      }).catch(() => {})
    },
    handleDrillDown(data) {
      this.drillData = data
      this.showDrillDown = true
    },
    handleSaveTemplate() {
      if (this.components.length === 0) {
        this.$message.warning('请先添加组件')
        return
      }
      this.newTemplateName = this.reportTitle
      this.newTemplateDesc = ''
      this.showSaveTemplateDialog = true
    },
    async handleConfirmSaveTemplate() {
      if (!this.newTemplateName.trim()) {
        this.$message.warning('请输入模板名称')
        return
      }

      const template = {
        name: this.newTemplateName,
        description: this.newTemplateDesc,
        components: JSON.parse(JSON.stringify(this.components)),
        title: this.reportTitle
      }

      const result = await saveReportTemplate(template)
      if (result) {
        this.$message.success('保存成功')
        this.showSaveTemplateDialog = false
        this.loadTemplates()
      }
    },
    handleUseTemplate() {
      const template = this.templates.find(t => t.id === this.selectedTemplateId)
      if (template) {
        this.reportTitle = template.name
        this.components = JSON.parse(JSON.stringify(template.components || []))
        this.selectedComponentId = null
        this.showTemplateDialog = false
        this.$message.success('已应用模板')
      }
    },
    handleExport() {
      if (this.components.length === 0) {
        this.$message.warning('请先添加组件')
        return
      }
      this.showExportDialog = true
    },
    async handleSelectExportPath() {
      if (!ipcRenderer) return
      const result = await ipcRenderer.invoke('show-open-dialog', {
        properties: ['openDirectory']
      })
      if (result && !result.canceled && result.filePaths.length > 0) {
        this.exportPath = result.filePaths[0]
      }
    },
    async handleConfirmExport() {
      if (!this.exportPath) {
        this.$message.warning('请选择保存路径')
        return
      }

      const reportData = {
        title: this.reportTitle,
        components: this.components,
        records: this.records,
        categories: this.categories,
        accounts: this.accounts
      }

      try {
        this.$message.info('正在生成报表...')
        const result = await generateReportFile({
          format: this.exportFormat,
          outputPath: this.exportPath,
          reportData
        })
        if (result) {
          this.$message.success(`导出成功：${result}`)
          this.showExportDialog = false
        }
      } catch (e) {
        this.$message.error('导出失败：' + e.message)
      }
    }
  }
}
</script>

<style scoped lang="scss">
.report-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
}

.designer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;

  .title-input {
    width: 300px;
    ::v-deep .el-input__inner {
      font-size: 16px;
      font-weight: 600;
    }
  }

  .header-right {
    display: flex;
    gap: 8px;
  }
}

.designer-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.component-library {
  width: 200px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  .library-title {
    padding: 16px;
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    border-bottom: 1px solid #f0f2f5;
  }

  .component-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;

    .component-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      margin-bottom: 8px;
      background: #f5f7fa;
      border-radius: 8px;
      cursor: grab;
      transition: all 0.2s ease;

      &:hover {
        background: #ecf5ff;
        transform: translateX(4px);
      }

      &:active {
        cursor: grabbing;
      }

      i {
        font-size: 18px;
        color: #409eff;
      }

      span {
        font-size: 13px;
        color: #606266;
      }
    }
  }
}

.designer-canvas {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: #f0f2f5;

  .canvas-grid {
    position: relative;
    min-height: 100%;
    background:
      linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
    background-size: 80px 60px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

    .grid-item {
      position: absolute;
      margin: 4px;
      background: #fff;
      border-radius: 8px;
      border: 2px solid transparent;
      transition: border-color 0.2s ease;
      cursor: move;

      &.selected {
        border-color: #409eff;
        box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
      }

      .resize-handle {
        position: absolute;
        right: -4px;
        bottom: -4px;
        width: 16px;
        height: 16px;
        background: #409eff;
        border: 2px solid #fff;
        border-radius: 50%;
        cursor: se-resize;
        z-index: 10;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      &:hover .resize-handle,
      &.selected .resize-handle {
        opacity: 1;
      }

      .component-wrapper {
        width: 100%;
        height: 100%;
        overflow: hidden;
        border-radius: 6px;
      }
    }

    .empty-canvas {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #c0c4cc;

      i {
        font-size: 64px;
        margin-bottom: 16px;
        display: block;
      }

      p {
        font-size: 14px;
        margin: 0;
      }
    }
  }
}

.config-panel {
  width: 320px;
  background: #fff;
  border-left: 1px solid #e4e7ed;
  flex-shrink: 0;
  overflow: hidden;

  .empty-config {
    height: 100%;
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

.template-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;

  .template-card {
    padding: 16px;
    border: 2px solid #e4e7ed;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: #409eff;
      background: #f5faff;
    }

    &.selected {
      border-color: #409eff;
      background: #ecf5ff;
    }

    .template-icon {
      font-size: 32px;
      color: #409eff;
      margin-bottom: 12px;
    }

    .template-info {
      .template-name {
        font-size: 14px;
        font-weight: 600;
        color: #303133;
        margin-bottom: 6px;
      }

      .template-desc {
        font-size: 12px;
        color: #909399;
        margin-bottom: 12px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .template-meta {
        display: flex;
        align-items: center;
        gap: 8px;

        .component-count {
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }
}
</style>
