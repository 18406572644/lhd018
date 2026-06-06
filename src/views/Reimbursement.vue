<template>
  <div class="page-container reimbursement">
    <div class="header">
      <h2 class="page-title">报销管理</h2>
      <div class="header-actions">
        <el-button
          type="primary"
          icon="el-icon-plus"
          @click="showCreateDialog"
        >
          新建报销单
        </el-button>
      </div>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon pending">📋</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pending || 0 }}</div>
              <div class="stat-label">待报销票据</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon processing">⏳</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.processing || 0 }}</div>
              <div class="stat-label">报销中</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon approved">✅</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.approved || 0 }}</div>
              <div class="stat-label">已报销 (¥{{ formatMoney(stats.approvedAmount || 0) }})</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon total">💰</div>
            <div class="stat-info">
              <div class="stat-value">¥{{ formatMoney(stats.reimbursableAmount || 0) }}</div>
              <div class="stat-label">可报销总金额</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="card" shadow="never">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="报销单" name="reimbursements">
          <div class="tab-header">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索报销单名称"
              prefix-icon="el-icon-search"
              clearable
              style="width: 250px"
            >
            </el-input>
            <el-select
              v-model="statusFilter"
              placeholder="状态筛选"
              clearable
              style="width: 150px; margin-left: 12px"
            >
              <el-option label="待审批" value="pending" />
              <el-option label="已批准" value="approved" />
              <el-option label="已报销" value="reimbursed" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>
          </div>

          <el-table
            :data="filteredReimbursements"
            v-loading="loading"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="name" label="报销单名称" min-width="200" />
            <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
            <el-table-column label="票据数量" width="100">
              <template slot-scope="scope">
                {{ scope.row.receiptIds?.length || 0 }}
              </template>
            </el-table-column>
            <el-table-column label="金额" width="120">
              <template slot-scope="scope">
                <span class="amount">¥{{ formatMoney(scope.row.totalAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="applicant" label="申请人" width="100" />
            <el-table-column prop="approver" label="审批人" width="100" />
            <el-table-column prop="submitDate" label="提交日期" width="120" />
            <el-table-column label="状态" width="100">
              <template slot-scope="scope">
                <el-tag :type="getStatusType(scope.row.status)" size="mini">
                  {{ getStatusText(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template slot-scope="scope">
                <el-button
                  type="text"
                  size="mini"
                  icon="el-icon-view"
                  @click="viewReimbursement(scope.row)"
                >
                  查看
                </el-button>
                <el-button
                  type="text"
                  size="mini"
                  icon="el-icon-download"
                  @click="exportReimbursement(scope.row)"
                >
                  导出
                </el-button>
                <el-button
                  type="text"
                  size="mini"
                  icon="el-icon-delete"
                  @click="deleteReimbursement(scope.row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-empty
            v-if="filteredReimbursements.length === 0 && !loading"
            description="暂无报销单"
            class="empty-state"
          >
            <el-button type="primary" icon="el-icon-plus" @click="showCreateDialog">
              创建第一个报销单
            </el-button>
          </el-empty>
        </el-tab-pane>

        <el-tab-pane label="待报销票据" name="pending-receipts">
          <div class="tab-header">
            <el-input
              v-model="receiptSearchKeyword"
              placeholder="搜索商家、金额"
              prefix-icon="el-icon-search"
              clearable
              style="width: 250px"
            />
            <el-button
              type="primary"
              icon="el-icon-document-add"
              @click="batchCreateReimbursement"
              :disabled="selectedReceipts.length === 0"
              style="margin-left: auto"
            >
              批量生成报销单 ({{ selectedReceipts.length }})
            </el-button>
          </div>

          <el-table
            :data="filteredPendingReceipts"
            v-loading="loading"
            @selection-change="handleReceiptSelectionChange"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column label="图片" width="80">
              <template slot-scope="scope">
                <img
                  :src="getThumbnail(scope.row)"
                  class="list-thumbnail"
                  @click="openReceiptViewer(scope.row)"
                />
              </template>
            </el-table-column>
            <el-table-column label="金额" width="100">
              <template slot-scope="scope">
                <span class="amount" v-if="scope.row.amount">
                  ¥{{ formatMoney(scope.row.amount) }}
                </span>
                <span v-else class="no-data">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="merchant" label="商家" min-width="150" />
            <el-table-column prop="category" label="分类" width="120" />
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column label="OCR状态" width="100">
              <template slot-scope="scope">
                <el-tag
                  v-if="scope.row.ocrText"
                  :type="scope.row.ocrConfidence >= 0.8 ? 'success' : 'warning'"
                  size="mini"
                >
                  {{ (scope.row.ocrConfidence * 100).toFixed(0) }}%
                </el-tag>
                <el-button
                  v-else
                  type="text"
                  size="mini"
                  icon="el-icon-search"
                  @click="recognizeReceipt(scope.row)"
                  :loading="recognizing[scope.row.id]"
                >
                  识别
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template slot-scope="scope">
                <el-button
                  type="text"
                  size="mini"
                  icon="el-icon-view"
                  @click="openReceiptViewer(scope.row)"
                >
                  查看
                </el-button>
                <el-button
                  type="text"
                  size="mini"
                  icon="el-icon-document-add"
                  @click="addToReimbursement(scope.row)"
                >
                  加入报销
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-empty
            v-if="pendingReceipts.length === 0 && !loading"
            description="暂无待报销票据"
            class="empty-state"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog
      title="新建报销单"
      :visible.sync="createDialogVisible"
      width="700px"
      @closed="resetCreateForm"
    >
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="报销单名称">
          <el-input v-model="createForm.name" placeholder="请输入报销单名称" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="2"
            placeholder="请输入说明"
          />
        </el-form-item>
        <el-form-item label="申请人">
          <el-input v-model="createForm.applicant" placeholder="请输入申请人" />
        </el-form-item>
        <el-form-item label="审批人">
          <el-input v-model="createForm.approver" placeholder="请输入审批人" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="createForm.notes"
            type="textarea"
            :rows="2"
            placeholder="请输入备注"
          />
        </el-form-item>
        <el-form-item label="选择票据">
          <div class="receipt-selector">
            <div class="selected-info">
              已选择 {{ selectedReceiptsForCreate.length }} 张，金额 ¥{{ formatMoney(selectedTotal) }}
            </div>
            <el-checkbox
              v-model="selectAllReceipts"
              :indeterminate="isIndeterminate"
              @change="handleSelectAllReceipts"
              style="margin-left: auto"
            >
              全选
            </el-checkbox>
          </div>
          <div class="receipt-list">
            <div
              class="receipt-item"
              v-for="receipt in pendingReceipts"
              :key="receipt.id"
              :class="{ selected: selectedReceiptsForCreate.includes(receipt.id) }"
              @click="toggleReceiptSelection(receipt.id)"
            >
              <el-checkbox
                :model="selectedReceiptsForCreate.includes(receipt.id)"
                @click.stop
              />
              <img :src="getThumbnail(receipt)" class="receipt-thumb" />
              <div class="receipt-info">
                <div class="receipt-amount">¥{{ formatMoney(receipt.amount) }}</div>
                <div class="receipt-merchant">{{ receipt.merchant || '未识别' }}</div>
                <div class="receipt-date">{{ receipt.date }}</div>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createReimbursement" :loading="creating">
          创建报销单
        </el-button>
      </div>
    </el-dialog>

    <el-dialog
      title="报销单详情"
      :visible.sync="detailDialogVisible"
      width="800px"
    >
      <div class="reimbursement-detail" v-if="currentReimbursement">
        <div class="detail-header">
          <h3>{{ currentReimbursement.name }}</h3>
          <el-tag :type="getStatusType(currentReimbursement.status)" size="medium">
            {{ getStatusText(currentReimbursement.status) }}
          </el-tag>
        </div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="说明">
            {{ currentReimbursement.description || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="总金额">
            <span class="amount">¥{{ formatMoney(currentReimbursement.totalAmount) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="申请人">
            {{ currentReimbursement.applicant || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="审批人">
            {{ currentReimbursement.approver || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="提交日期">
            {{ currentReimbursement.submitDate }}
          </el-descriptions-item>
          <el-descriptions-item label="报销日期">
            {{ currentReimbursement.reimbursedDate || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            {{ currentReimbursement.notes || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-title">票据明细 ({{ currentReimbursement.receiptIds?.length || 0 }} 张)</div>
        <el-table :data="currentReimbursementReceipts" size="small">
          <el-table-column label="图片" width="80">
            <template slot-scope="scope">
              <img
                :src="getThumbnail(scope.row)"
                class="detail-thumb"
                @click="openReceiptViewer(scope.row)"
              />
            </template>
          </el-table-column>
          <el-table-column label="金额" width="100">
            <template slot-scope="scope">
              <span class="amount">¥{{ formatMoney(scope.row.amount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="merchant" label="商家" min-width="150" />
          <el-table-column prop="category" label="分类" width="120" />
          <el-table-column prop="date" label="日期" width="120" />
        </el-table>

        <div class="detail-actions" v-if="currentReimbursement.status === 'pending'">
          <el-button type="success" icon="el-icon-check" @click="approveReimbursement">
            批准
          </el-button>
          <el-button type="primary" icon="el-icon-coin" @click="markReimbursed">
            标记已报销
          </el-button>
          <el-button type="danger" icon="el-icon-close" @click="rejectReimbursement">
            拒绝
          </el-button>
        </div>
        <div class="detail-actions" v-else-if="currentReimbursement.status === 'approved'">
          <el-button type="primary" icon="el-icon-coin" @click="markReimbursed">
            标记已报销
          </el-button>
        </div>
      </div>
      <div slot="footer">
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="exportReimbursement(currentReimbursement)">
          导出
        </el-button>
      </div>
    </el-dialog>

    <ReceiptViewer
      :visible.sync="showViewer"
      :images="viewerImages"
      :receipts="viewerReceipts"
      :start-index="viewerStartIndex"
      @updated="handleReceiptUpdated"
    />
  </div>
</template>

<script>
import { reimbursementApi, receiptApi, ocrApi } from '@/api'
import { formatMoney } from '@/utils'
import ReceiptViewer from '@/components/ReceiptViewer.vue'

export default {
  name: 'Reimbursement',
  components: {
    ReceiptViewer
  },
  data() {
    return {
      loading: false,
      creating: false,
      activeTab: 'reimbursements',
      searchKeyword: '',
      statusFilter: '',
      receiptSearchKeyword: '',
      reimbursements: [],
      pendingReceipts: [],
      selectedReceipts: [],
      selectedReceiptsForCreate: [],
      selectAllReceipts: false,
      isIndeterminate: false,
      createDialogVisible: false,
      detailDialogVisible: false,
      showViewer: false,
      viewerImages: [],
      viewerReceipts: [],
      viewerStartIndex: 0,
      imageLoading: {},
      recognizing: {},
      currentReimbursement: null,
      currentReimbursementReceipts: [],
      createForm: {
        name: '',
        description: '',
        applicant: '',
        approver: '',
        notes: ''
      },
      stats: {
        pending: 0,
        processing: 0,
        approved: 0,
        approvedAmount: 0,
        reimbursableAmount: 0
      }
    }
  },
  computed: {
    filteredReimbursements() {
      let result = this.reimbursements || []
      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase()
        result = result.filter(r =>
          r.name.toLowerCase().includes(keyword) ||
          r.description?.toLowerCase().includes(keyword)
        )
      }
      if (this.statusFilter) {
        result = result.filter(r => r.status === this.statusFilter)
      }
      return result
    },
    filteredPendingReceipts() {
      let result = this.pendingReceipts || []
      if (this.receiptSearchKeyword) {
        const keyword = this.receiptSearchKeyword.toLowerCase()
        result = result.filter(r =>
          r.merchant?.toLowerCase().includes(keyword) ||
          (r.amount && r.amount.toString().includes(keyword))
        )
      }
      return result
    },
    selectedTotal() {
      return this.pendingReceipts
        .filter(r => this.selectedReceiptsForCreate.includes(r.id))
        .reduce((sum, r) => sum + (r.amount || 0), 0)
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
        const [reimbursements, pendingReceipts, receiptStats] = await Promise.all([
          reimbursementApi.getReimbursements(),
          receiptApi.getReceipts({ isReimbursable: true, reimbursementStatus: 'pending' }),
          receiptApi.getStats()
        ])
        this.reimbursements = reimbursements || []
        this.pendingReceipts = pendingReceipts || []
        this.stats = {
          pending: receiptStats?.pending || 0,
          processing: receiptStats?.reimbursable - receiptStats?.pending - receiptStats?.reimbursed || 0,
          approved: receiptStats?.reimbursed || 0,
          approvedAmount: receiptStats?.reimbursedAmount || 0,
          reimbursableAmount: receiptStats?.reimbursableAmount || 0
        }
      } catch (error) {
        console.error('Load data error:', error)
        this.$message.error('加载数据失败')
      } finally {
        this.loading = false
      }
    },

    handleTabChange() {
      this.loadData()
    },

    showCreateDialog() {
      this.createForm.name = `报销单_${new Date().toLocaleDateString('zh-CN')}`
      this.selectedReceiptsForCreate = []
      this.selectAllReceipts = false
      this.isIndeterminate = false
      this.createDialogVisible = true
    },

    resetCreateForm() {
      this.createForm = {
        name: '',
        description: '',
        applicant: '',
        approver: '',
        notes: ''
      }
      this.selectedReceiptsForCreate = []
    },

    handleSelectionChange(selection) {
    },

    handleReceiptSelectionChange(selection) {
      this.selectedReceipts = selection
    },

    toggleReceiptSelection(receiptId) {
      const index = this.selectedReceiptsForCreate.indexOf(receiptId)
      if (index > -1) {
        this.selectedReceiptsForCreate.splice(index, 1)
      } else {
        this.selectedReceiptsForCreate.push(receiptId)
      }
      this.updateSelectAllStatus()
    },

    handleSelectAllReceipts() {
      if (this.selectAllReceipts) {
        this.selectedReceiptsForCreate = this.pendingReceipts.map(r => r.id)
        this.isIndeterminate = false
      } else {
        this.selectedReceiptsForCreate = []
        this.isIndeterminate = false
      }
    },

    updateSelectAllStatus() {
      if (this.selectedReceiptsForCreate.length === 0) {
        this.selectAllReceipts = false
        this.isIndeterminate = false
      } else if (this.selectedReceiptsForCreate.length === this.pendingReceipts.length) {
        this.selectAllReceipts = true
        this.isIndeterminate = false
      } else {
        this.isIndeterminate = true
      }
    },

    async createReimbursement() {
      if (this.selectedReceiptsForCreate.length === 0) {
        this.$message.warning('请至少选择一张票据')
        return
      }
      if (!this.createForm.name.trim()) {
        this.$message.warning('请输入报销单名称')
        return
      }

      this.creating = true
      try {
        const result = await reimbursementApi.create({
          ...this.createForm,
          receiptIds: this.selectedReceiptsForCreate,
          totalAmount: this.selectedTotal
        })
        if (result) {
          this.$message.success('报销单创建成功')
          this.createDialogVisible = false
          this.loadData()
        } else {
          this.$message.error('创建失败')
        }
      } catch (error) {
        console.error('Create error:', error)
        this.$message.error('创建失败')
      } finally {
        this.creating = false
      }
    },

    batchCreateReimbursement() {
      this.selectedReceiptsForCreate = this.selectedReceipts.map(r => r.id)
      this.updateSelectAllStatus()
      this.showCreateDialog()
    },

    addToReimbursement(receipt) {
      if (!this.selectedReceiptsForCreate.includes(receipt.id)) {
        this.selectedReceiptsForCreate.push(receipt.id)
        this.updateSelectAllStatus()
      }
      this.showCreateDialog()
    },

    async viewReimbursement(reimbursement) {
      this.currentReimbursement = reimbursement
      this.currentReimbursementReceipts = this.pendingReceipts.filter(r =>
        reimbursement.receiptIds.includes(r.id)
      )
      for (const receipt of this.currentReimbursementReceipts) {
        if (!receipt._thumbnail) {
          this.getThumbnail(receipt)
        }
      }
      this.detailDialogVisible = true
    },

    async approveReimbursement() {
      if (!this.currentReimbursement) return
      try {
        const result = await reimbursementApi.update({
          id: this.currentReimbursement.id,
          status: 'approved'
        })
        if (result) {
          this.$message.success('已批准')
          Object.assign(this.currentReimbursement, result)
          this.loadData()
        }
      } catch (error) {
        console.error('Approve error:', error)
        this.$message.error('操作失败')
      }
    },

    async markReimbursed() {
      if (!this.currentReimbursement) return
      try {
        const result = await reimbursementApi.update({
          id: this.currentReimbursement.id,
          status: 'reimbursed'
        })
        if (result) {
          this.$message.success('已标记为已报销')
          Object.assign(this.currentReimbursement, result)
          this.loadData()
        }
      } catch (error) {
        console.error('Mark reimbursed error:', error)
        this.$message.error('操作失败')
      }
    },

    async rejectReimbursement() {
      if (!this.currentReimbursement) return
      this.$confirm('确定要拒绝这个报销单吗？', '确认拒绝', {
        type: 'warning'
      }).then(async () => {
        try {
          const result = await reimbursementApi.update({
            id: this.currentReimbursement.id,
            status: 'rejected'
          })
          if (result) {
            this.$message.success('已拒绝')
            Object.assign(this.currentReimbursement, result)
            this.loadData()
          }
        } catch (error) {
          console.error('Reject error:', error)
          this.$message.error('操作失败')
        }
      }).catch(() => {})
    },

    async deleteReimbursement(reimbursement) {
      this.$confirm('确定要删除这个报销单吗？', '确认删除', {
        type: 'warning'
      }).then(async () => {
        try {
          const result = await reimbursementApi.delete(reimbursement.id)
          if (result) {
            this.$message.success('删除成功')
            this.loadData()
          }
        } catch (error) {
          console.error('Delete error:', error)
          this.$message.error('删除失败')
        }
      }).catch(() => {})
    },

    async exportReimbursement(reimbursement) {
      if (!reimbursement) return
      try {
        const result = await reimbursementApi.export(reimbursement.id)
        if (result) {
          this.$message.success('导出成功')
        } else {
          this.$message.error('导出失败')
        }
      } catch (error) {
        console.error('Export error:', error)
        this.$message.error('导出失败')
      }
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
      return receipt._thumbnail || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect fill=%22%23f0f0f0%22 width=%2260%22 height=%2260%22/%3E%3Ctext fill=%22%23999%22 font-size=%2220%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3E📄%3C/text%3E%3C/svg%3E'
    },

    openReceiptViewer(receipt) {
      const allReceipts = this.activeTab === 'pending-receipts'
        ? this.filteredPendingReceipts
        : this.currentReimbursementReceipts
      const index = allReceipts.findIndex(r => r.id === receipt.id)
      this.viewerImages = allReceipts.map(r => ({
        preview: r._thumbnail,
        receipt: r
      }))
      this.viewerReceipts = allReceipts
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

    handleReceiptUpdated(receipt) {
      const index = this.pendingReceipts.findIndex(r => r.id === receipt.id)
      if (index !== -1) {
        this.$set(this.pendingReceipts, index, receipt)
      }
      this.loadData()
    },

    getStatusType(status) {
      switch (status) {
        case 'approved':
        case 'reimbursed': return 'success'
        case 'processing': return 'warning'
        case 'rejected': return 'danger'
        default: return 'info'
      }
    },

    getStatusText(status) {
      switch (status) {
        case 'pending': return '待审批'
        case 'approved': return '已批准'
        case 'reimbursed': return '已报销'
        case 'rejected': return '已拒绝'
        case 'processing': return '处理中'
        default: return status
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.reimbursement {
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

          &.pending {
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
          }
          &.processing {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }
          &.approved {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          }
          &.total {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
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

  .tab-header {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
  }

  .list-thumbnail {
    width: 50px;
    height: 50px;
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
    padding: 40px 0;
  }

  .receipt-selector {
    display: flex;
    align-items: center;
    margin-bottom: 12px;

    .selected-info {
      font-size: 14px;
      color: $text-regular;
    }
  }

  .receipt-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
    max-height: 300px;
    overflow-y: auto;
    padding: 8px;
    border: 1px solid #ebeef5;
    border-radius: 4px;

    .receipt-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border: 2px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: #f5f7fa;
      }

      &.selected {
        background: #ecf5ff;
        border-color: $primary-color;
      }

      .receipt-thumb {
        width: 50px;
        height: 50px;
        object-fit: cover;
        border-radius: 4px;
      }

      .receipt-info {
        flex: 1;
        min-width: 0;

        .receipt-amount {
          font-size: 14px;
          font-weight: 600;
          color: $expense-color;
        }
        .receipt-merchant {
          font-size: 12px;
          color: $text-regular;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .receipt-date {
          font-size: 11px;
          color: $text-secondary;
        }
      }
    }
  }

  .reimbursement-detail {
    .detail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;

      h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: $text-primary;
      }
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: $text-primary;
      margin: 20px 0 12px 0;
    }

    .detail-thumb {
      width: 50px;
      height: 50px;
      object-fit: cover;
      border-radius: 4px;
      cursor: pointer;
    }

    .detail-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #ebeef5;
    }
  }
}
</style>
