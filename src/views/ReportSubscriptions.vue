<template>
  <div class="report-subscriptions">
    <div class="page-header">
      <h2 class="page-title">报表订阅</h2>
      <div class="header-actions">
        <el-button
          type="primary"
          icon="el-icon-plus"
          @click="handleAddSubscription"
        >
          新建订阅
        </el-button>
      </div>
    </div>

    <div class="subscription-list">
      <el-table
        :data="subscriptions"
        v-loading="loading"
        size="small"
      >
        <el-table-column label="报表名称" min-width="180">
          <template slot-scope="scope">
            <div class="report-name">
              <i class="el-icon-document"></i>
              <span>{{ scope.row.reportName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="模板" width="140">
          <template slot-scope="scope">
            <el-tag size="mini" :type="scope.row.templateId ? 'info' : 'success'">
              {{ scope.row.templateId ? '指定模板' : '当前设计' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="生成频率" width="100">
          <template slot-scope="scope">
            <span>{{ scope.row.frequency === 'weekly' ? '每周' : '每月' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="格式" width="100">
          <template slot-scope="scope">
            <span>{{ scope.row.format === 'pdf' ? 'PDF' : '图片' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="保存路径" min-width="200" show-overflow-tooltip>
          <template slot-scope="scope">
            <span class="path-text">{{ scope.row.outputPath }}</span>
          </template>
        </el-table-column>
        <el-table-column label="上次生成" width="160">
          <template slot-scope="scope">
            <span v-if="scope.row.lastGenerated">
              {{ formatDateTime(scope.row.lastGenerated) }}
            </span>
            <span v-else class="text-placeholder">未生成</span>
          </template>
        </el-table-column>
        <el-table-column label="下次生成" width="160">
          <template slot-scope="scope">
            <span v-if="scope.row.nextGenerate" class="next-time">
              {{ formatDateTime(scope.row.nextGenerate) }}
            </span>
            <span v-else class="text-placeholder">计算中...</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template slot-scope="scope">
            <el-switch
              v-model="scope.row.enabled"
              @change="(val) => handleToggle(scope.row.id, val)"
              active-color="#67C23A"
              inactive-color="#DCDFE6"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template slot-scope="scope">
            <el-button
              size="mini"
              icon="el-icon-video-play"
              @click="handleExecuteNow(scope.row)"
            >
              立即生成
            </el-button>
            <el-button
              size="mini"
              icon="el-icon-edit"
              @click="handleEditSubscription(scope.row)"
            >
              编辑
            </el-button>
            <el-button
              size="mini"
              type="danger"
              icon="el-icon-delete"
              @click="handleDelete(scope.row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="subscriptions.length === 0 && !loading" class="empty-state">
        <i class="el-icon-alarm-clock"></i>
        <p>暂无订阅任务</p>
        <el-button type="primary" @click="handleAddSubscription">
          创建第一个订阅
        </el-button>
      </div>
    </div>

    <el-dialog
      :title="editingSubscription ? '编辑订阅' : '新建订阅'"
      :visible.sync="showDialog"
      width="500px"
      @close="resetForm"
    >
      <el-form :model="formData" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="报表名称" prop="reportName">
          <el-input v-model="formData.reportName" placeholder="请输入报表名称" />
        </el-form-item>

        <el-form-item label="使用模板">
          <el-select v-model="formData.templateId" placeholder="选择模板（可选）" clearable>
            <el-option
              v-for="template in templates"
              :key="template.id"
              :label="template.name"
              :value="template.id"
            />
          </el-select>
          <div class="form-tip">不选择则使用报表设计器当前内容</div>
        </el-form-item>

        <el-form-item label="生成频率" prop="frequency">
          <el-radio-group v-model="formData.frequency">
            <el-radio label="weekly">每周</el-radio>
            <el-radio label="monthly">每月</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="生成时间" prop="generateTime">
          <el-date-picker
            v-model="formData.generateTime"
            type="datetime"
            placeholder="选择首次生成时间"
            format="yyyy-MM-dd HH:mm:ss"
            value-format="yyyy-MM-dd HH:mm:ss"
          />
          <div class="form-tip">
            <span v-if="formData.frequency === 'weekly'">每周此时间生成</span>
            <span v-else>每月此时间生成</span>
          </div>
        </el-form-item>

        <el-form-item label="导出格式" prop="format">
          <el-radio-group v-model="formData.format">
            <el-radio label="pdf">PDF</el-radio>
            <el-radio label="image">图片</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="保存路径" prop="outputPath">
          <el-input v-model="formData.outputPath" placeholder="请选择保存目录" readonly>
            <el-button slot="append" icon="el-icon-folder" @click="handleSelectPath">
              选择
            </el-button>
          </el-input>
        </el-form-item>

        <el-form-item label="启用">
          <el-switch v-model="formData.enabled" />
        </el-form-item>
      </el-form>

      <span slot="footer">
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </span>
    </el-dialog>

    <el-dialog
      title="生成历史"
      :visible.sync="showHistory"
      width="70%"
    >
      <el-table :data="historyList" size="small">
        <el-table-column label="生成时间" width="180">
          <template slot-scope="scope">
            {{ formatDateTime(scope.row.generateTime) }}
          </template>
        </el-table-column>
        <el-table-column label="报表名称" prop="reportName" />
        <el-table-column label="格式" width="80">
          <template slot-scope="scope">
            {{ scope.row.format === 'pdf' ? 'PDF' : '图片' }}
          </template>
        </el-table-column>
        <el-table-column label="文件路径" show-overflow-tooltip>
          <template slot-scope="scope">
            <span class="path-text">{{ scope.row.filePath }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template slot-scope="scope">
            <el-tag size="mini" :type="scope.row.success ? 'success' : 'danger'">
              {{ scope.row.success ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template slot-scope="scope">
            <el-button
              size="mini"
              type="text"
              @click="handleOpenFile(scope.row.filePath)"
              v-if="scope.row.success"
            >
              打开文件
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script>
import {
  getReportSubscriptions,
  saveReportSubscription,
  deleteReportSubscription,
  toggleReportSubscription,
  getReportTemplates
} from '@/utils/reportUtils'

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null }

export default {
  name: 'ReportSubscriptions',
  data() {
    return {
      subscriptions: [],
      templates: [],
      loading: false,
      showDialog: false,
      showHistory: false,
      editingSubscription: null,
      historyList: [],
      formData: {
        id: null,
        reportName: '',
        templateId: null,
        frequency: 'monthly',
        generateTime: '',
        format: 'pdf',
        outputPath: '',
        enabled: true
      },
      formRules: {
        reportName: [
          { required: true, message: '请输入报表名称', trigger: 'blur' }
        ],
        frequency: [
          { required: true, message: '请选择生成频率', trigger: 'change' }
        ],
        generateTime: [
          { required: true, message: '请选择生成时间', trigger: 'change' }
        ],
        format: [
          { required: true, message: '请选择导出格式', trigger: 'change' }
        ],
        outputPath: [
          { required: true, message: '请选择保存路径', trigger: 'change' }
        ]
      }
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const [subscriptions, templates] = await Promise.all([
          getReportSubscriptions(),
          getReportTemplates()
        ])
        this.subscriptions = subscriptions || []
        this.templates = templates || []
      } catch (e) {
        this.$message.error('加载数据失败：' + e.message)
      } finally {
        this.loading = false
      }
    },
    formatDateTime(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },
    resetForm() {
      this.editingSubscription = null
      this.formData = {
        id: null,
        reportName: '',
        templateId: null,
        frequency: 'monthly',
        generateTime: '',
        format: 'pdf',
        outputPath: '',
        enabled: true
      }
      if (this.$refs.formRef) {
        this.$refs.formRef.resetFields()
      }
    },
    handleAddSubscription() {
      this.resetForm()
      const now = new Date()
      now.setDate(now.getDate() + 1)
      now.setHours(9, 0, 0, 0)
      this.formData.generateTime = now.toISOString().replace('T', ' ').substring(0, 19)
      this.showDialog = true
    },
    handleEditSubscription(subscription) {
      this.editingSubscription = subscription
      this.formData = {
        id: subscription.id,
        reportName: subscription.reportName,
        templateId: subscription.templateId || null,
        frequency: subscription.frequency,
        generateTime: subscription.generateTime,
        format: subscription.format,
        outputPath: subscription.outputPath,
        enabled: subscription.enabled
      }
      this.showDialog = true
    },
    async handleSelectPath() {
      if (!ipcRenderer) return
      const result = await ipcRenderer.invoke('show-open-dialog', {
        properties: ['openDirectory']
      })
      if (result && !result.canceled && result.filePaths.length > 0) {
        this.formData.outputPath = result.filePaths[0]
      }
    },
    async handleSave() {
      if (!this.$refs.formRef) return

      this.$refs.formRef.validate(async (valid) => {
        if (!valid) return

        try {
          const subscription = {
            ...this.formData,
            id: this.formData.id || ('sub_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5))
          }

          const result = await saveReportSubscription(subscription)
          if (result) {
            this.$message.success(this.editingSubscription ? '更新成功' : '创建成功')
            this.showDialog = false
            this.loadData()
          }
        } catch (e) {
          this.$message.error('保存失败：' + e.message)
        }
      })
    },
    async handleToggle(id, enabled) {
      try {
        const result = await toggleReportSubscription(id)
        if (result) {
          this.$message.success(enabled ? '已启用' : '已禁用')
        }
      } catch (e) {
        this.$message.error('操作失败：' + e.message)
        this.loadData()
      }
    },
    async handleExecuteNow(subscription) {
      this.$confirm(`立即生成报表 "${subscription.reportName}"？`, '确认生成', {
        type: 'info'
      }).then(async () => {
        try {
          this.$message.info('正在生成报表...')
          const result = await ipcRenderer.invoke('execute-report-subscription', subscription.id)
          if (result) {
            this.$message.success(`生成成功：${result}`)
            this.loadData()
          }
        } catch (e) {
          this.$message.error('生成失败：' + e.message)
        }
      }).catch(() => {})
    },
    async handleDelete(id) {
      this.$confirm('确定要删除该订阅吗？', '确认删除', {
        type: 'warning'
      }).then(async () => {
        try {
          const result = await deleteReportSubscription(id)
          if (result) {
            this.$message.success('删除成功')
            this.loadData()
          }
        } catch (e) {
          this.$message.error('删除失败：' + e.message)
        }
      }).catch(() => {})
    },
    handleOpenFile(filePath) {
      if (!ipcRenderer) return
      ipcRenderer.invoke('open-file', filePath)
    }
  }
}
</script>

<style scoped lang="scss">
.report-subscriptions {
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
  }

  .subscription-list {
    background: #fff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

    .report-name {
      display: flex;
      align-items: center;
      gap: 8px;

      i {
        color: $primary-color;
      }

      span {
        font-weight: 500;
        color: $text-primary;
      }
    }

    .path-text {
      font-family: Consolas, Monaco, monospace;
      font-size: 12px;
      color: $text-secondary;
    }

    .next-time {
      color: $primary-color;
      font-weight: 500;
    }

    .text-placeholder {
      color: $text-placeholder;
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
      margin: 0 0 16px;
      font-size: 14px;
    }
  }

  .form-tip {
    font-size: 12px;
    color: $text-secondary;
    margin-top: 4px;
  }
}
</style>
