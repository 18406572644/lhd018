<template>
  <div class="page-container recurring-bills">
    <div class="header">
      <h2 class="page-title">周期账单</h2>
      <div class="header-actions">
        <el-button type="primary" icon="el-icon-plus" @click="showAddDialog">
          新增周期账单
        </el-button>
      </div>
    </div>

    <el-card class="card stats-card" shadow="never">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-icon active">🔄</div>
          <div class="stat-info">
            <div class="stat-value">{{ activeCount }}</div>
            <div class="stat-label">启用中</div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon paused">⏸️</div>
          <div class="stat-info">
            <div class="stat-value">{{ pausedCount }}</div>
            <div class="stat-label">已暂停</div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon upcoming">📅</div>
          <div class="stat-info">
            <div class="stat-value">{{ upcomingBills.length }}</div>
            <div class="stat-label">30天内待生成</div>
          </div>
        </div>
      </div>
    </el-card>

    <el-card class="card" shadow="never">
      <div class="section-title">
        <span>即将到期</span>
        <el-tag size="small" type="info">未来30天</el-tag>
      </div>
      
      <div v-if="upcomingBills.length > 0" class="upcoming-list">
        <div
          v-for="item in upcomingBills.slice(0, 5)"
          :key="item.billId + item.date"
          class="upcoming-item"
        >
          <div class="upcoming-left">
            <div
              class="upcoming-icon"
              :style="{ 
                backgroundColor: getCategoryColor(item) + '20', 
                color: getCategoryColor(item) 
              }"
            >
              {{ item.icon || '📅' }}
            </div>
            <div class="upcoming-info">
              <div class="upcoming-name">{{ item.billName }}</div>
              <div class="upcoming-meta">
                <span :class="item.type">
                  {{ item.type === 'income' ? '收入' : '支出' }}
                </span>
                <span class="dot">·</span>
                <span>{{ item.categoryName }}</span>
                <span class="dot">·</span>
                <span>{{ item.accountName }}</span>
              </div>
            </div>
          </div>
          <div class="upcoming-right">
            <div class="upcoming-amount" :class="item.type">
              {{ item.type === 'income' ? '+' : '-' }}¥{{ formatMoney(item.amount) }}
            </div>
            <div class="upcoming-date">
              {{ formatDate(item.date, 'YYYY年MM月DD日') }}
            </div>
            <div class="upcoming-actions">
              <el-button size="mini" type="success" @click="handleGenerateNow(item)">
                立即生成
              </el-button>
              <el-button size="mini" @click="handleSkip(item)">
                跳过
              </el-button>
            </div>
          </div>
        </div>
        <div v-if="upcomingBills.length > 5" class="more-upcoming">
          还有 {{ upcomingBills.length - 5 }} 条...
        </div>
      </div>
      <el-empty v-else description="暂无即将到期的账单" />
    </el-card>

    <el-card class="card" shadow="never">
      <div class="section-title">
        <span>全部周期账单</span>
        <div class="filter-tabs">
          <el-button
            size="mini"
            :type="filter === 'all' ? 'primary' : ''"
            @click="filter = 'all'"
          >
            全部
          </el-button>
          <el-button
            size="mini"
            :type="filter === 'active' ? 'primary' : ''"
            @click="filter = 'active'"
          >
            启用
          </el-button>
          <el-button
            size="mini"
            :type="filter === 'paused' ? 'primary' : ''"
            @click="filter = 'paused'"
          >
            暂停
          </el-button>
        </div>
      </div>

      <div v-if="filteredBills.length > 0" class="bills-list">
        <div
          v-for="bill in filteredBills"
          :key="bill.id"
          class="bill-item"
          :class="{ paused: bill.status === 'paused' }"
        >
          <div class="bill-left">
            <div
              class="bill-icon"
              :style="{ 
                backgroundColor: getCategoryById(bill.categoryId)?.color + '20', 
                color: getCategoryById(bill.categoryId)?.color 
              }"
            >
              {{ bill.icon || getCategoryById(bill.categoryId)?.icon || '📅' }}
            </div>
            <div class="bill-info">
              <div class="bill-header">
                <span class="bill-name">{{ bill.name }}</span>
                <el-tag
                  v-if="bill.status === 'active'"
                  size="mini"
                  type="success"
                  effect="light"
                >
                  启用中
                </el-tag>
                <el-tag
                  v-else
                  size="mini"
                  type="info"
                  effect="light"
                >
                  已暂停
                </el-tag>
              </div>
              <div class="bill-meta">
                <span :class="bill.type">
                  {{ bill.type === 'income' ? '收入' : '支出' }}
                </span>
                <span class="dot">·</span>
                <span>{{ getPeriodText(bill) }}</span>
                <span class="dot">·</span>
                <span>{{ getCategoryById(bill.categoryId)?.name }}</span>
              </div>
              <div class="bill-dates">
                <span>开始: {{ formatDate(bill.startDate) }}</span>
                <span v-if="bill.endDate">结束: {{ formatDate(bill.endDate) }}</span>
                <span v-else>永久有效</span>
                <span v-if="bill.remindDays > 0">提前 {{ bill.remindDays }} 天提醒</span>
                <span v-if="bill.autoGenerate">自动生成</span>
                <span v-else>需确认</span>
              </div>
              <div v-if="bill.exceptions && bill.exceptions.length > 0" class="bill-exceptions">
                <i class="el-icon-warning-outline"></i>
                已跳过 {{ bill.exceptions.length }} 期
              </div>
            </div>
          </div>
          <div class="bill-right">
            <div class="bill-amount" :class="bill.type">
              {{ bill.type === 'income' ? '+' : '-' }}¥{{ formatMoney(bill.amount) }}
            </div>
            <div class="bill-next" v-if="bill.status === 'active'">
              下次: {{ getNextDate(bill) }}
            </div>
            <div class="bill-actions">
              <el-tooltip content="手动生成一期">
                <el-button
                  size="mini"
                  icon="el-icon-document-add"
                  @click="handleGenerateBillNow(bill)"
                />
              </el-tooltip>
              <el-tooltip :content="bill.status === 'active' ? '暂停' : '启用'">
                <el-button
                  size="mini"
                  :icon="bill.status === 'active' ? 'el-icon-video-pause' : 'el-icon-video-play'"
                  @click="handleToggleStatus(bill)"
                />
              </el-tooltip>
              <el-tooltip content="管理例外日期">
                <el-button
                  size="mini"
                  icon="el-icon-edit-outline"
                  @click="showExceptionsDialog(bill)"
                />
              </el-tooltip>
              <el-tooltip content="编辑">
                <el-button
                  size="mini"
                  type="primary"
                  icon="el-icon-edit"
                  @click="showEditDialog(bill)"
                />
              </el-tooltip>
              <el-tooltip content="删除">
                <el-button
                  size="mini"
                  type="danger"
                  icon="el-icon-delete"
                  @click="handleDelete(bill)"
                />
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无周期账单" />
    </el-card>

    <el-dialog
      :title="editingBill ? '编辑周期账单' : '新增周期账单'"
      :visible.sync="showFormDialog"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="billForm"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <div v-if="!editingBill" class="templates-section">
          <div class="section-subtitle">选择模板（可选）</div>
          <div class="templates-grid">
            <div
              v-for="template in templates"
              :key="template.id"
              class="template-item"
              :class="{ active: selectedTemplate?.id === template.id }"
              @click="selectTemplate(template)"
            >
              <div class="template-icon">{{ template.icon }}</div>
              <div class="template-name">{{ template.name }}</div>
            </div>
          </div>
        </div>

        <el-form-item label="账单名称" prop="name">
          <el-input v-model="form.name" placeholder="如：每月工资" maxlength="20" />
        </el-form-item>

        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type" @change="onTypeChange">
            <el-radio label="expense">
              <span class="expense-text">📉 支出</span>
            </el-radio>
            <el-radio label="income">
              <span class="income-text">📈 收入</span>
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="金额" prop="amount">
          <el-input-number
            v-model="form.amount"
            :min="0"
            :precision="2"
            :step="10"
            style="width: 100%"
            placeholder="请输入金额"
          />
        </el-form-item>

        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option
              v-for="cat in filteredCategories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            >
              <span style="float: left;">{{ cat.icon }} {{ cat.name }}</span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="账户" prop="accountId">
          <el-select v-model="form.accountId" placeholder="请选择账户" style="width: 100%">
            <el-option
              v-for="acc in activeAccounts"
              :key="acc.id"
              :label="acc.name"
              :value="acc.id"
            >
              <span style="float: left;">{{ acc.icon }} {{ acc.name }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px;">
                ¥{{ formatMoney(acc.balance) }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="周期类型" prop="periodType">
          <el-select v-model="form.periodType" placeholder="请选择周期类型" style="width: 100%">
            <el-option label="每日" value="daily" />
            <el-option label="每周" value="weekly" />
            <el-option label="每月" value="monthly" />
            <el-option label="每年" value="yearly" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="form.periodType === 'custom'" label="间隔天数" prop="customInterval">
          <el-input-number
            v-model="form.customInterval"
            :min="1"
            :max="365"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="开始日期" prop="startDate">
          <el-date-picker
            v-model="form.startDate"
            type="date"
            format="yyyy-MM-dd"
            value-format="yyyy-MM-dd"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="结束日期">
          <div class="end-date-section">
            <el-switch v-model="form.isPermanent" active-text="永久有效" />
            <el-date-picker
              v-if="!form.isPermanent"
              v-model="form.endDate"
              type="date"
              format="yyyy-MM-dd"
              value-format="yyyy-MM-dd"
              style="width: 200px; margin-left: 16px;"
              :picker-options="endDatePickerOptions"
            />
          </div>
        </el-form-item>

        <el-form-item label="提前提醒">
          <div class="remind-section">
            <el-switch v-model="enableRemind" active-text="开启" />
            <el-input-number
              v-if="enableRemind"
              v-model="form.remindDays"
              :min="1"
              :max="30"
              size="small"
              style="margin-left: 16px; width: 100px;"
            />
            <span v-if="enableRemind" style="margin-left: 8px;">天</span>
          </div>
        </el-form-item>

        <el-form-item label="生成方式">
          <el-radio-group v-model="form.autoGenerate">
            <el-radio :label="true">自动生成</el-radio>
            <el-radio :label="false">需确认后生成</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            maxlength="50"
            placeholder="可选"
          />
        </el-form-item>
      </el-form>

      <span slot="footer">
        <el-button @click="showFormDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitForm">确定</el-button>
      </span>
    </el-dialog>

    <el-dialog
      title="例外日期管理"
      :visible.sync="showExceptionsDialogVisible"
      width="500px"
    >
      <div v-if="currentExceptionBill" class="exceptions-content">
        <div class="exception-header">
          <span>账单：{{ currentExceptionBill.name }}</span>
          <el-button
            size="mini"
            type="primary"
            icon="el-icon-plus"
            @click="showAddException"
          >
            添加跳过日期
          </el-button>
        </div>

        <div v-if="currentExceptionBill.exceptions && currentExceptionBill.exceptions.length > 0" class="exceptions-list">
          <div
            v-for="(date, index) in sortedExceptions"
            :key="date"
            class="exception-item"
          >
            <span class="exception-date">{{ formatDate(date, 'YYYY年MM月DD日') }}</span>
            <el-button
              size="mini"
              type="danger"
              icon="el-icon-close"
              @click="handleRemoveException(date)"
            >
              移除
            </el-button>
          </div>
        </div>
        <el-empty v-else description="暂无跳过的日期" />

        <div v-if="showAddExceptionInput" class="add-exception-section">
          <el-date-picker
            v-model="newExceptionDate"
            type="date"
            format="yyyy-MM-dd"
            value-format="yyyy-MM-dd"
            placeholder="选择要跳过的日期"
            style="width: 200px;"
          />
          <el-button size="mini" type="primary" @click="handleAddException">确认</el-button>
          <el-button size="mini" @click="showAddExceptionInput = false">取消</el-button>
        </div>
      </div>

      <span slot="footer">
        <el-button @click="showExceptionsDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { categoryApi, accountApi, recurringBillApi } from '@/api'
import { formatMoney, formatDate, getNextOccurrence } from '@/utils'

export default {
  name: 'Recurring',
  data() {
    return {
      bills: [],
      templates: [],
      categories: [],
      accounts: [],
      upcomingBills: [],
      filter: 'all',
      showFormDialog: false,
      editingBill: null,
      selectedTemplate: null,
      showExceptionsDialogVisible: false,
      currentExceptionBill: null,
      showAddExceptionInput: false,
      newExceptionDate: '',
      enableRemind: false,
      form: {
        id: '',
        name: '',
        type: 'expense',
        amount: null,
        categoryId: '',
        categoryName: '',
        accountId: '',
        accountName: '',
        periodType: 'monthly',
        customInterval: 1,
        startDate: formatDate(new Date()),
        endDate: '',
        isPermanent: true,
        remindDays: 0,
        autoGenerate: true,
        remark: '',
        icon: ''
      },
      formRules: {
        name: [{ required: true, message: '请输入账单名称', trigger: 'blur' }],
        type: [{ required: true, message: '请选择类型', trigger: 'change' }],
        amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
        categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
        accountId: [{ required: true, message: '请选择账户', trigger: 'change' }],
        periodType: [{ required: true, message: '请选择周期类型', trigger: 'change' }],
        startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }]
      }
    }
  },
  computed: {
    activeCount() {
      return this.bills.filter(b => b.status === 'active').length
    },
    pausedCount() {
      return this.bills.filter(b => b.status === 'paused').length
    },
    filteredCategories() {
      return this.categories.filter(c => c.type === this.form.type)
    },
    activeAccounts() {
      return this.accounts.filter(a => !a.hidden && !a.disabled)
    },
    filteredBills() {
      if (this.filter === 'all') return this.bills
      return this.bills.filter(b => b.status === this.filter)
    },
    endDatePickerOptions() {
      return {
        disabledDate: time => {
          return time.getTime() < new Date(this.form.startDate).getTime()
        }
      }
    },
    sortedExceptions() {
      if (!this.currentExceptionBill?.exceptions) return []
      return [...this.currentExceptionBill.exceptions].sort((a, b) => 
        new Date(b) - new Date(a)
      )
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    formatMoney,
    formatDate,
    async loadData() {
      const [bills, templates, categories, accounts, upcoming] = await Promise.all([
        recurringBillApi.getBills(),
        recurringBillApi.getTemplates(),
        categoryApi.getCategories(),
        accountApi.getAccounts(),
        recurringBillApi.getUpcomingBills(30)
      ])
      this.bills = bills || []
      this.templates = templates || []
      this.categories = categories || []
      this.accounts = accounts || []
      this.upcomingBills = upcoming || []
    },
    getCategoryById(id) {
      return this.categories.find(c => c.id === id)
    },
    getCategoryColor(item) {
      const cat = this.categories.find(c => c.id === item.categoryId || c.name === item.categoryName)
      return cat?.color || '#909399'
    },
    getPeriodText(bill) {
      const map = {
        daily: '每日',
        weekly: '每周',
        monthly: '每月',
        yearly: '每年',
        custom: `每${bill.customInterval || 1}天`
      }
      return map[bill.periodType] || bill.periodType
    },
    getNextDate(bill) {
      return getNextOccurrence(bill) || '已结束'
    },
    selectTemplate(template) {
      this.selectedTemplate = template
      this.form.name = template.name
      this.form.type = template.type
      this.form.periodType = template.defaultPeriodType
      this.form.categoryId = template.defaultCategoryId
      this.form.icon = template.icon
      
      const cat = this.categories.find(c => c.id === template.defaultCategoryId)
      if (cat) {
        this.form.categoryName = cat.name
      }
    },
    onTypeChange() {
      this.form.categoryId = ''
      this.form.categoryName = ''
      this.selectedTemplate = null
    },
    showAddDialog() {
      this.editingBill = null
      this.selectedTemplate = null
      this.resetForm()
      this.showFormDialog = true
    },
    showEditDialog(bill) {
      this.editingBill = bill
      this.selectedTemplate = null
      this.enableRemind = bill.remindDays > 0
      this.form = {
        id: bill.id,
        name: bill.name,
        type: bill.type,
        amount: bill.amount,
        categoryId: bill.categoryId,
        categoryName: bill.categoryName,
        accountId: bill.accountId,
        accountName: bill.accountName,
        periodType: bill.periodType,
        customInterval: bill.customInterval || 1,
        startDate: bill.startDate,
        endDate: bill.endDate || '',
        isPermanent: !bill.endDate,
        remindDays: bill.remindDays || 0,
        autoGenerate: bill.autoGenerate !== false,
        remark: bill.remark || '',
        icon: bill.icon || ''
      }
      this.showFormDialog = true
    },
    resetForm() {
      this.enableRemind = false
      this.form = {
        id: '',
        name: '',
        type: 'expense',
        amount: null,
        categoryId: '',
        categoryName: '',
        accountId: '',
        accountName: '',
        periodType: 'monthly',
        customInterval: 1,
        startDate: formatDate(new Date()),
        endDate: '',
        isPermanent: true,
        remindDays: 0,
        autoGenerate: true,
        remark: '',
        icon: ''
      }
      this.$refs.billForm?.clearValidate()
    },
    async handleSubmitForm() {
      if (!this.$refs.billForm) return
      
      this.$refs.billForm.validate(async valid => {
        if (!valid) return
        
        const cat = this.categories.find(c => c.id === this.form.categoryId)
        const acc = this.accounts.find(a => a.id === this.form.accountId)
        
        const billData = {
          ...this.form,
          categoryName: cat?.name || '',
          accountName: acc?.name || '',
          endDate: this.form.isPermanent ? null : this.form.endDate,
          remindDays: this.enableRemind ? this.form.remindDays : 0,
          icon: this.form.icon || cat?.icon || ''
        }
        
        delete billData.isPermanent
        
        let result
        if (this.editingBill) {
          result = await recurringBillApi.updateBill(billData)
          if (result) {
            this.$message.success('更新成功')
          }
        } else {
          result = await recurringBillApi.addBill(billData)
          if (result) {
            this.$message.success('添加成功')
          }
        }
        
        if (result) {
          this.showFormDialog = false
          this.loadData()
        }
      })
    },
    async handleToggleStatus(bill) {
      const result = await recurringBillApi.toggleStatus(bill.id)
      if (result) {
        this.$message.success(result.status === 'active' ? '已启用' : '已暂停')
        this.loadData()
      }
    },
    async handleDelete(bill) {
      this.$confirm(`确定要删除周期账单"${bill.name}"吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        const result = await recurringBillApi.deleteBill(bill.id)
        if (result) {
          this.$message.success('删除成功')
          this.loadData()
        }
      }).catch(() => {})
    },
    async handleGenerateNow(item) {
      const record = await recurringBillApi.generateRecord(item.billId, item.date)
      if (record) {
        this.$message.success(`已生成记录: ${item.billName}`)
        this.loadData()
      }
    },
    async handleGenerateBillNow(bill) {
      const nextDate = getNextOccurrence(bill)
      if (!nextDate) {
        this.$message.warning('该账单已没有可生成的日期')
        return
      }
      
      this.$confirm(
        `确定要为"${bill.name}"生成 ${formatDate(nextDate, 'YYYY年MM月DD日')} 的记录吗？`,
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'info'
        }
      ).then(async () => {
        const record = await recurringBillApi.generateRecord(bill.id, nextDate)
        if (record) {
          this.$message.success('生成成功')
          this.loadData()
        }
      }).catch(() => {})
    },
    async handleSkip(item) {
      this.$confirm(
        `确定要跳过 ${formatDate(item.date, 'YYYY年MM月DD日')} 的"${item.billName}"吗？`,
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(async () => {
        const result = await recurringBillApi.skipDate(item.billId, item.date)
        if (result) {
          this.$message.success('已跳过')
          this.loadData()
        }
      }).catch(() => {})
    },
    showExceptionsDialog(bill) {
      this.currentExceptionBill = { ...bill }
      this.showAddExceptionInput = false
      this.newExceptionDate = ''
      this.showExceptionsDialogVisible = true
    },
    showAddException() {
      this.showAddExceptionInput = true
    },
    async handleAddException() {
      if (!this.newExceptionDate) {
        this.$message.warning('请选择日期')
        return
      }
      
      const result = await recurringBillApi.addExceptionDate(
        this.currentExceptionBill.id,
        this.newExceptionDate
      )
      
      if (result) {
        this.currentExceptionBill = result
        this.newExceptionDate = ''
        this.showAddExceptionInput = false
        this.$message.success('已添加')
        this.loadData()
      }
    },
    async handleRemoveException(date) {
      const result = await recurringBillApi.removeExceptionDate(
        this.currentExceptionBill.id,
        date
      )
      
      if (result) {
        this.currentExceptionBill = result
        this.$message.success('已移除')
        this.loadData()
      }
    }
  },
  watch: {
    'form.categoryId'(val) {
      const cat = this.categories.find(c => c.id === val)
      if (cat) {
        this.form.categoryName = cat.name
      }
    },
    'form.accountId'(val) {
      const acc = this.accounts.find(a => a.id === val)
      if (acc) {
        this.form.accountName = acc.name
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.recurring-bills {
  max-width: 900px;
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
}

.card {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
  
  .filter-tabs {
    display: flex;
    gap: 8px;
  }
}

.section-subtitle {
  font-size: 14px;
  font-weight: 500;
  color: $text-regular;
  margin-bottom: 12px;
}

.stats-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  
  ::v-deep .el-card__body {
    padding: 20px;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  
  .stat-item {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      
      &.active {
        background: rgba(103, 194, 58, 0.2);
      }
      
      &.paused {
        background: rgba(144, 147, 153, 0.2);
      }
      
      &.upcoming {
        background: rgba(64, 158, 255, 0.2);
      }
    }
    
    .stat-info {
      .stat-value {
        font-size: 24px;
        font-weight: 600;
        line-height: 1.2;
      }
      
      .stat-label {
        font-size: 12px;
        opacity: 0.85;
      }
    }
  }
}

.upcoming-list {
  .upcoming-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 12px 0;
    border-bottom: 1px solid $border-color;
    
    &:last-child {
      border-bottom: none;
    }
    
    .upcoming-left {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .upcoming-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
      }
      
      .upcoming-info {
        .upcoming-name {
          font-size: 14px;
          font-weight: 600;
          color: $text-primary;
          margin-bottom: 4px;
        }
        
        .upcoming-meta {
          font-size: 12px;
          color: $text-secondary;
          display: flex;
          align-items: center;
          gap: 6px;
          
          .dot {
            color: $border-color;
          }
          
          .income {
            color: $income-color;
          }
          
          .expense {
            color: $expense-color;
          }
        }
      }
    }
    
    .upcoming-right {
      text-align: right;
      
      .upcoming-amount {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
        
        &.income {
          color: $income-color;
        }
        
        &.expense {
          color: $expense-color;
        }
      }
      
      .upcoming-date {
        font-size: 12px;
        color: $text-secondary;
        margin-bottom: 8px;
      }
      
      .upcoming-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
    }
  }
  
  .more-upcoming {
    text-align: center;
    padding: 12px 0;
    color: $text-secondary;
    font-size: 13px;
    cursor: pointer;
    
    &:hover {
      color: $primary-color;
    }
  }
}

.bills-list {
  .bill-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px 0;
    border-bottom: 1px solid $border-color;
    
    &:last-child {
      border-bottom: none;
    }
    
    &.paused {
      opacity: 0.6;
    }
    
    .bill-left {
      display: flex;
      gap: 12px;
      flex: 1;
      
      .bill-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        flex-shrink: 0;
      }
      
      .bill-info {
        flex: 1;
        
        .bill-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          
          .bill-name {
            font-size: 15px;
            font-weight: 600;
            color: $text-primary;
          }
        }
        
        .bill-meta {
          font-size: 13px;
          color: $text-regular;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
          
          .dot {
            color: $border-color;
          }
          
          .income {
            color: $income-color;
          }
          
          .expense {
            color: $expense-color;
          }
        }
        
        .bill-dates {
          font-size: 12px;
          color: $text-secondary;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 4px;
        }
        
        .bill-exceptions {
          font-size: 12px;
          color: #e6a23c;
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }
    }
    
    .bill-right {
      text-align: right;
      flex-shrink: 0;
      
      .bill-amount {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 6px;
        
        &.income {
          color: $income-color;
        }
        
        &.expense {
          color: $expense-color;
        }
      }
      
      .bill-next {
        font-size: 12px;
        color: $text-secondary;
        margin-bottom: 8px;
      }
      
      .bill-actions {
        display: flex;
        gap: 6px;
        justify-content: flex-end;
      }
    }
  }
}

.templates-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px dashed $border-color;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
  
  .template-item {
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
      background: #ecf5ff;
      border-color: $primary-color;
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
    }
    
    .template-icon {
      font-size: 24px;
      margin-bottom: 6px;
    }
    
    .template-name {
      font-size: 12px;
      color: $text-regular;
      text-align: center;
    }
  }
}

.end-date-section,
.remind-section {
  display: flex;
  align-items: center;
}

.income-text {
  color: $income-color;
}

.expense-text {
  color: $expense-color;
}

.exceptions-content {
  .exception-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid $border-color;
    font-weight: 500;
    color: $text-primary;
  }
  
  .exceptions-list {
    max-height: 300px;
    overflow-y: auto;
    
    .exception-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid $border-color;
      
      &:last-child {
        border-bottom: none;
      }
      
      .exception-date {
        font-size: 14px;
        color: $text-regular;
      }
    }
  }
  
  .add-exception-section {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed $border-color;
  }
}
</style>
