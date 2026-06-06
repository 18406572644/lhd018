<template>
  <div class="page-container quick-add">
    <div class="header">
      <h2 class="page-title">快速记一笔</h2>
      <el-date-picker
        v-model="currentDate"
        type="date"
        format="yyyy-MM-dd"
        value-format="yyyy-MM-dd"
        :clearable="false"
        class="date-picker"
      />
    </div>

    <el-card class="card form-card" shadow="never">
      <div class="type-switch">
        <button
          class="type-btn"
          :class="{ active: form.type === 'expense', 'expense-btn': form.type === 'expense' }"
          @click="switchType('expense')"
        >
          <span class="type-icon">📉</span>
          <span class="type-label">支出</span>
          <span class="type-indicator" v-if="form.type === 'expense'"></span>
        </button>
        <button
          class="type-btn"
          :class="{ active: form.type === 'income', 'income-btn': form.type === 'income' }"
          @click="switchType('income')"
        >
          <span class="type-icon">📈</span>
          <span class="type-label">收入</span>
          <span class="type-indicator" v-if="form.type === 'income'"></span>
        </button>
      </div>

      <div class="amount-section">
        <span class="currency">¥</span>
        <el-input
          v-model="form.amount"
          type="number"
          placeholder="0.00"
          class="amount-input"
          :class="{ 'expense-input': form.type === 'expense', 'income-input': form.type === 'income' }"
          ref="amountInput"
        />
        <div v-if="ocrData && ocrData.fields && ocrData.fields.amount" class="ocr-confidence">
          <el-tag :type="getConfidenceType(ocrData.fields.amount.confidence)" size="mini">
            置信度 {{ (ocrData.fields.amount.confidence * 100).toFixed(0) }}%
          </el-tag>
        </div>
      </div>

      <div class="categories-section">
        <div class="section-title">
          选择{{ form.type === 'income' ? '收入' : '支出' }}分类
          <span class="type-badge" :class="form.type">
            {{ form.type === 'income' ? '收入模式' : '支出模式' }}
          </span>
        </div>
        <div class="categories-grid" v-if="filteredCategories.length > 0">
          <div
            v-for="cat in filteredCategories"
            :key="cat.id"
            class="category-item"
            :class="{ active: form.categoryId === cat.id }"
            :style="{ borderColor: form.categoryId === cat.id ? cat.color : 'transparent' }"
            @click="selectCategory(cat)"
          >
            <div class="category-icon" :style="{ backgroundColor: cat.color + '20', color: cat.color }">
              {{ cat.icon }}
            </div>
            <div class="category-name">{{ cat.name }}</div>
          </div>
        </div>
        <el-empty v-else :description="'暂无' + (form.type === 'income' ? '收入' : '支出') + '分类，请先在分类管理中添加'" class="empty-categories">
          <el-button type="primary" size="small" @click="$router.push('/categories')">去添加分类</el-button>
        </el-empty>
      </div>

      <div class="remark-section">
        <el-input
          v-model="form.remark"
          placeholder="添加备注（可选）"
          class="remark-input"
          maxlength="50"
          show-word-limit
        />
      </div>

      <div class="receipt-section">
        <div class="section-title">
          票据影像
          <el-button type="text" size="mini" icon="el-icon-camera" @click="showOcrTip = !showOcrTip">
            OCR 智能识别
          </el-button>
        </div>
        
        <div v-if="showOcrTip" class="ocr-tip">
          <el-alert
            title="上传票据图片后将自动识别金额、日期、商家等信息"
            type="info"
            :closable="false"
            show-icon
          />
        </div>

        <ReceiptUpload
          ref="receiptUpload"
          :record-id="currentRecordId"
          :auto-upload="true"
          :max-files="10"
          @upload-success="handleReceiptUploaded"
          @image-removed="handleReceiptRemoved"
        />

        <div v-if="uploadedReceipts.length > 0" class="uploaded-receipts">
          <div class="receipt-thumbnails">
            <div
              v-for="(receipt, index) in uploadedReceipts"
              :key="receipt.id"
              class="receipt-thumbnail"
              :class="{ active: selectedReceiptIndex === index }"
              @click="openReceiptViewer(index)"
            >
              <img :src="receipt.thumbnailUrl" :alt="receipt.filename" />
              <div v-if="receipt.ocrStatus === 'pending'" class="ocr-status pending">
                <i class="el-icon-loading"></i> 识别中
              </div>
              <div v-else-if="receipt.ocrStatus === 'success'" class="ocr-status success">
                <i class="el-icon-check"></i> 已识别
              </div>
              <div v-else-if="receipt.ocrStatus === 'failed'" class="ocr-status failed">
                <i class="el-icon-close"></i> 识别失败
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="ocrData && ocrData.fields" class="ocr-result-section">
        <div class="section-title">
          OCR 识别结果
          <el-tag size="mini" type="info">可手动修正</el-tag>
        </div>
        <el-form :model="ocrData.fields" label-width="80px" size="small">
          <el-form-item label="金额" :class="{ 'low-confidence': isLowConfidence('amount') }">
            <el-input v-model="ocrData.fields.amount.value" @blur="applyOcrToForm" />
            <span v-if="isLowConfidence('amount')" class="low-confidence-tip">
              <i class="el-icon-warning"></i> 请核对
            </span>
          </el-form-item>
          <el-form-item label="日期" :class="{ 'low-confidence': isLowConfidence('date') }">
            <el-date-picker
              v-model="ocrData.fields.date.value"
              type="date"
              format="yyyy-MM-dd"
              value-format="yyyy-MM-dd"
              @change="applyOcrToForm"
            />
          </el-form-item>
          <el-form-item label="商家" :class="{ 'low-confidence': isLowConfidence('merchant') }">
            <el-input v-model="ocrData.fields.merchant.value" @blur="applyOcrToForm" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="ocrData.fields.remark.value" @blur="applyOcrToForm" />
          </el-form-item>
        </el-form>
        <div class="ocr-actions">
          <el-button size="small" type="primary" icon="el-icon-check" @click="applyAllOcrData">
            应用到表单
          </el-button>
          <el-button size="small" icon="el-icon-refresh" @click="reRecognizeReceipt">
            重新识别
          </el-button>
        </div>
      </div>

      <div class="actions">
        <el-button size="large" @click="resetForm">重置</el-button>
        <el-button
          type="primary"
          size="large"
          :disabled="!canSubmit"
          @click="handleSubmit"
          :class="form.type === 'expense' ? 'expense-btn' : 'income-btn'"
        >
          保存
        </el-button>
      </div>
    </el-card>

    <div class="recent-records" v-if="todayRecords.length > 0">
      <div class="section-title">今日记录</div>
      <el-card class="card" shadow="never">
        <div class="record-item" v-for="record in todayRecords" :key="record.id">
          <div class="record-left">
            <div
              class="record-icon"
              :style="{ backgroundColor: getCategory(record.categoryId)?.color + '20', color: getCategory(record.categoryId)?.color }"
            >
              {{ getCategory(record.categoryId)?.icon }}
            </div>
            <div class="record-info">
              <div class="record-category">{{ getCategory(record.categoryId)?.name }}</div>
              <div class="record-remark" v-if="record.remark">{{ record.remark }}</div>
              <div v-if="record.receiptIds && record.receiptIds.length > 0" class="record-receipts">
                <i class="el-icon-picture"></i> {{ record.receiptIds.length }} 张票据
              </div>
            </div>
          </div>
          <div class="record-amount" :class="record.type">
            {{ record.type === 'income' ? '+' : '-' }}{{ formatMoney(record.amount) }}
          </div>
        </div>
      </el-card>
    </div>

    <ReceiptViewer
      :visible="viewerVisible"
      :images="viewerImages"
      :receipts="uploadedReceipts"
      :start-index="selectedReceiptIndex"
      title="票据预览"
      @close="viewerVisible = false"
      @delete="handleDeleteReceipt"
    />
  </div>
