<template>
  <div class="receipt-viewer">
    <el-dialog
      :title="title"
      :visible.sync="visible"
      width="800px"
      :close-on-click-modal="false"
      @closed="handleClosed"
      custom-class="receipt-viewer-dialog"
    >
      <div class="viewer-container" v-if="images.length > 0">
        <div class="main-view">
          <div class="image-wrapper">
            <img
              :src="currentImageData"
              class="main-image"
              v-loading="loading"
              @load="handleImageLoad"
            />
            <div class="nav-buttons">
              <button
                class="nav-btn prev-btn"
                @click="prevImage"
                :disabled="currentIndex === 0"
                v-show="images.length > 1"
              >
                <i class="el-icon-arrow-left"></i>
              </button>
              <button
                class="nav-btn next-btn"
                @click="nextImage"
                :disabled="currentIndex === images.length - 1"
                v-show="images.length > 1"
              >
                <i class="el-icon-arrow-right"></i>
              </button>
            </div>
          </div>

          <div class="image-info">
            <div class="info-row">
              <span class="label">文件名:</span>
              <span class="value" :title="currentReceipt?.originalName">{{ currentReceipt?.originalName }}</span>
            </div>
            <div class="info-row">
              <span class="label">上传时间:</span>
              <span class="value">{{ formatDate(currentReceipt?.createdAt) }}</span>
            </div>
            <div class="info-row" v-if="currentReceipt?.fileSize">
              <span class="label">大小:</span>
              <span class="value">{{ formatFileSize(currentReceipt.fileSize) }}</span>
            </div>
            <div class="info-row" v-if="currentReceipt?.amount">
              <span class="label">金额:</span>
              <span class="value amount">¥{{ currentReceipt.amount.toFixed(2) }}</span>
            </div>
            <div class="info-row" v-if="currentReceipt?.merchant">
              <span class="label">商家:</span>
              <span class="value">{{ currentReceipt.merchant }}</span>
            </div>
            <div class="info-row" v-if="currentReceipt?.date">
              <span class="label">日期:</span>
              <span class="value">{{ currentReceipt.date }}</span>
            </div>
          </div>
        </div>

        <div class="thumbnail-bar" v-if="images.length > 1">
          <div
            class="thumbnail-item"
            v-for="(img, index) in images"
            :key="index"
            :class="{ active: index === currentIndex }"
            @click="currentIndex = index"
          >
            <img :src="getThumbnail(img)" class="thumbnail-image" />
          </div>
        </div>

        <div class="tags-section" v-if="currentReceipt">
          <div class="section-title">
            <span>标签</span>
            <el-input
              v-model="newTag"
              size="mini"
              placeholder="添加标签"
              style="width: 150px"
              @keyup.enter="addTag"
            >
              <el-button slot="append" icon="el-icon-plus" @click="addTag"></el-button>
            </el-input>
          </div>
          <div class="tags-list">
            <el-tag
              v-for="tag in currentReceipt.tags || []"
              :key="tag"
              closable
              type="info"
              @close="removeTag(tag)"
              style="margin-right: 8px; margin-bottom: 8px"
            >
              {{ tag }}
            </el-tag>
            <span class="empty-tags" v-if="!currentReceipt.tags || currentReceipt.tags.length === 0">
              暂无标签
            </span>
          </div>
        </div>

        <div class="ocr-section" v-if="currentReceipt?.ocrText">
          <div class="section-title">
            <span>OCR 识别结果</span>
            <el-tag :type="getConfidenceType(currentReceipt.ocrConfidence)" size="mini">
              置信度 {{ (currentReceipt.ocrConfidence * 100).toFixed(0) }}%
            </el-tag>
            <el-button
              size="mini"
              icon="el-icon-refresh"
              @click="reRecognize"
              :loading="recognizing"
              style="margin-left: auto"
            >
              重新识别
            </el-button>
          </div>
          <div class="ocr-text">
            <pre>{{ currentReceipt.ocrText }}</pre>
          </div>
        </div>

        <div class="action-bar">
          <el-button
            icon="el-icon-delete"
            type="danger"
            @click="deleteCurrent"
          >
            删除
          </el-button>
          <el-button
            icon="el-icon-download"
            @click="downloadImage"
          >
            下载
          </el-button>
          <el-button
            :icon="currentReceipt?.isReimbursable ? 'el-icon-check' : 'el-icon-circle-check'"
            :type="currentReceipt?.isReimbursable ? 'success' : ''"
            @click="toggleReimbursable"
          >
            {{ currentReceipt?.isReimbursable ? '已标记可报销' : '标记可报销' }}
          </el-button>
          <el-tag
            v-if="currentReceipt?.reimbursementStatus === 'reimbursed'"
            type="success"
            size="medium"
          >
            已报销
          </el-tag>
          <el-tag
            v-else-if="currentReceipt?.reimbursementStatus === 'processing'"
            type="warning"
            size="medium"
          >
            报销中
          </el-tag>
          <el-button
            icon="el-icon-edit"
            type="primary"
            @click="editReceipt"
            style="margin-left: auto"
          >
            编辑信息
          </el-button>
        </div>
      </div>

      <div class="empty-view" v-else>
        <el-empty description="暂无图片" />
      </div>
    </el-dialog>

    <el-dialog
      title="编辑票据信息"
      :visible.sync="editDialogVisible"
      width="500px"
    >
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="金额">
          <el-input-number
            v-model="editForm.amount"
            :precision="2"
            :step="1"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="editForm.date"
            type="date"
            format="yyyy-MM-dd"
            value-format="yyyy-MM-dd"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="商家">
          <el-input v-model="editForm.merchant" placeholder="请输入商家名称" />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="editForm.category" placeholder="请输入分类" />
        </el-form-item>
        <el-form-item label="可报销">
          <el-switch v-model="editForm.isReimbursable" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { receiptApi, ocrApi } from '@/api'

