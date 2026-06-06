<template>
  <div class="ocr-result">
    <div class="ocr-header" v-if="ocrData">
      <div class="header-left">
        <span class="title">OCR 识别结果</span>
        <el-tag
          :type="getConfidenceType(ocrData.confidence)"
          size="small"
          style="margin-left: 8px"
        >
          置信度 {{ (ocrData.confidence * 100).toFixed(0) }}%
        </el-tag>
      </div>
      <div class="header-right">
        <el-button
          size="mini"
          icon="el-icon-refresh"
          @click="$emit('re-recognize')"
          :loading="loading"
        >
          重新识别
        </el-button>
        <el-button
          size="mini"
          type="primary"
          icon="el-icon-check"
          @click="applyToForm"
          v-if="showApplyButton"
        >
          应用到表单
        </el-button>
      </div>
    </div>

    <div class="ocr-fields" v-if="ocrData && ocrData.fields">
      <div class="field-item" :class="{ 'low-confidence': isLowConfidence('amount') }">
        <div class="field-label">
          <span>金额</span>
          <el-tooltip
            v-if="ocrData.fields.amount"
            :content="`置信度: ${(ocrData.fields.amount.confidence * 100).toFixed(0)}%`"
            placement="top"
          >
            <el-tag
              :type="getFieldConfidenceType(ocrData.fields.amount?.confidence)"
              size="mini"
              class="confidence-tag"
            >
              {{ (ocrData.fields.amount?.confidence * 100).toFixed(0) }}%
            </el-tag>
          </el-tooltip>
        </div>
        <div class="field-value">
          <span class="original-value" v-if="ocrData.fields.amount?.value">
            ¥{{ ocrData.fields.amount.value.toFixed(2) }}
          </span>
          <el-input-number
            v-model="correctedData.amount"
            :precision="2"
            :step="1"
            :min="0"
            size="small"
            placeholder="请输入金额"
            :class="{ 'has-correction': ocrData.fields.amount?.correctedValue !== undefined }"
          />
          <span
            class="corrected-badge"
            v-if="ocrData.fields.amount?.correctedValue !== undefined"
          >
            已修正
          </span>
        </div>
      </div>

      <div class="field-item" :class="{ 'low-confidence': isLowConfidence('date') }">
        <div class="field-label">
          <span>日期</span>
          <el-tooltip
            v-if="ocrData.fields.date"
            :content="`置信度: ${(ocrData.fields.date.confidence * 100).toFixed(0)}%`"
            placement="top"
          >
            <el-tag
              :type="getFieldConfidenceType(ocrData.fields.date?.confidence)"
              size="mini"
              class="confidence-tag"
            >
              {{ (ocrData.fields.date?.confidence * 100).toFixed(0) }}%
            </el-tag>
          </el-tooltip>
        </div>
        <div class="field-value">
          <span class="original-value" v-if="ocrData.fields.date?.value">
            {{ ocrData.fields.date.value }}
          </span>
          <el-date-picker
            v-model="correctedData.date"
            type="date"
            format="yyyy-MM-dd"
            value-format="yyyy-MM-dd"
            size="small"
            placeholder="请选择日期"
            style="width: 180px"
            :class="{ 'has-correction': ocrData.fields.date?.correctedValue !== undefined }"
          />
          <span
            class="corrected-badge"
            v-if="ocrData.fields.date?.correctedValue !== undefined"
          >
            已修正
          </span>
        </div>
      </div>

      <div class="field-item" :class="{ 'low-confidence': isLowConfidence('merchant') }">
        <div class="field-label">
          <span>商家</span>
          <el-tooltip
            v-if="ocrData.fields.merchant"
            :content="`置信度: ${(ocrData.fields.merchant.confidence * 100).toFixed(0)}%`"
            placement="top"
          >
            <el-tag
              :type="getFieldConfidenceType(ocrData.fields.merchant?.confidence)"
              size="mini"
              class="confidence-tag"
            >
              {{ (ocrData.fields.merchant?.confidence * 100).toFixed(0) }}%
            </el-tag>
          </el-tooltip>
        </div>
        <div class="field-value">
          <span class="original-value" v-if="ocrData.fields.merchant?.value">
            {{ ocrData.fields.merchant.value }}
          </span>
          <el-input
            v-model="correctedData.merchant"
            size="small"
            placeholder="请输入商家名称"
            style="width: 250px"
            :class="{ 'has-correction': ocrData.fields.merchant?.correctedValue !== undefined }"
          />
          <span
            class="corrected-badge"
            v-if="ocrData.fields.merchant?.correctedValue !== undefined"
          >
            已修正
          </span>
        </div>
      </div>
    </div>

    <div class="ocr-items" v-if="ocrData?.items && ocrData.items.length > 0">
      <div class="section-title">商品明细</div>
      <el-table :data="correctedItems" size="small" border>
        <el-table-column prop="name" label="商品名称" min-width="150">
          <template slot-scope="scope">
            <el-input
              v-model="scope.row.name"
              size="mini"
              @change="markItemModified(scope.$index)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="100">
          <template slot-scope="scope">
            <el-input-number
              v-model="scope.row.quantity"
              :min="0"
              size="mini"
              @change="markItemModified(scope.$index)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="price" label="单价" width="120">
          <template slot-scope="scope">
            <el-input-number
              v-model="scope.row.price"
              :precision="2"
              :min="0"
              size="mini"
              @change="markItemModified(scope.$index)"
            />
          </template>
        </el-table-column>
        <el-table-column label="小计" width="120">
          <template slot-scope="scope">
            <span class="item-total">
              ¥{{ calculateItemTotal(scope.row).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template slot-scope="scope">
            <el-button
              type="text"
              size="mini"
              icon="el-icon-delete"
              @click="removeItem(scope.$index)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="items-total">
        <span>合计:</span>
        <span class="total-amount">¥{{ calculateItemsTotal().toFixed(2) }}</span>
        <el-button size="mini" icon="el-icon-plus" @click="addItem" style="margin-left: auto">
          添加商品
        </el-button>
      </div>
    </div>

    <div class="ocr-raw" v-if="ocrData?.rawText">
      <div class="section-title">原始文本</div>
      <div class="raw-text">
        <pre>{{ ocrData.rawText }}</pre>
      </div>
    </div>

    <div class="ocr-empty" v-if="!ocrData && !loading">
      <el-empty description="暂无识别结果，请上传图片后点击识别" :image-size="100">
        <el-button type="primary" icon="el-icon-camera" @click="$emit('upload')">
          上传图片
        </el-button>
      </el-empty>
    </div>

    <div class="ocr-loading" v-if="loading">
      <el-loading fullscreen-text="正在识别中，请稍候..." :loading="loading">
        <div style="height: 200px; display: flex; align-items: center; justify-content: center">
          <div class="loading-content">
            <i class="el-icon-loading" style="font-size: 32px; color: #409eff"></i>
            <p style="margin-top: 12px; color: #606266">正在识别票据信息...</p>
          </div>
        </div>
      </el-loading>
    </div>

    <div class="ocr-actions" v-if="hasCorrections">
      <el-button
        type="primary"
        icon="el-icon-check"
        @click="saveCorrections"
        :loading="saving"
      >
        保存修正
      </el-button>
      <el-button @click="resetCorrections">
        重置
      </el-button>
    </div>
  </div>
</template>

<script>
import { ocrApi } from '@/api'

export default {
  name: 'OcrResult',
  props: {
    receiptId: {
      type: String,
      default: null
    },
    ocrData: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    },
    showApplyButton: {
      type: Boolean,
      default: false
    },
    lowConfidenceThreshold: {
      type: Number,
      default: 0.7
    }
  },
  data() {
    return {
      correctedData: {
        amount: null,
        date: '',
        merchant: ''
      },
      correctedItems: [],
      modifiedItems: new Set(),
      saving: false
    }
  },
  computed: {
    hasCorrections() {
      if (!this.ocrData) return false
      
      const fields = this.ocrData.fields || {}
      
      if (this.correctedData.amount !== null && 
          this.correctedData.amount !== fields.amount?.value) {
        return true
      }
      if (this.correctedData.date && 
          this.correctedData.date !== fields.date?.value) {
        return true
      }
      if (this.correctedData.merchant && 
          this.correctedData.merchant !== fields.merchant?.value) {
        return true
      }
      
      if (this.modifiedItems.size > 0) {
        return true
      }
      
      return false
    }
  },
  watch: {
    ocrData: {
      handler(val) {
        this.resetCorrections()
      },
      deep: true
    }
  },
  methods: {
    getConfidenceType(confidence) {
      if (confidence >= 0.8) return 'success'
      if (confidence >= 0.6) return 'warning'
      return 'danger'
    },

    getFieldConfidenceType(confidence) {
      if (confidence === undefined || confidence === null) return 'info'
      if (confidence >= 0.8) return 'success'
      if (confidence >= 0.6) return 'warning'
      return 'danger'
    },

    isLowConfidence(field) {
      const fields = this.ocrData?.fields
      if (!fields || !fields[field]) return false
      return fields[field].confidence < this.lowConfidenceThreshold
    },

    applyToForm() {
      const data = {
        amount: this.correctedData.amount || this.ocrData?.fields?.amount?.value,
        date: this.correctedData.date || this.ocrData?.fields?.date?.value,
        merchant: this.correctedData.merchant || this.ocrData?.fields?.merchant?.value,
        items: this.correctedItems
      }
      this.$emit('apply', data)
    },

    calculateItemTotal(item) {
      const quantity = Number(item.quantity) || 0
      const price = Number(item.price) || 0
      return item.total || quantity * price
    },

    calculateItemsTotal() {
      return this.correctedItems.reduce((sum, item) => sum + this.calculateItemTotal(item), 0)
    },

    markItemModified(index) {
      this.modifiedItems.add(index)
    },

    addItem() {
      this.correctedItems.push({
        name: '',
        quantity: 1,
        price: 0,
        total: 0
      })
      this.modifiedItems.add(this.correctedItems.length - 1)
    },

    removeItem(index) {
      this.correctedItems.splice(index, 1)
      this.modifiedItems.delete(index)
      
      const newModified = new Set()
      this.modifiedItems.forEach(i => {
        if (i > index) {
          newModified.add(i - 1)
        } else if (i < index) {
          newModified.add(i)
        }
      })
      this.modifiedItems = newModified
    },

    resetCorrections() {
      if (!this.ocrData) {
        this.correctedData = {
          amount: null,
          date: '',
          merchant: ''
        }
        this.correctedItems = []
      } else {
        const fields = this.ocrData.fields || {}
        this.correctedData = {
          amount: fields.amount?.correctedValue !== undefined ? fields.amount.correctedValue : fields.amount?.value || null,
          date: fields.date?.correctedValue !== undefined ? fields.date.correctedValue : fields.date?.value || '',
          merchant: fields.merchant?.correctedValue !== undefined ? fields.merchant.correctedValue : fields.merchant?.value || ''
        }
        this.correctedItems = this.ocrData.items ? JSON.parse(JSON.stringify(this.ocrData.items)) : []
      }
      this.modifiedItems.clear()
    },

    async saveCorrections() {
      if (!this.receiptId) {
        this.$message.error('缺少票据ID')
        return
      }

      this.saving = true
      try {
        const correctedData = {}
        
        if (this.correctedData.amount !== null && 
            this.correctedData.amount !== this.ocrData?.fields?.amount?.value) {
          correctedData.amount = this.correctedData.amount
        }
        if (this.correctedData.date && 
            this.correctedData.date !== this.ocrData?.fields?.date?.value) {
          correctedData.date = this.correctedData.date
        }
        if (this.correctedData.merchant && 
            this.correctedData.merchant !== this.ocrData?.fields?.merchant?.value) {
          correctedData.merchant = this.correctedData.merchant
        }
        if (this.modifiedItems.size > 0) {
          correctedData.items = this.correctedItems
        }

        const result = await ocrApi.correctResult(this.receiptId, correctedData)
        if (result) {
          this.$message.success('修正已保存')
          this.$emit('corrected', result)
          this.modifiedItems.clear()
        } else {
          this.$message.error('保存失败')
        }
      } catch (error) {
        console.error('Save corrections error:', error)
        this.$message.error('保存失败')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.ocr-result {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.ocr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;

  .title {
    font-size: 16px;
    font-weight: 600;
    color: $text-primary;
  }
}

.ocr-fields {
  margin-bottom: 20px;

  .field-item {
    display: flex;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px dashed #ebeef5;

    &:last-child {
      border-bottom: none;
    }

    &.low-confidence {
      background: #fef0f0;
      border-radius: 4px;
      padding: 12px 8px;
      margin: 0 -8px;
    }

    .field-label {
      width: 100px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: $text-regular;
      flex-shrink: 0;

      .confidence-tag {
        margin-left: 4px;
      }
    }

    .field-value {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;

      .original-value {
        color: $text-secondary;
        text-decoration: line-through;
        margin-right: 8px;
      }

      .has-correction {
        border-color: #67c23a;
      }

      .corrected-badge {
        color: #67c23a;
        font-size: 12px;
        background: #f0f9eb;
        padding: 2px 8px;
        border-radius: 10px;
      }

      ::v-deep .el-input__inner {
        border-color: $border-color;
      }

      ::v-deep .el-input-number {
        .el-input__inner {
          border-color: $border-color;
        }

        &.has-correction .el-input__inner {
          border-color: #67c23a;
        }
      }
    }
  }
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 12px;
}

.ocr-items {
  margin-bottom: 20px;

  .items-total {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 0 0 4px 4px;
    border: 1px solid #ebeef5;
    border-top: none;

    .total-amount {
      font-size: 16px;
      font-weight: 600;
      color: $expense-color;
    }
  }

  .item-total {
    color: $expense-color;
    font-weight: 500;
  }
}

.ocr-raw {
  margin-bottom: 20px;

  .raw-text {
    background: #f5f7fa;
    border-radius: 6px;
    padding: 12px;
    max-height: 200px;
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

.ocr-empty {
  padding: 40px 0;
}

.ocr-loading {
  .loading-content {
    text-align: center;
  }
}

.ocr-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}
</style>
