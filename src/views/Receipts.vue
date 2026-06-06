<template>
  <div class="page-container receipts">
    <div class="header">
      <h2 class="page-title">票据管理</h2>
      <div class="header-actions">
        <el-button
          type="primary"
          icon="el-icon-camera"
          @click="showUpload = true"
        >
          上传票据
        </el-button>
        <el-button
          icon="el-icon-setting"
          @click="showOcrConfig = true"
        >
          OCR 设置
        </el-button>
      </div>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon total">📄</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total || 0 }}</div>
              <div class="stat-label">票据总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon with-ocr">🔍</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.withOcr || 0 }}</div>
              <div class="stat-label">已识别</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon reimbursable">💰</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.reimbursable || 0 }}</div>
              <div class="stat-label">可报销 (¥{{ formatMoney(stats.reimbursableAmount || 0) }})</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon reimbursed">✅</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.reimbursed || 0 }}</div>
              <div class="stat-label">已报销 (¥{{ formatMoney(stats.reimbursedAmount || 0) }})</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="card filter-card" shadow="never">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="搜索">
          <el-input
            v-model="filters.searchText"
            placeholder="搜索文字、商家、标签"
            prefix-icon="el-icon-search"
            clearable
            style="width: 250px"
            @keyup.enter="loadReceipts"
          />
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="yyyy-MM-dd"
            value-format="yyyy-MM-dd"
            @change="handleDateRangeChange"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="filters.category"
            placeholder="全部分类"
            clearable
            style="width: 150px"
            @change="loadReceipts"
          >
            <el-option
              v-for="(count, name) in stats.byCategory"
              :key="name"
              :label="`${name} (${count})`"
              :value="name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="报销状态">
          <el-select
            v-model="filters.reimbursementStatus"
            placeholder="全部"
            clearable
            style="width: 150px"
            @change="loadReceipts"
          >
            <el-option label="待报销" value="pending" />
            <el-option label="报销中" value="processing" />
            <el-option label="已报销" value="reimbursed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadReceipts">
            搜索
          </el-button>
          <el-button icon="el-icon-refresh" @click="resetFilters">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="card" shadow="never">
      <div class="view-toggle">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button label="grid">
            <i class="el-icon-camera"></i> 网格
          </el-radio-button>
          <el-radio-button label="list">
            <i class="el-icon-menu"></i> 列表
          </el-radio-button>
        </el-radio-group>
        <span class="total-count">共 {{ receipts.length }} 张票据</span>
      </div>

      <div class="grid-view" v-if="viewMode === 'grid' && receipts.length > 0">
        <div
          class="receipt-item"
          v-for="receipt in receipts"
          :key="receipt.id"
          @click="openViewer(receipt)"
        >
          <div class="receipt-thumbnail">
            <img
              :src="getThumbnail(receipt)"
              class="thumbnail-image"
              v-loading="imageLoading[receipt.id]"
            />
            <div class="receipt-overlay">
              <div class="overlay-actions">
                <el-button
                  size="mini"
                  icon="el-icon-view"
                  @click.stop="openViewer(receipt)"
                >
                  查看
                </el-button>
                <el-button
                  size="mini"
                  type="primary"
                  icon="el-icon-search"
                  @click.stop="recognizeReceipt(receipt)"
                  :loading="recognizing[receipt.id]"
                  v-if="!receipt.ocrText"
                >
                  识别
                </el-button>
              </div>
            </div>
            <div class="status-badges">
              <el-tag
                size="mini"
                type="success"
                v-if="receipt.reimbursementStatus === 'reimbursed'"
              >
                已报销
              </el-tag>
              <el-tag
                size="mini"
                type="warning"
                v-else-if="receipt.reimbursementStatus === 'processing'"
              >
                报销中
              </el-tag>
              <el-tag
                size="mini"
                type="info"
                v-if="receipt.ocrText"
              >
                已识别
              </el-tag>
            </div>
          </div>
          <div class="receipt-info">
            <div class="receipt-amount" v-if="receipt.amount">
              ¥{{ receipt.amount.toFixed(2) }}
            </div>
            <div class="receipt-merchant" v-if="receipt.merchant">
              {{ receipt.merchant }}
            </div>
            <div class="receipt-date">{{ receipt.date }}</div>
            <div class="receipt-tags" v-if="receipt.tags && receipt.tags.length > 0">
              <el-tag
                v-for="tag in receipt.tags.slice(0, 2)"
                :key="tag"
                size="mini"
                type="info"
              >
                {{ tag }}
              </el-tag>
              <span v-if="receipt.tags.length > 2" class="more-tags">
                +{{ receipt.tags.length - 2 }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <el-table
        v-else-if="viewMode === 'list' && receipts.length > 0"
        :data="receipts"
        v-loading="loading"
      >
        <el-table-column label="图片" width="100">
          <template slot-scope="scope">
            <img
              :src="getThumbnail(scope.row)"
              class="list-thumbnail"
              @click="openViewer(scope.row)"
              v-loading="imageLoading[scope.row.id]"
            />
          </template>
        </el-table-column>
        <el-table-column label="金额" width="120">
          <template slot-scope="scope">
            <span class="amount" v-if="scope.row.amount">
              ¥{{ scope.row.amount.toFixed(2) }}
            </span>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>
        <el-table-column label="商家" min-width="150">
          <template slot-scope="scope">
            <span v-if="scope.row.merchant">{{ scope.row.merchant }}</span>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="120">
          <template slot-scope="scope">
            <span v-if="scope.row.category">{{ scope.row.category }}</span>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>
        <el-table-column label="日期" width="120" prop="date" />
        <el-table-column label="OCR状态" width="100">
          <template slot-scope="scope">
            <el-tag
              v-if="scope.row.ocrText"
              :type="scope.row.ocrConfidence >= 0.8 ? 'success' : 'warning'"
              size="mini"
            >
              {{ (scope.row.ocrConfidence * 100).toFixed(0) }}%
            </el-tag>
            <el-tag v-else type="info" size="mini">未识别</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="报销状态" width="100">
          <template slot-scope="scope">
            <el-tag
              :type="getReimburseStatusType(scope.row.reimbursementStatus)"
              size="mini"
            >
              {{ getReimburseStatusText(scope.row.reimbursementStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template slot-scope="scope">
            <el-button
              type="text"
              size="mini"
              icon="el-icon-view"
              @click="openViewer(scope.row)"
            >
              查看
            </el-button>
            <el-button
              type="text"
              size="mini"
              icon="el-icon-search"
              @click="recognizeReceipt(scope.row)"
              :loading="recognizing[scope.row.id]"
              v-if="!scope.row.ocrText"
            >
              识别
            </el-button>
            <el-button
              type="text"
              size="mini"
              icon="el-icon-delete"
              @click="deleteReceipt(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="receipts.length === 0 && !loading"
        description="暂无票据记录"
        class="empty-state"
      >
        <el-button type="primary" icon="el-icon-camera" @click="showUpload = true">
          上传第一张票据
        </el-button>
      </el-empty>
    </el-card>

    <el-dialog
      title="上传票据"
      :visible.sync="showUpload"
      width="600px"
      @closed="handleUploadClosed"
    >
      <ReceiptUpload
        ref="uploadRef"
        @uploaded="handleUploaded"
        @removed="handleRemoved"
      />
      <div slot="footer">
        <el-button @click="showUpload = false">关闭</el-button>
      </div>
    </el-dialog>

    <ReceiptViewer
      :visible.sync="showViewer"
      :images="viewerImages"
      :receipts="viewerReceipts"
      :start-index="viewerStartIndex"
      @updated="handleReceiptUpdated"
      @deleted="handleReceiptDeleted"
    />

    <el-dialog
      title="OCR 设置"
      :visible.sync="showOcrConfig"
      width="500px"
    >
      <el-form :model="ocrConfig" label-width="100px">
        <el-form-item label="OCR类型">
          <el-radio-group v-model="ocrConfig.ocrType">
            <el-radio label="local">本地识别</el-radio>
            <el-radio label="cloud">云端API</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="压缩质量">
          <el-slider
            v-model="ocrConfig.compressionQuality"
            :min="0.1"
            :max="1"
            :step="0.1"
            show-input
          />
        </el-form-item>
        <el-form-item label="识别语言">
          <el-select v-model="ocrConfig.language" style="width: 100%">
            <el-option label="简体中文 + 英文" value="chi_sim+eng" />
            <el-option label="简体中文" value="chi_sim" />
            <el-option label="英文" value="eng" />
          </el-select>
        </el-form-item>
        <el-form-item label="API地址" v-if="ocrConfig.ocrType === 'cloud'">
          <el-input v-model="ocrConfig.apiUrl" placeholder="输入云端API地址" />
        </el-form-item>
        <el-form-item label="API密钥" v-if="ocrConfig.ocrType === 'cloud'">
          <el-input v-model="ocrConfig.apiKey" type="password" placeholder="输入API密钥" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="showOcrConfig = false">取消</el-button>
        <el-button type="primary" @click="saveOcrConfig">保存</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { receiptApi, ocrApi } from '@/api'
import { formatMoney } from '@/utils'
import ReceiptUpload from '@/components/ReceiptUpload.vue'
import ReceiptViewer from '@/components/ReceiptViewer.vue'

export default {
  name: 'Receipts',
  components: {
    ReceiptUpload,
    ReceiptViewer
  },
  data() {
    return {
      loading: false,
      receipts: [],
      stats: {},
      filters: {
        searchText: '',
        category: '',
        reimbursementStatus: '',
        startDate: '',
        endDate: ''
      },
      dateRange: [],
      viewMode: 'grid',
      showUpload: false,
      showViewer: false,
      showOcrConfig: false,
      viewerImages: [],
      viewerReceipts: [],
      viewerStartIndex: 0,
      imageLoading: {},
      recognizing: {},
      ocrConfig: {
        ocrType: 'local',
        compressionQuality: 0.7,
        language: 'chi_sim+eng',
        apiKey: '',
        apiUrl: ''
      }
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    formatMoney,

    async loadData() {
      this.loading = true
      try {
        const [receipts, stats, ocrConfig] = await Promise.all([
          receiptApi.getReceipts(this.filters),
          receiptApi.getStats(),
          ocrApi.getConfig()
        ])
        this.receipts = receipts || []
        this.stats = stats || {}
        if (ocrConfig) {
          this.ocrConfig = ocrConfig
        }
      } catch (error) {
        console.error('Load data error:', error)
        this.$message.error('加载数据失败')
      } finally {
        this.loading = false
      }
    },

    async loadReceipts() {
      this.loading = true
      try {
        const receipts = await receiptApi.getReceipts(this.filters)
        this.receipts = receipts || []
      } catch (error) {
        console.error('Load receipts error:', error)
        this.$message.error('加载票据失败')
      } finally {
        this.loading = false
      }
    },

    handleDateRangeChange(val) {
      if (val && val.length === 2) {
        this.filters.startDate = val[0]
        this.filters.endDate = val[1]
      } else {
        this.filters.startDate = ''
        this.filters.endDate = ''
      }
      this.loadReceipts()
    },

    resetFilters() {
      this.filters = {
        searchText: '',
        category: '',
        reimbursementStatus: '',
        startDate: '',
        endDate: ''
      }
      this.dateRange = []
      this.loadReceipts()
    },

    getThumbnail(receipt) {
      if (!this.imageLoading[receipt.id]) {
        this.imageLoading = { ...this.imageLoading, [receipt.id]: true }
        receiptApi.getImage(receipt.id).then(data => {
          if (data) {
            receipt._thumbnail = data
          }
          this.imageLoading = { ...this.imageLoading, [receipt.id]: false }
        })
      }
      return receipt._thumbnail || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22120%22 height=%22120%22/%3E%3Ctext fill=%22%23999%22 font-size=%2224%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3E📄%3C/text%3E%3C/svg%3E'
    },

    openViewer(receipt) {
      const index = this.receipts.findIndex(r => r.id === receipt.id)
      this.viewerImages = this.receipts.map(r => ({
        preview: r._thumbnail,
        receipt: r
      }))
      this.viewerReceipts = this.receipts
      this.viewerStartIndex = index >= 0 ? index : 0
      this.showViewer = true
    },

    async recognizeReceipt(receipt) {
      this.recognizing = { ...this.recognizing, [receipt.id]: true }
      try {
        const result = await ocrApi.recognize(receipt.id)
        if (result && result.success) {
          this.$message.success('识别成功')
          Object.assign(receipt, result.receipt)
          this.loadData()
        } else {
          this.$message.error(result?.error || '识别失败')
        }
      } catch (error) {
        console.error('Recognize error:', error)
        this.$message.error('识别失败')
      } finally {
        this.recognizing = { ...this.recognizing, [receipt.id]: false }
      }
    },

    async deleteReceipt(receipt) {
      this.$confirm('确定要删除这张票据吗？此操作不可恢复。', '确认删除', {
        type: 'warning'
      }).then(async () => {
        try {
          const result = await receiptApi.deleteReceipt(receipt.id)
          if (result) {
            this.$message.success('删除成功')
            this.loadData()
          } else {
            this.$message.error('删除失败')
          }
        } catch (error) {
          console.error('Delete error:', error)
          this.$message.error('删除失败')
        }
      }).catch(() => {})
    },

    handleUploaded(receipt) {
      this.$message.success('上传成功')
      this.loadData()
    },

    handleRemoved(receiptId) {
      this.loadData()
    },

    handleUploadClosed() {
      this.loadData()
    },

    handleReceiptUpdated(receipt) {
      const index = this.receipts.findIndex(r => r.id === receipt.id)
      if (index !== -1) {
        this.$set(this.receipts, index, receipt)
      }
      this.loadData()
    },

    handleReceiptDeleted(receiptId) {
      this.receipts = this.receipts.filter(r => r.id !== receiptId)
      this.loadData()
    },

    async saveOcrConfig() {
      try {
        const result = await ocrApi.saveConfig(this.ocrConfig)
        if (result) {
          this.$message.success('保存成功')
          this.showOcrConfig = false
        } else {
          this.$message.error('保存失败')
        }
      } catch (error) {
        console.error('Save OCR config error:', error)
        this.$message.error('保存失败')
      }
    },

    getReimburseStatusType(status) {
      switch (status) {
        case 'reimbursed': return 'success'
        case 'processing': return 'warning'
        default: return 'info'
      }
    },

    getReimburseStatusText(status) {
      switch (status) {
        case 'reimbursed': return '已报销'
        case 'processing': return '报销中'
        default: return '待报销'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.receipts {
  .stats-row {
    margin-bottom: 16px;

    .stat-card {
      .stat-content {
        display: flex;
        align-items: center;
        gap: 16px;

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;

          &.total {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          &.with-ocr {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }
          &.reimbursable {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          }
          &.reimbursed {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          }
        }

        .stat-info {
          .stat-value {
            font-size: 24px;
            font-weight: 600;
            color: $text-primary;
            line-height: 1.2;
          }
          .stat-label {
            font-size: 13px;
            color: $text-secondary;
            margin-top: 4px;
          }
        }
      }
    }
  }

  .filter-card {
    margin-bottom: 16px;

    .filter-form {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }

  .view-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;

    .total-count {
      color: $text-secondary;
      font-size: 13px;
    }
  }

  .grid-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;

    .receipt-item {
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        transform: translateY(-4px);

        .receipt-overlay {
          opacity: 1;
        }
      }

      .receipt-thumbnail {
        position: relative;
        width: 100%;
        padding-bottom: 100%;
        border-radius: 8px;
        overflow: hidden;
        background: #f0f0f0;

        .thumbnail-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .receipt-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;

          .overlay-actions {
            display: flex;
            gap: 8px;
          }
        }

        .status-badges {
          position: absolute;
          top: 8px;
          left: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
      }

      .receipt-info {
        padding: 8px 4px;

        .receipt-amount {
          font-size: 16px;
          font-weight: 600;
          color: $expense-color;
        }
        .receipt-merchant {
          font-size: 13px;
          color: $text-primary;
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .receipt-date {
          font-size: 12px;
          color: $text-secondary;
          margin-top: 2px;
        }
        .receipt-tags {
          margin-top: 6px;
          display: flex;
          gap: 4px;
          align-items: center;

          .more-tags {
            font-size: 11px;
            color: $text-secondary;
          }
        }
      }
    }
  }

  .list-thumbnail {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
    cursor: pointer;
  }

  .amount {
    font-weight: 600;
    color: $expense-color;
  }

  .no-data {
    color: $text-secondary;
  }

  .empty-state {
    padding: 60px 0;
  }
}
</style>