export default {
  name: 'ReceiptViewer',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    images: {
      type: Array,
      default: () => []
    },
    receipts: {
      type: Array,
      default: () => []
    },
    startIndex: {
      type: Number,
      default: 0
    },
    title: {
      type: String,
      default: '票据预览'
    }
  },
  data() {
    return {
      currentIndex: 0,
      currentImageData: '',
      loading: false,
      newTag: '',
      editDialogVisible: false,
      editForm: {
        amount: null,
        date: '',
        merchant: '',
        category: '',
        isReimbursable: false
      },
      recognizing: false
    }
  },
  computed: {
    currentReceipt() {
      if (this.receipts && this.receipts[this.currentIndex]) {
        return this.receipts[this.currentIndex]
      }
      if (this.images[this.currentIndex]?.receipt) {
        return this.images[this.currentIndex].receipt
      }
      return null
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.currentIndex = this.startIndex
        this.loadCurrentImage()
      }
    },
    currentIndex() {
      if (this.visible) {
        this.loadCurrentImage()
      }
    }
  },
  methods: {
    getThumbnail(img) {
      if (img.preview) return img.preview
      if (img.base64) return img.base64
      return ''
    },

    async loadCurrentImage() {
      const receipt = this.currentReceipt
      if (!receipt) {
        this.currentImageData = this.getThumbnail(this.images[this.currentIndex])
        return
      }

      if (this.images[this.currentIndex]?.preview) {
        this.currentImageData = this.images[this.currentIndex].preview
        return
      }

      this.loading = true
      try {
        this.currentImageData = await receiptApi.getImage(receipt.id)
      } catch (error) {
        console.error('Load image error:', error)
      } finally {
        this.loading = false
      }
    },

    handleImageLoad() {
      this.loading = false
    },

    prevImage() {
      if (this.currentIndex > 0) {
        this.currentIndex--
      }
    },

    nextImage() {
      if (this.currentIndex < this.images.length - 1) {
        this.currentIndex++
      }
    },

    handleClosed() {
      this.$emit('update:visible', false)
      this.currentImageData = ''
      this.newTag = ''
    },

    async addTag() {
      if (!this.newTag.trim() || !this.currentReceipt) return

      try {
        const result = await receiptApi.addTag(this.currentReceipt.id, this.newTag.trim())
        if (result) {
          this.$message.success('标签添加成功')
          this.$emit('updated', result)
          this.newTag = ''
        }
      } catch (error) {
        console.error('Add tag error:', error)
        this.$message.error('添加失败')
      }
    },

    async removeTag(tag) {
      if (!this.currentReceipt) return

      try {
        const result = await receiptApi.removeTag(this.currentReceipt.id, tag)
        if (result) {
          this.$message.success('标签删除成功')
          this.$emit('updated', result)
        }
      } catch (error) {
        console.error('Remove tag error:', error)
        this.$message.error('删除失败')
      }
    },

    async deleteCurrent() {
      const receipt = this.currentReceipt
      if (!receipt) return

      this.$confirm('确定要删除这张票据吗？此操作不可恢复。', '确认删除', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }).then(async () => {
        try {
          const result = await receiptApi.deleteReceipt(receipt.id)
          if (result) {
            this.$message.success('删除成功')
            this.$emit('deleted', receipt.id)
            
            if (this.images.length > 1) {
              if (this.currentIndex > 0) {
                this.currentIndex--
              }
            } else {
              this.$emit('update:visible', false)
            }
          }
        } catch (error) {
          console.error('Delete receipt error:', error)
          this.$message.error('删除失败')
        }
      }).catch(() => {})
    },

    async downloadImage() {
      const receipt = this.currentReceipt
      if (!receipt || !this.currentImageData) return

      try {
        const link = document.createElement('a')
        link.href = this.currentImageData
        link.download = receipt.originalName || `receipt_${receipt.id}.jpg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (error) {
        console.error('Download error:', error)
        this.$message.error('下载失败')
      }
    },

    async toggleReimbursable() {
      const receipt = this.currentReceipt
      if (!receipt) return

      try {
        const result = await receiptApi.updateReceipt({
          id: receipt.id,
          isReimbursable: !receipt.isReimbursable
        })
        if (result) {
          this.$message.success(result.isReimbursable ? '已标记为可报销' : '已取消可报销标记')
          this.$emit('updated', result)
        }
      } catch (error) {
        console.error('Toggle reimbursable error:', error)
        this.$message.error('操作失败')
      }
    },

    editReceipt() {
      const receipt = this.currentReceipt
      if (!receipt) return

      this.editForm = {
        amount: receipt.amount || null,
        date: receipt.date || '',
        merchant: receipt.merchant || '',
        category: receipt.category || '',
        isReimbursable: receipt.isReimbursable || false
      }
      this.editDialogVisible = true
    },

    async saveEdit() {
      const receipt = this.currentReceipt
      if (!receipt) return

      try {
        const result = await receiptApi.updateReceipt({
          id: receipt.id,
          ...this.editForm
        })
        if (result) {
          this.$message.success('保存成功')
          this.$emit('updated', result)
          this.editDialogVisible = false
        }
      } catch (error) {
        console.error('Save edit error:', error)
        this.$message.error('保存失败')
      }
    },

    async reRecognize() {
      const receipt = this.currentReceipt
      if (!receipt) return

      this.recognizing = true
      try {
        const result = await ocrApi.recognize(receipt.id)
        if (result && result.success) {
          this.$message.success('识别成功')
          this.$emit('updated', result.receipt)
        } else {
          this.$message.error(result?.error || '识别失败')
        }
      } catch (error) {
        console.error('Recognize error:', error)
        this.$message.error('识别失败')
      } finally {
        this.recognizing = false
      }
    },

    getConfidenceType(confidence) {
      if (confidence >= 0.8) return 'success'
      if (confidence >= 0.6) return 'warning'
      return 'danger'
    },

    formatDate(dateStr) {
      if (!dateStr) return '-'
      const date = new Date(dateStr)
      return date.toLocaleString('zh-CN')
    },

    formatFileSize(bytes) {
      if (!bytes) return '-'
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }
  }
}
</script>

<style lang="scss" scoped>
.receipt-viewer {
  ::v-deep .receipt-viewer-dialog {
    .el-dialog__body {
      padding: 0;
    }
  }

  .viewer-container {
    display: flex;
    flex-direction: column;
    height: 600px;
  }

  .main-view {
    display: flex;
    flex: 1;
    min-height: 0;
    border-bottom: 1px solid #ebeef5;
  }

  .image-wrapper {
    flex: 1;
    background: #1a1a1a;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    min-width: 0;

    .main-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .nav-buttons {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      transform: translateY(-50%);
      display: flex;
      justify-content: space-between;
      padding: 0 16px;
      pointer-events: none;

      .nav-btn {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        pointer-events: auto;

        &:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.4);
        }

        &:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
      }
    }
  }

  .image-info {
    width: 220px;
    padding: 16px;
    background: #fafafa;
    overflow-y: auto;

    .info-row {
      display: flex;
      margin-bottom: 12px;
      font-size: 13px;

      .label {
        color: $text-secondary;
        width: 60px;
        flex-shrink: 0;
      }

      .value {
        color: $text-primary;
        flex: 1;
        word-break: break-all;

        &.amount {
          color: $expense-color;
          font-weight: 600;
        }
      }
    }
  }

  .thumbnail-bar {
    display: flex;
    gap: 8px;
    padding: 12px;
    background: #f5f7fa;
    overflow-x: auto;

    .thumbnail-item {
      width: 60px;
      height: 60px;
      flex-shrink: 0;
      border: 2px solid transparent;
      border-radius: 6px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: $primary-color;
      }

      &.active {
        border-color: $primary-color;
        box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3);
      }

      .thumbnail-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    color: $text-primary;
    margin-bottom: 12px;
  }

  .tags-section {
    padding: 16px;
    border-bottom: 1px solid #ebeef5;

    .tags-list {
      .empty-tags {
        color: $text-secondary;
        font-size: 13px;
      }
    }
  }

  .ocr-section {
    padding: 16px;
    border-bottom: 1px solid #ebeef5;

    .ocr-text {
      background: #f5f7fa;
      border-radius: 6px;
      padding: 12px;
      max-height: 150px;
      overflow-y: auto;

      pre {
        margin: 0;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.6;
        color: $text-regular;
        white-space: pre-wrap;
        word-break: break-all;
      }
    }
  }

  .action-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: #fafafa;
  }

  .empty-view {
    padding: 60px 0;
  }
}
</style>