</template>

<script>
import { recordApi, categoryApi, receiptApi, ocrApi } from '@/api'
import { formatMoney, formatDate } from '@/utils'
import ReceiptUpload from '@/components/ReceiptUpload.vue'
import ReceiptViewer from '@/components/ReceiptViewer.vue'

export default {
  name: 'QuickAdd',
  components: {
    ReceiptUpload,
    ReceiptViewer
  },
  data() {
    return {
      currentDate: formatDate(new Date()),
      categories: [],
      records: [],
      form: {
        type: 'expense',
        amount: '',
        categoryId: '',
        categoryName: '',
        accountId: '',
        accountName: '',
        remark: '',
        date: formatDate(new Date())
      },
      showOcrTip: false,
      uploadedReceipts: [],
      currentRecordId: null,
      ocrData: null,
      currentOcrReceiptId: null,
      viewerVisible: false,
      selectedReceiptIndex: 0,
      lowConfidenceThreshold: 0.7
    }
  },
  computed: {
    filteredCategories() {
      return this.categories.filter(c => c.type === this.form.type)
    },
    canSubmit() {
      return this.form.amount && parseFloat(this.form.amount) > 0 && this.form.categoryId
    },
    todayRecords() {
      const today = formatDate(new Date())
      return this.records.filter(r => r.date === today).slice(0, 10)
    },
    viewerImages() {
      return this.uploadedReceipts.map(r => r.imageUrl || r.thumbnailUrl)
    }
  },
  watch: {
    currentDate(val) {
      this.form.date = val
    },
    'form.type'() {
      this.form.categoryId = ''
      this.form.categoryName = ''
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    formatMoney,
    async loadData() {
      const [records, categories] = await Promise.all([
        recordApi.getRecords(),
        categoryApi.getCategories()
      ])
      this.records = records || []
      this.categories = categories || []
    },
    getCategory(id) {
      return this.categories.find(c => c.id === id)
    },
    switchType(type) {
      if (this.form.type !== type) {
        this.form.type = type
        this.form.categoryId = ''
        this.form.categoryName = ''
      }
    },
    selectCategory(cat) {
      this.form.categoryId = cat.id
      this.form.categoryName = cat.name
    },
    async handleReceiptUploaded(receipt) {
      this.uploadedReceipts.push(receipt)
      this.$message.success('图片上传成功')
      this.$nextTick(() => {
        this.startOcrRecognition(receipt.id)
      })
    },
    handleReceiptRemoved(receiptId) {
      const index = this.uploadedReceipts.findIndex(r => r.id === receiptId)
      if (index !== -1) {
        this.uploadedReceipts.splice(index, 1)
        if (this.currentOcrReceiptId === receiptId) {
          this.ocrData = null
          this.currentOcrReceiptId = null
        }
      }
    },
    async startOcrRecognition(receiptId) {
      const receipt = this.uploadedReceipts.find(r => r.id === receiptId)
      if (!receipt) return

      receipt.ocrStatus = 'pending'

      try {
        const result = await ocrApi.recognize(receiptId)
        if (result && result.success) {
          receipt.ocrStatus = 'success'
          receipt.ocrData = result.data
          this.ocrData = result.data
          this.currentOcrReceiptId = receiptId
          this.autoFillFromOcr(result.data)
          this.$message.success('OCR 识别完成')
        } else {
          receipt.ocrStatus = 'failed'
          this.$message.error('OCR 识别失败')
        }
      } catch (error) {
        console.error('OCR recognition error:', error)
        receipt.ocrStatus = 'failed'
        this.$message.error('OCR 识别异常')
      }
    },
    autoFillFromOcr(ocrData) {
      const fields = ocrData.fields
      if (!fields) return

      if (fields.amount && fields.amount.value && !this.form.amount) {
        this.form.amount = fields.amount.value
      }
      if (fields.date && fields.date.value && !this.form.date) {
        this.form.date = fields.date.value
        this.currentDate = fields.date.value
      }
      if (fields.merchant && fields.merchant.value) {
        const existingRemark = this.form.remark || ''
        const merchantRemark = fields.merchant.value
        if (!existingRemark.includes(merchantRemark)) {
          this.form.remark = existingRemark ? `${existingRemark} - ${merchantRemark}` : merchantRemark
        }
      }
      if (fields.remark && fields.remark.value && !this.form.remark) {
        this.form.remark = fields.remark.value
      }

      if (fields.items && fields.items.value && fields.items.value.length > 0) {
        const itemsText = fields.items.value.map(item => `${item.name} x${item.quantity || 1}`).join(', ')
        if (itemsText && !this.form.remark.includes(itemsText)) {
          this.form.remark = this.form.remark ? `${this.form.remark} - ${itemsText}` : itemsText
        }
      }
    },
    applyOcrToForm() {
      if (!this.ocrData || !this.ocrData.fields) return
      this.autoFillFromOcr(this.ocrData)
    },
    applyAllOcrData() {
      if (!this.ocrData || !this.ocrData.fields) return
      const fields = this.ocrData.fields
      
      if (fields.amount && fields.amount.value) {
        this.form.amount = fields.amount.value
      }
      if (fields.date && fields.date.value) {
        this.form.date = fields.date.value
        this.currentDate = fields.date.value
      }
      if (fields.merchant && fields.merchant.value) {
        const merchantRemark = fields.merchant.value
        this.form.remark = merchantRemark
      }
      if (fields.remark && fields.remark.value) {
        this.form.remark = fields.remark.value
      }

      this.$message.success('已应用 OCR 识别结果')
    },
    async reRecognizeReceipt() {
      if (this.currentOcrReceiptId) {
        await this.startOcrRecognition(this.currentOcrReceiptId)
      }
    },
    isLowConfidence(field) {
      if (!this.ocrData || !this.ocrData.fields || !this.ocrData.fields[field]) {
        return false
      }
      return this.ocrData.fields[field].confidence < this.lowConfidenceThreshold
    },
    getConfidenceType(confidence) {
      if (confidence >= 0.8) return 'success'
      if (confidence >= 0.6) return 'warning'
      return 'danger'
    },
    openReceiptViewer(index) {
      this.selectedReceiptIndex = index
      this.viewerVisible = true
    },
    async handleDeleteReceipt(receiptId) {
      try {
        await receiptApi.deleteReceipt(receiptId)
        this.handleReceiptRemoved(receiptId)
        this.$message.success('删除成功')
      } catch (error) {
        console.error('Delete receipt error:', error)
        this.$message.error('删除失败')
      }
    },
    async handleSubmit() {
      if (!this.canSubmit) return
      
      const record = {
        ...this.form,
        amount: parseFloat(this.form.amount),
        receiptIds: this.uploadedReceipts.map(r => r.id)
      }
      
      const result = await recordApi.addRecord(record)
      if (result) {
        if (this.uploadedReceipts.length > 0) {
          for (const receipt of this.uploadedReceipts) {
            await receiptApi.linkToRecord(receipt.id, result.id)
          }
        }
        this.$message.success('记账成功')
        this.resetForm()
        this.loadData()
      } else {
        this.$message.error('记账失败')
      }
    },
    resetForm() {
      this.form = {
        type: 'expense',
        amount: '',
        categoryId: '',
        categoryName: '',
        remark: '',
        date: this.currentDate
      }
      this.uploadedReceipts = []
      this.ocrData = null
      this.currentOcrReceiptId = null
      this.currentRecordId = null
      if (this.$refs.receiptUpload) {
        this.$refs.receiptUpload.clearAll()
      }
      this.$nextTick(() => {
        if (this.$refs.amountInput) {
          this.$refs.amountInput.focus()
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.quick-add {
  max-width: 700px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  .page-title {
    font-size: 22px;
    font-weight: 600;
    color: $text-primary;
  }
  
  .date-picker {
    width: 160px;
  }
}

.form-card {
  padding: 8px;
  margin-bottom: 24px;
}

.type-switch {
  display: flex;
  margin-bottom: 24px;
  gap: 12px;
  
  .type-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 16px 0;
    font-size: 16px;
    font-weight: 500;
    border-radius: 12px;
    border: 2px solid #e4e7ed;
    background: #f5f7fa;
    color: $text-regular;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    outline: none;
    
    &:hover {
      background: #e8eaed;
      color: $text-primary;
      transform: translateY(-2px);
    }
    
    &:active {
      transform: translateY(0);
    }
    
    .type-icon {
      font-size: 24px;
    }
    
    .type-label {
      font-size: 15px;
      font-weight: 500;
    }
    
    .type-indicator {
      position: absolute;
      bottom: -1px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 4px;
      border-radius: 2px;
    }
    
    &.active.expense-btn {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
      color: #fff;
      border-color: #ff6b6b;
      box-shadow: 0 6px 20px rgba(255, 107, 107, 0.35);
      
      .type-indicator {
        background: #fff;
      }
    }
    
    &.active.income-btn {
      background: linear-gradient(135deg, #67C23A 0%, #52a82a 100%);
      color: #fff;
      border-color: #67C23A;
      box-shadow: 0 6px 20px rgba(103, 194, 58, 0.35);
      
      .type-indicator {
        background: #fff;
      }
    }
  }
}

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-left: 8px;
  
  &.expense {
    background: rgba(245, 108, 108, 0.1);
    color: #F56C6C;
  }
  
  &.income {
    background: rgba(103, 194, 58, 0.1);
    color: #67C23A;
  }
}

.empty-categories {
  padding: 30px 0;
  
  ::v-deep .el-empty__description {
    margin-bottom: 16px;
  }
}

.amount-section {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  
  .currency {
    font-size: 32px;
    font-weight: 600;
    color: $text-primary;
    margin-right: 8px;
  }
  
  .amount-input {
    width: 240px;
    
    ::v-deep .el-input__inner {
      font-size: 36px;
      font-weight: 600;
      text-align: center;
      border: none;
      border-bottom: 2px solid $border-color;
      border-radius: 0;
      padding: 8px 0;
      background: transparent;
      
      &:focus {
        border-bottom-color: $primary-color;
      }
    }
    
    &.expense-input ::v-deep .el-input__inner:focus {
      border-bottom-color: $expense-color;
    }
    
    &.income-input ::v-deep .el-input__inner:focus {
      border-bottom-color: $income-color;
    }
  }
  
  .ocr-confidence {
    position: absolute;
    right: 0;
    top: 0;
    margin: 0;
  }
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: $text-regular;
  margin-bottom: 12px;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  background: #fafafa;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  &.active {
    background: #fff;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
  
  .category-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    margin-bottom: 6px;
  }
  
  .category-name {
    font-size: 13px;
    color: $text-regular;
  }
}

.remark-section {
  margin-bottom: 24px;
  
  .remark-input {
    ::v-deep .el-input__inner {
      border-radius: 8px;
    }
  }
}

.actions {
  display: flex;
  gap: 12px;
  
  .el-button {
    flex: 1;
    border-radius: 8px;
    font-size: 15px;
    padding: 12px 0;
    
    &.expense-btn {
      background: $expense-color;
      border-color: $expense-color;
      
      &:hover {
        background: darken($expense-color, 5%);
        border-color: darken($expense-color, 5%);
      }
    }
    
    &.income-btn {
      background: $income-color;
      border-color: $income-color;
      
      &:hover {
        background: darken($income-color, 5%);
        border-color: darken($income-color, 5%);
      }
    }
  }
}

.recent-records {
  .record-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #f0f2f5;
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  .record-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .record-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }
  
  .record-category {
    font-size: 14px;
    color: $text-primary;
    font-weight: 500;
  }
  
  .record-remark {
    font-size: 12px;
    color: $text-secondary;
    margin-top: 2px;
  }
  
  .record-amount {
    font-size: 16px;
    font-weight: 600;
    
    &.income {
      color: $income-color;
    }
    
    &.expense {
      color: $expense-color;
    }
  }
  
  .record-receipts {
    font-size: 12px;
    color: $text-secondary;
    margin-top: 2px;
    
    i {
      margin-right: 4px;
    }
  }
}

.ocr-confidence {
  margin-left: 12px;
  margin-top: 8px;
}

.receipt-section {
  margin-bottom: 24px;
}

.ocr-tip {
  margin-bottom: 16px;
}

.uploaded-receipts {
  margin-top: 16px;
}

.receipt-thumbnails {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.receipt-thumbnail {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  &:hover {
    transform: scale(1.05);
  }
  
  &.active {
    border-color: $primary-color;
    box-shadow: 0 2px 8px rgba($primary-color, 0.3);
  }
  
  .ocr-status {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    font-size: 11px;
    padding: 2px 4px;
    text-align: center;
    color: #fff;
    
    &.pending {
      background: rgba(230, 162, 60, 0.9);
    }
    
    &.success {
      background: rgba(103, 194, 58, 0.9);
    }
    
    &.failed {
      background: rgba(245, 108, 108, 0.9);
    }
    
    i {
      margin-right: 2px;
    }
  }
}

.ocr-result-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  
  .low-confidence {
    .el-form-item__label {
      color: #F56C6C;
    }
    
    ::v-deep .el-input__inner {
      border-color: #F56C6C;
      background: #fef0f0;
    }
  }
  
  .low-confidence-tip {
    color: #F56C6C;
    font-size: 12px;
    margin-left: 8px;
    
    i {
      margin-right: 2px;
    }
  }
}

.ocr-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
