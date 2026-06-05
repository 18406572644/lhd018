<template>
  <div class="page-container accounts">
    <div class="header flex-between">
      <div class="header-left">
        <h2 class="page-title">账户管理</h2>
        <el-tag v-if="overview" size="small" class="net-worth-tag">
          净资产: <span :class="overview.netWorth >= 0 ? 'text-income' : 'text-expense'">
            {{ overview.netWorth >= 0 ? '+' : '' }}{{ formatMoney(overview.netWorth) }}
          </span>
        </el-tag>
      </div>
      <div class="header-right">
        <el-button icon="el-icon-refresh" @click="loadData">
          刷新
        </el-button>
        <el-button type="warning" icon="el-icon-swapright" @click="openTransferDialog" style="margin-left: 8px;">
          转账
        </el-button>
        <el-button type="primary" icon="el-icon-plus" @click="handleAdd" style="margin-left: 8px;">
          新增账户
        </el-button>
      </div>
    </div>

    <el-row :gutter="16" class="overview-row" v-if="overview">
      <el-col :span="8">
        <div class="overview-card assets-card">
          <div class="overview-label">总资产</div>
          <div class="overview-value">+{{ formatMoney(overview.totalAssets) }}</div>
          <div class="overview-count">{{ overview.accounts.length }} 个账户</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="overview-card liabilities-card">
          <div class="overview-label">总负债</div>
          <div class="overview-value">{{ overview.totalLiabilities > 0 ? '-' : '' }}{{ formatMoney(overview.totalLiabilities) }}</div>
          <div class="overview-count">信用卡待还</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="overview-card networth-card" :class="{ 'negative': overview.netWorth < 0 }">
          <div class="overview-label">净资产</div>
          <div class="overview-value">
            {{ overview.netWorth >= 0 ? '+' : '' }}{{ formatMoney(overview.netWorth) }}
          </div>
          <div class="overview-count">{{ overview.netWorth >= 0 ? '财务健康' : '注意负债' }}</div>
        </div>
      </el-col>
    </el-row>

    <div class="credit-reminders" v-if="reminders.length > 0">
      <el-alert
        v-for="reminder in reminders"
        :key="reminder.accountId + reminder.type"
        :title="reminder.message"
        :type="reminder.type === 'due' ? 'error' : 'warning'"
        :closable="false"
        show-icon
        class="reminder-alert"
      />
    </div>

    <el-tabs v-model="activeTab" class="tabs">
      <el-tab-pane label="所有账户" name="all">
        <div class="accounts-list">
          <div
            v-for="account in sortedAccounts"
            :key="account.id"
            class="account-card card"
            :class="{ 'disabled': account.disabled, 'hidden': account.hidden }"
            :style="{ borderLeftColor: account.color }"
          >
            <div class="account-left">
              <div class="sort-handle" @mousedown="startDrag($event, account)">
                <i class="el-icon-rank"></i>
              </div>
              <div class="account-icon" :style="{ backgroundColor: account.color + '20', color: account.color }">
                {{ account.icon }}
              </div>
              <div class="account-info">
                <div class="account-name" :data-id="account.id">
                  {{ account.name }}
                  <el-tag v-if="account.hidden" size="mini" type="info" style="margin-left: 6px;">已隐藏</el-tag>
                  <el-tag v-if="account.disabled" size="mini" type="danger" style="margin-left: 6px;">已停用</el-tag>
                </div>
                <div class="account-type">
                  {{ getAccountTypeName(account.type) }}
                  <span v-if="account.type === 'credit' && account.creditLimit">
                    额度: {{ formatMoney(account.creditLimit) }}
                  </span>
                  <span v-if="account.type === 'credit' && account.billDay">
                    · 账单日: {{ account.billDay }}号
                  </span>
                  <span v-if="account.type === 'credit' && account.dueDay">
                    · 还款日: {{ account.dueDay }}号
                  </span>
                </div>
              </div>
            </div>
            <div class="account-right">
              <div class="account-balance" :class="{ 'negative': account.balance < 0 }">
                {{ account.balance >= 0 ? '' : '-' }}{{ formatMoney(Math.abs(account.balance)) }}
              </div>
              <div class="account-actions">
                <el-dropdown trigger="click" @command="handleCommand($event, account)">
                  <el-button size="mini" icon="el-icon-more" circle />
                  <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item command="edit">编辑</el-dropdown-item>
                    <el-dropdown-item :command="account.hidden ? 'show' : 'hide'">
                      {{ account.hidden ? '显示' : '隐藏' }}
                    </el-dropdown-item>
                    <el-dropdown-item :command="account.disabled ? 'enable' : 'disable'">
                      {{ account.disabled ? '启用' : '停用' }}
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
              </div>
            </div>
          </div>
          <el-empty v-if="accounts.length === 0" description="暂无账户，点击右上角新增账户" />
        </div>
      </el-tab-pane>
      <el-tab-pane label="按类型查看" name="byType">
        <div v-for="(group, type) in accountsByType" :key="type" class="account-type-group">
          <h3 class="group-title">{{ getAccountTypeName(type) }}</h3>
          <div class="accounts-list">
            <div
              v-for="account in group"
              :key="account.id"
              class="account-card card"
              :class="{ 'disabled': account.disabled, 'hidden': account.hidden }"
              :style="{ borderLeftColor: account.color }"
            >
              <div class="account-left">
                <div class="account-icon" :style="{ backgroundColor: account.color + '20', color: account.color }">
                  {{ account.icon }}
                </div>
                <div class="account-info">
                  <div class="account-name">{{ account.name }}</div>
                  <div class="account-type">
                    <span v-if="account.type === 'credit' && account.creditLimit">
                      额度: {{ formatMoney(account.creditLimit) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="account-right">
                <div class="account-balance" :class="{ 'negative': account.balance < 0 }">
                  {{ account.balance >= 0 ? '' : '-' }}{{ formatMoney(Math.abs(account.balance)) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      :title="isEdit ? '编辑账户' : '新增账户'"
      :visible.sync="dialogVisible"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="form" label-width="100px">
        <el-form-item label="账户类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择账户类型" style="width: 100%;">
            <el-option
              v-for="type in accountTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            >
              <span>{{ type.icon }} {{ type.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="账户名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入账户名称" maxlength="10" show-word-limit />
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <div class="icon-picker">
            <div
              v-for="icon in iconList"
              :key="icon"
              class="icon-item"
              :class="{ active: form.icon === icon }"
              @click="form.icon = icon"
            >
              {{ icon }}
            </div>
          </div>
        </el-form-item>
        <el-form-item label="颜色" prop="color">
          <el-color-picker v-model="form.color" show-alpha />
          <span class="color-preview" :style="{ backgroundColor: form.color }"></span>
        </el-form-item>
        <el-form-item label="初始余额">
          <el-input-number v-model="form.initialBalance" :precision="2" :min="0" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="账号">
          <el-input v-model="form.accountNo" placeholder="选填，如卡号、支付宝账号等" maxlength="30" />
        </el-form-item>
        <template v-if="form.type === 'credit'">
          <el-divider content-position="left">信用卡设置</el-divider>
          <el-form-item label="信用额度">
            <el-input-number v-model="form.creditLimit" :precision="2" :min="0" style="width: 100%;" />
          </el-form-item>
          <el-form-item label="账单日">
            <el-select v-model="form.billDay" placeholder="请选择账单日" style="width: 100%;">
              <el-option v-for="day in 31" :key="day" :label="day + '号'" :value="day" />
            </el-select>
          </el-form-item>
          <el-form-item label="还款日">
            <el-select v-model="form.dueDay" placeholder="请选择还款日" style="width: 100%;">
              <el-option v-for="day in 31" :key="day" :label="day + '号'" :value="day" />
            </el-select>
          </el-form-item>
        </template>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </span>
    </el-dialog>

    <el-dialog
      title="账户转账"
      :visible.sync="transferDialogVisible"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form :model="transferForm" :rules="transferRules" ref="transferForm" label-width="80px">
        <el-form-item label="转出账户" prop="fromAccountId">
          <el-select v-model="transferForm.fromAccountId" placeholder="请选择转出账户" style="width: 100%;" @change="handleFromAccountChange">
            <el-option
              v-for="account in availableAccounts"
              :key="account.id"
              :label="account.name + ' (余额: ' + formatMoney(account.balance) + ')'"
              :value="account.id"
              :disabled="account.disabled"
            >
              <span>{{ account.icon }} {{ account.name }}</span>
              <span style="float: right; color: #909399;">{{ formatMoney(account.balance) }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="转入账户" prop="toAccountId">
          <el-select v-model="transferForm.toAccountId" placeholder="请选择转入账户" style="width: 100%;">
            <el-option
              v-for="account in availableAccounts.filter(a => a.id !== transferForm.fromAccountId)"
              :key="account.id"
              :label="account.name"
              :value="account.id"
              :disabled="account.disabled"
            >
              <span>{{ account.icon }} {{ account.name }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="转账金额" prop="amount">
          <el-input-number v-model="transferForm.amount" :precision="2" :min="0.01" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="转账日期" prop="date">
          <el-date-picker
            v-model="transferForm.date"
            type="date"
            value-format="yyyy-MM-dd"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="transferForm.remark" placeholder="可选" maxlength="50" show-word-limit />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="transferDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleTransfer">确认转账</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { accountApi } from '@/api'
import { formatMoney, formatDate } from '@/utils'

export default {
  name: 'Accounts',
  data() {
    return {
      accounts: [],
      overview: null,
      reminders: [],
      activeTab: 'all',
      dialogVisible: false,
      isEdit: false,
      transferDialogVisible: false,
      dragAccount: null,
      accountTypes: [
        { value: 'cash', label: '现金', icon: '💵' },
        { value: 'debit', label: '储蓄卡', icon: '🏦' },
        { value: 'credit', label: '信用卡', icon: '💳' },
        { value: 'alipay', label: '支付宝', icon: '📱' },
        { value: 'wechat', label: '微信', icon: '💬' },
        { value: 'investment', label: '投资账户', icon: '📈' }
      ],
      form: {
        id: '',
        name: '',
        type: 'cash',
        icon: '💵',
        color: '#409EFF',
        initialBalance: 0,
        accountNo: '',
        billDay: null,
        dueDay: null,
        creditLimit: null
      },
      rules: {
        name: [{ required: true, message: '请输入账户名称', trigger: 'blur' }],
        type: [{ required: true, message: '请选择账户类型', trigger: 'change' }],
        icon: [{ required: true, message: '请选择图标', trigger: 'change' }],
        color: [{ required: true, message: '请选择颜色', trigger: 'change' }]
      },
      transferForm: {
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        date: formatDate(new Date()),
        remark: ''
      },
      transferRules: {
        fromAccountId: [{ required: true, message: '请选择转出账户', trigger: 'change' }],
        toAccountId: [{ required: true, message: '请选择转入账户', trigger: 'change' }],
        amount: [{ required: true, message: '请输入转账金额', trigger: 'blur' }],
        date: [{ required: true, message: '请选择转账日期', trigger: 'change' }]
      },
      iconList: [
        '💵', '🏦', '💳', '📱', '💬', '📈',
        '💰', '🏠', '🚗', '✈️', '🎁', '💎',
        '📊', '💼', '🎯', '⭐', '🏆', '🎪'
      ]
    }
  },
  computed: {
    sortedAccounts() {
      return [...this.accounts].sort((a, b) => a.sort - b.sort)
    },
    availableAccounts() {
      return this.accounts.filter(a => !a.disabled)
    },
    accountsByType() {
      const groups = {}
      this.accounts.forEach(account => {
        if (!groups[account.type]) {
          groups[account.type] = []
        }
        groups[account.type].push(account)
      })
      return groups
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    formatMoney,
    async loadData() {
      const [accounts, overview, reminders] = await Promise.all([
        accountApi.getAccounts(),
        accountApi.getAccountOverview(),
        accountApi.getCreditCardReminders()
      ])
      this.accounts = accounts || []
      this.overview = overview
      this.reminders = reminders || []
    },
    getAccountTypeName(type) {
      const typeMap = {
        cash: '现金',
        debit: '储蓄卡',
        credit: '信用卡',
        alipay: '支付宝',
        wechat: '微信',
        investment: '投资账户'
      }
      return typeMap[type] || type
    },
    handleAdd() {
      this.isEdit = false
      this.form = {
        id: '',
        name: '',
        type: 'cash',
        icon: '💵',
        color: '#409EFF',
        initialBalance: 0,
        accountNo: '',
        billDay: null,
        dueDay: null,
        creditLimit: null
      }
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs.form.clearValidate()
      })
    },
    handleEdit(account) {
      this.isEdit = true
      this.form = { ...account }
      if (this.form.type !== 'credit') {
        this.form.billDay = null
        this.form.dueDay = null
        this.form.creditLimit = null
      }
      this.dialogVisible = true
    },
    async handleCommand(command, account) {
      switch (command) {
        case 'edit':
          this.handleEdit(account)
          break
        case 'hide':
        case 'show':
          await accountApi.toggleAccountHidden(account.id)
          this.loadData()
          break
        case 'disable':
        case 'enable':
          await accountApi.toggleAccountDisabled(account.id)
          this.loadData()
          break
        case 'delete':
          this.handleDelete(account)
          break
      }
    },
    async handleDelete(account) {
      try {
        await this.$confirm(`确定要删除账户「${account.name}」吗？相关的记录不会被删除。`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        const result = await accountApi.deleteAccount(account.id)
        if (result) {
          this.$message.success('删除成功')
          this.loadData()
        }
      } catch (e) {}
    },
    async handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (valid) {
          let result
          if (this.isEdit) {
            result = await accountApi.updateAccount(this.form)
          } else {
            result = await accountApi.addAccount(this.form)
          }
          if (result) {
            this.$message.success(this.isEdit ? '更新成功' : '创建成功')
            this.dialogVisible = false
            this.loadData()
          }
        }
      })
    },
    startDrag(event, account) {
      this.dragAccount = account
      document.addEventListener('mousemove', this.onDrag)
      document.addEventListener('mouseup', this.stopDrag)
    },
    onDrag(event) {
      if (!this.dragAccount) return
      
      const cards = document.querySelectorAll('.account-card')
      let targetAccount = null
      
      cards.forEach(card => {
        const rect = card.getBoundingClientRect()
        if (event.clientY >= rect.top && event.clientY <= rect.bottom) {
          const accountId = card.querySelector('.account-name').getAttribute('data-id')
          targetAccount = this.accounts.find(a => a.id === accountId)
        }
      })
      
      if (targetAccount && targetAccount.id !== this.dragAccount.id) {
        const fromIndex = this.sortedAccounts.findIndex(a => a.id === this.dragAccount.id)
        const toIndex = this.sortedAccounts.findIndex(a => a.id === targetAccount.id)
        
        const newAccounts = [...this.sortedAccounts]
        const [removed] = newAccounts.splice(fromIndex, 1)
        newAccounts.splice(toIndex, 0, removed)
        
        const accountIds = newAccounts.map(a => a.id)
        accountApi.updateAccountSort(accountIds)
        
        this.accounts = newAccounts.map((a, index) => ({ ...a, sort: index + 1 }))
      }
    },
    stopDrag() {
      this.dragAccount = null
      document.removeEventListener('mousemove', this.onDrag)
      document.removeEventListener('mouseup', this.stopDrag)
      this.loadData()
    },
    openTransferDialog() {
      this.transferForm = {
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        date: formatDate(new Date()),
        remark: ''
      }
      this.transferDialogVisible = true
      this.$nextTick(() => {
        if (this.$refs.transferForm) {
          this.$refs.transferForm.clearValidate()
        }
      })
    },
    handleFromAccountChange() {
      if (this.transferForm.toAccountId === this.transferForm.fromAccountId) {
        this.transferForm.toAccountId = ''
      }
    },
    async handleTransfer() {
      this.$refs.transferForm.validate(async valid => {
        if (valid) {
          const fromAccount = this.accounts.find(a => a.id === this.transferForm.fromAccountId)
          const toAccount = this.accounts.find(a => a.id === this.transferForm.toAccountId)
          
          if (fromAccount.balance < this.transferForm.amount) {
            this.$message.error('转出账户余额不足')
            return
          }
          
          try {
            await this.$confirm(
              `确认从「${fromAccount.name}」转账 ${formatMoney(this.transferForm.amount)} 到「${toAccount.name}」吗？`,
              '转账确认',
              {
                confirmButtonText: '确认转账',
                cancelButtonText: '取消',
                type: 'warning'
              }
            )
            
            const result = await accountApi.transfer({
              ...this.transferForm,
              fromAccountName: fromAccount.name,
              toAccountName: toAccount.name
            })
            
            if (result) {
              this.$message.success('转账成功')
              this.transferDialogVisible = false
              this.loadData()
            }
          } catch (e) {}
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.accounts {
  .header {
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .page-title {
        font-size: 22px;
        font-weight: 600;
        color: $text-primary;
        margin: 0;
      }
      
      .net-worth-tag {
        font-size: 14px;
        
        .text-income {
          color: $income-color;
          font-weight: 600;
        }
        
        .text-expense {
          color: $expense-color;
          font-weight: 600;
        }
      }
    }
    
    .header-right {
      display: flex;
      align-items: center;
    }
  }
  
  .overview-row {
    margin-bottom: 20px;
    
    .overview-card {
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      
      .overview-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.85);
        margin-bottom: 8px;
      }
      
      .overview-value {
        font-size: 26px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 4px;
      }
      
      .overview-count {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
      }
      
      &.assets-card {
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      }
      
      &.liabilities-card {
        background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
      }
      
      &.networth-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        
        &.negative {
          background: linear-gradient(135deg, #c31432 0%, #240b36 100%);
        }
      }
    }
  }
  
  .credit-reminders {
    margin-bottom: 20px;
    
    .reminder-alert {
      margin-bottom: 10px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
  
  .tabs {
    ::v-deep .el-tabs__header {
      margin-bottom: 20px;
    }
  }
  
  .account-type-group {
    margin-bottom: 24px;
    
    .group-title {
      font-size: 16px;
      font-weight: 500;
      color: $text-primary;
      margin: 0 0 12px 0;
      padding-left: 8px;
      border-left: 3px solid $primary-color;
    }
  }
  
  .accounts-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .account-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-radius: 10px;
    border-left: 4px solid;
    transition: all 0.2s;
    
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    
    &.disabled {
      opacity: 0.6;
      background: #f5f7fa;
    }
    
    &.hidden {
      opacity: 0.5;
    }
    
    .account-left {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .sort-handle {
        cursor: move;
        color: $text-secondary;
        padding: 4px;
        
        &:hover {
          color: $primary-color;
        }
      }
      
      .account-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }
      
      .account-info {
        .account-name {
          font-size: 15px;
          font-weight: 500;
          color: $text-primary;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
        }
        
        .account-type {
          font-size: 12px;
          color: $text-secondary;
        }
      }
    }
    
    .account-right {
      display: flex;
      align-items: center;
      gap: 16px;
      
      .account-balance {
        font-size: 20px;
        font-weight: 600;
        color: $text-primary;
        
        &.negative {
          color: $expense-color;
        }
      }
      
      .account-actions {
        display: flex;
        gap: 4px;
      }
    }
  }
  
  .icon-picker {
    display: grid;
    grid-template-columns: repeat(9, 1fr);
    gap: 8px;
    padding: 8px;
    background: #fafafa;
    border-radius: 8px;
    
    .icon-item {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: #e8e8e8;
        transform: scale(1.1);
      }
      
      &.active {
        background: $primary-color;
        color: #fff;
      }
    }
  }
  
  .color-preview {
    display: inline-block;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    margin-left: 12px;
    vertical-align: middle;
    border: 1px solid #ddd;
  }
}
</style>
