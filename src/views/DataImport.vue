<template>
  <div class="data-import-page">
    <el-card class="step-card">
      <div class="steps-container">
        <el-steps :active="currentStep" finish-status="success" align-center>
          <el-step title="选择文件" icon="el-icon-folder-opened"></el-step>
          <el-step title="字段映射" icon="el-icon-s-operation"></el-step>
          <el-step title="数据预览" icon="el-icon-view"></el-step>
          <el-step title="开始导入" icon="el-icon-upload2"></el-step>
        </el-steps>
      </div>
    </el-card>

    <el-card v-if="currentStep === 0" class="content-card">
      <div slot="header" class="card-header">
        <span>选择导入文件</span>
      </div>
      
      <div class="file-upload-area" @click="selectFile">
        <i class="el-icon-upload"></i>
        <p class="upload-text">点击选择文件</p>
        <p class="upload-hint">支持 CSV、Excel (.xlsx/.xls) 格式</p>
        <p class="upload-hint">支持随手记、挖财、鲨鱼记账、支付宝、微信等导出文件</p>
      </div>
      
      <div v-if="selectedFile" class="file-info">
        <el-alert 
          :title="`已选择文件: ${selectedFile.name}`"
          :type="parseResult ? 'success' : 'info'"
          :show-icon="true">
          <span slot="title">
            <i class="el-icon-document"></i>
            {{ selectedFile.name }}
            <span class="file-size">({{ formatFileSize(selectedFile.size) }})</span>
            <span v-if="detectedSoftware" class="software-tag">
              {{ getSoftwareIcon(detectedSoftware) }} {{ detectedSoftware }}
            </span>
          </span>
        </el-alert>
        
        <el-alert 
          v-if="parseResult && parseResult.filteredRowCount > 0"
          type="info" 
          show-icon
          :closable="false"
          style="margin-top: 16px;">
          <div slot="title">
            <i class="el-icon-info"></i>
            已自动过滤 <strong>{{ parseResult.filteredRowCount }}</strong> 条无效记录
            <span style="color: #909399; font-size: 12px; margin-left: 8px;">
              （包括已退款、已关闭、交易失败等）
            </span>
          </div>
        </el-alert>
        
        <div v-if="parseResult && !isParsing" class="parse-summary">
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ parseResult.totalRows }}</div>
                <div class="stat-label">有效数据</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item filtered" v-if="parseResult.originalRowCount">
                <div class="stat-value">{{ parseResult.originalRowCount }}</div>
                <div class="stat-label">原始记录</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ parseResult.headers.length }}</div>
                <div class="stat-label">字段数</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-value">
                  {{ Object.keys(parseResult.autoMapping).filter(k => parseResult.autoMapping[k]).length }}
                </div>
                <div class="stat-label">已自动映射</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
      
      <div v-if="isParsing" class="parsing-loading">
        <el-progress type="dashboard" :percentage="parseProgress" :width="100"></el-progress>
        <p class="loading-text">正在解析文件...</p>
      </div>
      
      <div slot="footer" class="card-footer">
        <el-button type="primary" @click="goToStep(1)" :disabled="!parseResult">
          下一步：字段映射
          <i class="el-icon-arrow-right el-icon--right"></i>
        </el-button>
      </div>
    </el-card>

    <el-card v-if="currentStep === 1" class="content-card">
      <div slot="header" class="card-header">
        <span>字段映射</span>
        <div class="header-actions">
          <el-select 
            v-model="selectedTemplate" 
            placeholder="选择模板" 
            clearable 
            style="width: 200px; margin-right: 10px;"
            @change="applyTemplate">
            <el-option 
              v-for="template in templates" 
              :key="template.id" 
              :label="template.name" 
              :value="template">
            </el-option>
          </el-select>
          <el-button type="text" icon="el-icon-folder-opened" @click="loadTemplates">
            刷新模板
          </el-button>
          <el-button type="text" icon="el-icon-save" @click="showSaveTemplateDialog">
            保存为模板
          </el-button>
        </div>
      </div>
      
      <el-alert 
        v-if="mappingErrors.length > 0"
        type="error" 
        show-icon>
        <div v-for="(error, index) in mappingErrors" :key="index">
          {{ error }}
        </div>
      </el-alert>
      
      <div class="field-mapping-table">
        <el-table :data="mappingFields" border stripe>
          <el-table-column label="目标字段" width="150">
            <template slot-scope="scope">
              <span class="field-label">
                {{ scope.row.label }}
                <span v-if="scope.row.required" class="required-tag">必填</span>
              </span>
            </template>
          </el-table-column>
          <el-table-column label="源文件字段">
            <template slot-scope="scope">
              <el-select 
                v-model="fieldMapping[scope.row.field]" 
                placeholder="请选择字段" 
                clearable 
                style="width: 100%"
                @change="onMappingChange">
                <el-option 
                  v-for="header in parseResult.headers" 
                  :key="header" 
                  :label="header" 
                  :value="header">
                </el-option>
              </el-select>
              <div v-if="fieldMapping[scope.row.field]" class="sample-data">
                示例: {{ getSampleData(fieldMapping[scope.row.field]) }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="自动匹配" width="100" align="center">
            <template slot-scope="scope">
              <el-tag 
                v-if="parseResult.autoMapping[scope.row.field] === fieldMapping[scope.row.field]"
                type="success" 
                size="mini">
                已匹配
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div class="default-settings">
        <h4>默认设置</h4>
        <el-form :inline="true" class="default-form">
          <el-form-item label="默认账户">
            <el-select 
              v-model="defaultAccountId" 
              placeholder="选择默认账户" 
              clearable>
              <el-option 
                v-for="account in accounts" 
                :key="account.id" 
                :label="`${account.icon} ${account.name}`" 
                :value="account.id">
              </el-option>
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      
      <div slot="footer" class="card-footer">
        <el-button @click="goToStep(0)">
          <i class="el-icon-arrow-left el-icon--left"></i>
          上一步
        </el-button>
        <el-button type="primary" @click="goToStep(2)" :disabled="mappingErrors.length > 0">
          下一步：数据预览
          <i class="el-icon-arrow-right el-icon--right"></i>
        </el-button>
      </div>
    </el-card>

    <el-card v-if="currentStep === 2" class="content-card">
      <div slot="header" class="card-header">
        <span>数据预览</span>
        <div class="header-actions">
          <el-button 
            type="text" 
            icon="el-icon-refresh" 
            @click="generatePreview"
            :loading="isPreviewing">
            刷新预览
          </el-button>
        </div>
      </div>
      
      <el-alert 
        v-if="previewErrors.length > 0"
        type="error" 
        show-icon
        :closable="false">
        <div>{{ previewErrors.length }} 条错误记录将被跳过</div>
      </el-alert>
      
      <el-alert 
        v-if="previewWarnings.length > 0"
        type="warning" 
        show-icon
        :closable="false">
        <div>{{ previewWarnings.length }} 条警告</div>
        <div slot="title">
          <el-button type="text" size="mini" @click="showWarningsDialog">
            查看详情
          </el-button>
        </div>
      </el-alert>
      
      <div v-if="isPreviewing" class="preview-loading">
        <el-progress type="dashboard" :percentage="previewProgress" :width="100"></el-progress>
        <p class="loading-text">正在生成预览...</p>
      </div>
      
      <div v-else-if="previewRecords.length > 0" class="preview-summary">
        <el-row :gutter="20">
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-value">{{ previewRecords.length }}</div>
              <div class="stat-label">总记录数</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item income">
              <div class="stat-value">{{ incomeCount }}</div>
              <div class="stat-label">收入</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item expense">
              <div class="stat-value">{{ expenseCount }}</div>
              <div class="stat-label">支出</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-value">
                {{ totalAmount.toFixed(2) }}
              </div>
              <div class="stat-label">总金额</div>
            </div>
          </el-col>
        </el-row>
      </div>
      
      <div v-if="duplicateCheckResult && !isCheckingDuplicates" class="duplicate-info">
        <el-alert 
          v-if="duplicateCount > 0"
          type="warning" 
          show-icon>
          <div slot="title">
            检测到 {{ duplicateCount }} 条可能重复的记录
            <el-radio-group v-model="duplicateAction" size="mini" style="margin-left: 20px;">
              <el-radio-button label="skip">跳过</el-radio-button>
              <el-radio-button label="overwrite">覆盖</el-radio-button>
            </el-radio-group>
            <el-button 
              type="text" 
              size="mini" 
              @click="showDuplicatesDialog">
              查看重复记录
            </el-button>
          </div>
        </el-alert>
        <el-alert v-else type="success" show-icon>
          未检测到重复记录
        </el-alert>
      </div>
      
      <el-progress 
        v-if="isCheckingDuplicates" 
        :percentage="duplicateCheckProgress"></el-progress>
      
      <div v-if="previewRecords.length > 0 && !isPreviewing" class="preview-table">
        <el-table 
          :data="displayPreviewRecords" 
          border 
          stripe
          max-height="400">
          <el-table-column label="序号" width="60" type="index"></el-table-column>
          <el-table-column label="日期" width="120" prop="date">
            <template slot-scope="scope">
              <span :class="{ 'error-text': !scope.row.date }">
                {{ scope.row.date || '无日期' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="80">
            <template slot-scope="scope">
              <el-tag :type="scope.row.type === 'income' ? 'success' : 'danger'" size="mini">
                {{ scope.row.type === 'income' ? '收入' : '支出' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="分类" prop="categoryName" width="120">
            <template slot-scope="scope">
              <span :class="{ 'warning-text': !scope.row.categoryId }">
                {{ scope.row.categoryName || '未分类' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="金额" width="100" align="right">
            <template slot-scope="scope">
              <span 
                :class="{ 
                  'error-text': scope.row.amount <= 0, 
                  'income-text': scope.row.type === 'income',
                  'expense-text': scope.row.type === 'expense'
                }">
                {{ scope.row.amount.toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="账户" prop="accountName" width="100"></el-table-column>
          <el-table-column label="备注" prop="remark" show-overflow-tooltip></el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template slot-scope="scope">
              <el-tooltip 
                v-if="isRowDuplicate(scope.$index)" 
                content="可能重复" 
                placement="top">
                <i class="el-icon-warning" style="color: #e6a23c;"></i>
              </el-tooltip>
              <el-tooltip 
                v-else-if="scope.row.amount <= 0 || !scope.row.date" 
                content="数据异常" 
                placement="top">
                <i class="el-icon-circle-close" style="color: #f56c6c;"></i>
              </el-tooltip>
              <el-tooltip v-else content="正常" placement="top">
                <i class="el-icon-circle-check" style="color: #67c23a;"></i>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="pagination">
          <el-pagination
            background
            layout="prev, pager, next, jumper"
            :total="previewRecords.length"
            :page-size="20"
            :current-page.sync="currentPreviewPage">
          </el-pagination>
        </div>
      </div>
      
      <div slot="footer" class="card-footer">
        <el-button @click="goToStep(1)">
          <i class="el-icon-arrow-left el-icon--left"></i>
          上一步
        </el-button>
        <el-button 
          type="primary" 
          @click="goToStep(3)" 
          :disabled="validRecords.length === 0 || isCheckingDuplicates">
          下一步：开始导入
          <i class="el-icon-arrow-right el-icon--right"></i>
        </el-button>
      </div>
    </el-card>

    <el-card v-if="currentStep === 3" class="content-card">
      <div slot="header" class="card-header">
        <span>开始导入</span>
      </div>
      
      <div class="import-summary">
        <h3>导入摘要</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="导入文件">{{ selectedFile?.name }}</el-descriptions-item>
          <el-descriptions-item label="数据来源">{{ detectedSoftware || '自动识别' }}</el-descriptions-item>
          <el-descriptions-item label="导入记录数">
            <span class="highlight">{{ importRecords.length }}</span> 条
          </el-descriptions-item>
          <el-descriptions-item label="其中收入">
            <span class="income-text">{{ incomeCount }}</span> 条
          </el-descriptions-item>
          <el-descriptions-item label="其中支出">
            <span class="expense-text">{{ expenseCount }}</span> 条
          </el-descriptions-item>
          <el-descriptions-item label="总金额">
            ¥{{ totalAmount.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="重复处理">
            {{ duplicateAction === 'skip' ? '跳过重复' : '覆盖重复' }}
            <span v-if="duplicateCount > 0">({{ duplicateCount }} 条重复)</span>
          </el-descriptions-item>
          <el-descriptions-item label="跳过错误">
            {{ previewErrors.length }} 条
          </el-descriptions-item>
        </el-descriptions>
      </div>
      
      <div v-if="!isImporting && !importResult" class="import-warning">
        <el-alert 
          type="info" 
          show-icon>
          <div slot="title">
            <i class="el-icon-info"></i>
            导入完成后 <strong>30分钟内</strong> 可撤销本次导入
          </div>
        </el-alert>
      </div>
      
      <div v-if="isImporting" class="import-progress">
        <el-progress 
          :percentage="importProgress" 
          :status="importProgress === 100 ? 'success' : ''"
          stroke-width="20">
          <span style="font-size: 24px;">{{ importProgress }}%</span>
        </el-progress>
        <p class="progress-text">
          正在导入... {{ importedCount }} / {{ importRecords.length }}
        </p>
        <el-button @click="cancelImport" type="danger" plain>
          取消导入
        </el-button>
      </div>
      
      <div v-if="importResult" class="import-result">
        <el-alert 
          :type="importResult.success ? 'success' : 'error'" 
          show-icon>
          <div slot="title">
            <template v-if="importResult.success">
              <i class="el-icon-circle-check"></i>
              导入成功！共导入 <strong>{{ importResult.importedCount }}</strong> 条记录
            </template>
            <template v-else-if="importResult.canceled">
              <i class="el-icon-circle-close"></i>
              导入已取消
            </template>
            <template v-else>
              <i class="el-icon-circle-close"></i>
              导入失败：{{ importResult.error }}
            </template>
          </div>
        </el-alert>
        
        <div v-if="importResult.success && importResult.canRollback" class="rollback-section">
          <el-alert type="warning" show-icon>
            <div slot="title">
              <i class="el-icon-time"></i>
              回滚有效期剩余：<strong>{{ rollbackTimeRemaining }}</strong>
            </div>
          </el-alert>
          <el-button 
            type="danger" 
            icon="el-icon-refresh-left" 
            @click="confirmRollback">
            撤销本次导入
          </el-button>
        </div>
      </div>
      
      <div slot="footer" class="card-footer">
        <el-button v-if="!isImporting && !importResult" @click="goToStep(2)">
          <i class="el-icon-arrow-left el-icon--left"></i>
          上一步
        </el-button>
        <el-button 
          v-if="!isImporting && !importResult"
          type="primary" 
          icon="el-icon-upload2" 
          @click="startImport">
          开始导入
        </el-button>
        <el-button 
          v-if="importResult"
          type="primary" 
          @click="resetImport">
          继续导入新文件
        </el-button>
      </div>
    </el-card>

    <el-dialog 
      title="保存模板" 
      :visible.sync="saveTemplateDialogVisible" 
      width="400px">
      <el-form :model="templateForm" label-width="80px">
        <el-form-item label="模板名称">
          <el-input 
            v-model="templateForm.name" 
            placeholder="请输入模板名称"
            maxlength="50"></el-input>
        </el-form-item>
        <el-form-item label="备注">
          <el-input 
            v-model="templateForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="可选，描述模板用途"
            maxlength="200"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="saveTemplateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate" :disabled="!templateForm.name">保存</el-button>
      </div>
    </el-dialog>

    <el-dialog 
      title="警告详情" 
      :visible.sync="warningsDialogVisible" 
      width="600px">
      <div class="warnings-list">
        <div 
          v-for="(warning, index) in previewWarnings.slice(0, 100)" 
          :key="index" 
          class="warning-item">
          <i class="el-icon-warning" style="color: #e6a23c; margin-right: 8px;"></i>
          {{ warning }}
        </div>
        <div v-if="previewWarnings.length > 100" class="more-warnings">
          ... 还有 {{ previewWarnings.length - 100 }} 条警告
        </div>
      </div>
      <div slot="footer">
        <el-button type="primary" @click="warningsDialogVisible = false">关闭</el-button>
      </div>
    </el-dialog>

    <el-dialog 
      title="重复记录" 
      :visible.sync="duplicatesDialogVisible" 
      width="800px">
      <el-table 
        :data="duplicateRecords" 
        border 
        max-height="400">
        <el-table-column label="序号" width="60" type="index"></el-table-column>
        <el-table-column label="日期" prop="date" width="120"></el-table-column>
        <el-table-column label="类型" width="80">
          <template slot-scope="scope">
            <el-tag :type="scope.row.record.type === 'income' ? 'success' : 'danger'" size="mini">
              {{ scope.row.record.type === 'income' ? '收入' : '支出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分类" prop="record.categoryName" width="120"></el-table-column>
        <el-table-column label="金额" width="100" align="right">
          <template slot-scope="scope">
            {{ Number(scope.row.record.amount).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="record.remark" show-overflow-tooltip></el-table-column>
      </el-table>
      <div slot="footer">
        <el-button type="primary" @click="duplicatesDialogVisible = false">关闭</el-button>
      </div>
    </el-dialog>

    <el-dialog 
      title="撤销导入" 
      :visible.sync="rollbackConfirmVisible" 
      width="400px">
      <div class="rollback-confirm">
        <i class="el-icon-warning" style="font-size: 48px; color: #e6a23c;"></i>
        <p>确定要撤销本次导入吗？</p>
        <p class="rollback-info">
          将删除本次导入的 <strong>{{ importResult?.importedCount }}</strong> 条记录
        </p>
      </div>
      <div slot="footer">
        <el-button @click="rollbackConfirmVisible = false">取消</el-button>
        <el-button type="danger" @click="doRollback">确认撤销</el-button>
      </div>
    </el-dialog>

    <input 
      type="file" 
      ref="fileInput" 
      style="display: none" 
      accept=".csv,.xlsx,.xls"
      @change="onFileSelected">
  </div>
</template>

<script>
import { importApi, categoryApi, accountApi } from '@/api'
import { 
  FIELD_LABELS, 
  REQUIRED_FIELDS, 
  formatSeconds,
  getFieldOptions,
  validateMapping,
  getSoftwareIcon,
  normalizeTypeDisplay
} from '@/utils/import'

export default {
  name: 'DataImport',
  data() {
    return {
      currentStep: 0,
      selectedFile: null,
      isParsing: false,
      parseProgress: 0,
      parseResult: null,
      detectedSoftware: null,
      fieldMapping: {},
      mappingErrors: [],
      templates: [],
      selectedTemplate: null,
      saveTemplateDialogVisible: false,
      templateForm: {
        name: '',
        description: ''
      },
      accounts: [],
      categories: [],
      defaultAccountId: '',
      previewRecords: [],
      previewErrors: [],
      previewWarnings: [],
      isPreviewing: false,
      previewProgress: 0,
      currentPreviewPage: 1,
      duplicateCheckResult: null,
      duplicateCount: 0,
      duplicateAction: 'skip',
      isCheckingDuplicates: false,
      duplicateCheckProgress: 0,
      duplicatesDialogVisible: false,
      warningsDialogVisible: false,
      isImporting: false,
      importProgress: 0,
      importedCount: 0,
      importResult: null,
      importTaskId: null,
      rollbackConfirmVisible: false,
      rollbackTimeRemaining: '',
      rollbackTimer: null
    }
  },
  computed: {
    mappingFields() {
      return Object.keys(FIELD_LABELS).map(field => ({
        field,
        label: FIELD_LABELS[field],
        required: REQUIRED_FIELDS.includes(field)
      }))
    },
    validRecords() {
      return this.previewRecords.filter(r => r.date && r.amount > 0)
    },
    importRecords() {
      let records = this.validRecords
      if (this.duplicateAction === 'skip' && this.duplicateCheckResult) {
        records = records.filter((_, index) => !this.isRowDuplicate(index))
      }
      return records
    },
    incomeCount() {
      return this.importRecords.filter(r => r.type === 'income').length
    },
    expenseCount() {
      return this.importRecords.filter(r => r.type === 'expense').length
    },
    totalAmount() {
      return this.importRecords.reduce((sum, r) => sum + Number(r.amount), 0)
    },
    displayPreviewRecords() {
      const start = (this.currentPreviewPage - 1) * 20
      const end = start + 20
      return this.previewRecords.slice(start, end)
    },
    duplicateRecords() {
      if (!this.duplicateCheckResult) return []
      return this.duplicateCheckResult.filter(d => d.isDuplicate)
    }
  },
  created() {
    this.loadBaseData()
    this.loadTemplates()
    this.setupProgressListener()
  },
  beforeDestroy() {
    if (this.rollbackTimer) {
      clearInterval(this.rollbackTimer)
    }
  },
  methods: {
    async loadBaseData() {
      try {
        const [categories, accounts] = await Promise.all([
          categoryApi.getCategories(),
          accountApi.getAccounts()
        ])
        this.categories = categories
        this.accounts = accounts
        if (accounts.length > 0) {
          this.defaultAccountId = accounts[0].id
        }
      } catch (error) {
        console.error('Load base data error:', error)
      }
    },
    async loadTemplates() {
      try {
        this.templates = await importApi.getTemplates()
      } catch (error) {
        console.error('Load templates error:', error)
        this.templates = []
      }
    },
    selectFile() {
      this.$refs.fileInput.click()
    },
    async onFileSelected(event) {
      const file = event.target.files[0]
      if (!file) return
      
      this.selectedFile = file
      this.isParsing = true
      this.parseProgress = 0
      this.parseResult = null
      
      try {
        const result = await importApi.parseFile(file.path)
        
        if (result.success) {
          this.parseResult = result.data
          this.detectedSoftware = result.data.software
          this.fieldMapping = { ...result.data.autoMapping }
          this.onMappingChange()
        } else {
          this.$message.error(result.error || '文件解析失败')
        }
      } catch (error) {
        console.error('Parse file error:', error)
        this.$message.error('文件解析失败')
      } finally {
        this.isParsing = false
        this.parseProgress = 100
      }
      
      this.$refs.fileInput.value = ''
    },
    goToStep(step) {
      if (step === 2 && this.currentStep === 1) {
        this.generatePreview()
      }
      this.currentStep = step
    },
    onMappingChange() {
      this.mappingErrors = validateMapping(this.fieldMapping)
    },
    applyTemplate(template) {
      if (template && template.fieldMapping) {
        this.fieldMapping = { ...template.fieldMapping }
        if (template.defaultAccountId) {
          this.defaultAccountId = template.defaultAccountId
        }
        this.onMappingChange()
      }
    },
    showSaveTemplateDialog() {
      this.templateForm = { name: '', description: '' }
      if (this.detectedSoftware) {
        this.templateForm.name = this.detectedSoftware + '导入模板'
      }
      this.saveTemplateDialogVisible = true
    },
    async saveTemplate() {
      const defaultAccount = this.accounts.find(a => a.id === this.defaultAccountId)
      
      const template = {
        name: this.templateForm.name,
        description: this.templateForm.description,
        fieldMapping: { ...this.fieldMapping },
        defaultAccountId: this.defaultAccountId,
        defaultAccountName: defaultAccount?.name,
        software: this.detectedSoftware,
        headers: this.parseResult.headers
      }
      
      try {
        const saved = await importApi.saveTemplate(template)
        this.templates.push(saved)
        this.saveTemplateDialogVisible = false
        this.$message.success('模板保存成功')
      } catch (error) {
        console.error('Save template error:', error)
        this.$message.error('模板保存失败')
      }
    },
    getSampleData(header) {
      if (!this.parseResult || this.parseResult.rows.length === 0) return ''
      return this.parseResult.rows[0][header] || ''
    },
    async generatePreview() {
      this.isPreviewing = true
      this.previewProgress = 0
      this.previewRecords = []
      this.previewErrors = []
      this.previewWarnings = []
      
      const defaultAccount = this.accounts.find(a => a.id === this.defaultAccountId)
      
      try {
        const result = await importApi.previewData({
          rows: this.parseResult.rows,
          fieldMapping: this.fieldMapping,
          categories: this.categories,
          accounts: this.accounts,
          defaultAccountId: this.defaultAccountId,
          defaultAccountName: defaultAccount?.name
        })
        
        this.previewRecords = result.records
        this.previewErrors = result.errors
        this.previewWarnings = result.warnings
        this.previewProgress = 100
        
        this.checkDuplicates()
      } catch (error) {
        console.error('Preview data error:', error)
        this.$message.error('生成预览失败')
      } finally {
        this.isPreviewing = false
      }
    },
    async checkDuplicates() {
      this.isCheckingDuplicates = true
      this.duplicateCheckProgress = 0
      
      try {
        const result = await importApi.checkDuplicates(this.previewRecords)
        this.duplicateCheckResult = result
        this.duplicateCount = result.filter(d => d.isDuplicate).length
        this.duplicateCheckProgress = 100
      } catch (error) {
        console.error('Check duplicates error:', error)
        this.$message.error('重复检测失败')
      } finally {
        this.isCheckingDuplicates = false
      }
    },
    isRowDuplicate(index) {
      if (!this.duplicateCheckResult) return false
      return this.duplicateCheckResult[index]?.isDuplicate || false
    },
    showWarningsDialog() {
      this.warningsDialogVisible = true
    },
    showDuplicatesDialog() {
      this.duplicatesDialogVisible = true
    },
    setupProgressListener() {
      if (window.require) {
        const { ipcRenderer } = window.require('electron')
        ipcRenderer.on('import-progress', (event, data) => {
          this.importProgress = data.progress
          this.importedCount = data.processed
        })
      }
    },
    async startImport() {
      if (this.importRecords.length === 0) {
        this.$message.warning('没有可导入的记录')
        return
      }
      
      this.isImporting = true
      this.importProgress = 0
      this.importedCount = 0
      
      try {
        const result = await importApi.startImport({
          records: this.importRecords,
          categories: this.categories
        })
        
        this.importResult = result
        
        if (result.success) {
          this.$message.success(`成功导入 ${result.importedCount} 条记录`)
          this.importTaskId = result.importTaskId
          this.startRollbackTimer()
        } else if (result.canceled) {
          this.$message.info('导入已取消')
        } else {
          this.$message.error(result.error || '导入失败')
        }
      } catch (error) {
        console.error('Import error:', error)
        this.importResult = { success: false, error: error.message }
        this.$message.error('导入失败')
      } finally {
        this.isImporting = false
      }
    },
    async cancelImport() {
      if (!this.importTaskId) return
      
      try {
        await importApi.cancelImport(this.importTaskId)
      } catch (error) {
        console.error('Cancel import error:', error)
      }
    },
    startRollbackTimer() {
      if (this.rollbackTimer) {
        clearInterval(this.rollbackTimer)
      }
      
      const updateTime = () => {
        if (!this.importResult?.rollbackExpiresAt) return
        
        const expiresAt = new Date(this.importResult.rollbackExpiresAt)
        const now = new Date()
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))
        
        if (remaining > 0) {
          this.rollbackTimeRemaining = formatSeconds(remaining)
        } else {
          this.rollbackTimeRemaining = '已过期'
          this.importResult.canRollback = false
          clearInterval(this.rollbackTimer)
        }
      }
      
      updateTime()
      this.rollbackTimer = setInterval(updateTime, 1000)
    },
    confirmRollback() {
      this.rollbackConfirmVisible = true
    },
    async doRollback() {
      if (!this.importTaskId) return
      
      try {
        const result = await importApi.rollbackImport(this.importTaskId)
        
        if (result.success) {
          this.$message.success(`已撤销 ${result.rollbackCount} 条记录`)
          this.rollbackConfirmVisible = false
          this.importResult.canRollback = false
          
          if (this.rollbackTimer) {
            clearInterval(this.rollbackTimer)
          }
        } else {
          this.$message.error(result.error || '撤销失败')
        }
      } catch (error) {
        console.error('Rollback error:', error)
        this.$message.error('撤销失败')
      }
    },
    resetImport() {
      this.currentStep = 0
      this.selectedFile = null
      this.parseResult = null
      this.detectedSoftware = null
      this.fieldMapping = {}
      this.previewRecords = []
      this.previewErrors = []
      this.previewWarnings = []
      this.duplicateCheckResult = null
      this.importResult = null
      this.importTaskId = null
      this.importProgress = 0
      this.importedCount = 0
      
      if (this.rollbackTimer) {
        clearInterval(this.rollbackTimer)
      }
    },
    formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    },
    getSoftwareIcon
  }
}
</script>

<style lang="scss" scoped>
.data-import-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.step-card {
  margin-bottom: 20px;
  
  .steps-container {
    max-width: 800px;
    margin: 0 auto;
  }
}

.content-card {
  max-width: 1000px;
  margin: 0 auto;
  margin-bottom: 20px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .header-actions {
      display: flex;
      align-items: center;
    }
  }
  
  .card-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 20px;
    border-top: 1px solid #ebeef5;
  }
}

.file-upload-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 60px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 20px;
  
  &:hover {
    border-color: #409eff;
    background: #f5faff;
  }
  
  i {
    font-size: 48px;
    color: #c0c4cc;
    margin-bottom: 16px;
  }
  
  .upload-text {
    font-size: 18px;
    color: #303133;
    margin: 0 0 8px 0;
  }
  
  .upload-hint {
    font-size: 14px;
    color: #909399;
    margin: 4px 0;
  }
}

.file-info {
  margin-bottom: 20px;
  
  .file-size {
    color: #909399;
    font-size: 12px;
    margin-left: 8px;
  }
  
  .software-tag {
    margin-left: 16px;
    padding: 2px 8px;
    background: #ecf5ff;
    color: #409eff;
    border-radius: 4px;
    font-size: 12px;
  }
}

.parse-summary {
  margin-top: 20px;
  
  .stat-item {
    text-align: center;
    padding: 16px;
    background: #f5f7fa;
    border-radius: 8px;
    
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #303133;
      margin-bottom: 4px;
    }
    
    .stat-label {
      font-size: 14px;
      color: #909399;
    }
    
    &.income .stat-value {
      color: #67c23a;
    }
    
    &.expense .stat-value {
      color: #f56c6c;
    }
  }
}

.parsing-loading, .preview-loading {
  text-align: center;
  padding: 40px;
  
  .loading-text {
    margin-top: 16px;
    color: #909399;
  }
}

.field-mapping-table {
  margin-bottom: 20px;
  
  .field-label {
    font-weight: 500;
    
    .required-tag {
      color: #f56c6c;
      font-size: 12px;
      margin-left: 4px;
    }
  }
  
  .sample-data {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 400px;
  }
}

.default-settings {
  margin-top: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  
  h4 {
    margin: 0 0 12px 0;
    color: #303133;
  }
  
  .default-form {
    margin: 0;
  }
}

.preview-summary {
  margin-bottom: 20px;
  
  .stat-item {
    text-align: center;
    padding: 16px;
    background: #f5f7fa;
    border-radius: 8px;
    
    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #303133;
      margin-bottom: 4px;
    }
    
    .stat-label {
      font-size: 13px;
      color: #909399;
    }
    
    &.income .stat-value {
      color: #67c23a;
    }
    
    &.expense .stat-value {
      color: #f56c6c;
    }
  }
}

.duplicate-info {
  margin-bottom: 20px;
}

.preview-table {
  .error-text {
    color: #f56c6c;
  }
  
  .warning-text {
    color: #e6a23c;
  }
  
  .income-text {
    color: #67c23a;
  }
  
  .expense-text {
    color: #f56c6c;
  }
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.import-summary {
  margin-bottom: 20px;
  
  h3 {
    margin: 0 0 16px 0;
    color: #303133;
  }
  
  .highlight {
    color: #409eff;
    font-weight: bold;
  }
}

.import-warning {
  margin-bottom: 20px;
}

.import-progress {
  text-align: center;
  padding: 40px;
  
  .progress-text {
    margin: 16px 0;
    color: #606266;
  }
}

.import-result {
  margin-top: 20px;
  
  .rollback-section {
    margin-top: 20px;
    
    .el-alert {
      margin-bottom: 16px;
    }
  }
}

.warnings-list {
  max-height: 400px;
  overflow-y: auto;
  
  .warning-item {
    padding: 8px 0;
    border-bottom: 1px solid #ebeef5;
    font-size: 13px;
    color: #606266;
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  .more-warnings {
    text-align: center;
    padding: 16px;
    color: #909399;
    font-size: 13px;
  }
}

.rollback-confirm {
  text-align: center;
  padding: 20px;
  
  p {
    margin: 16px 0;
    font-size: 14px;
    color: #606266;
  }
  
  .rollback-info {
    color: #909399;
    font-size: 13px;
  }
}

.error-text {
  color: #f56c6c;
}

.warning-text {
  color: #e6a23c;
}

.income-text {
  color: #67c23a;
}

.expense-text {
  color: #f56c6c;
}
</style>
