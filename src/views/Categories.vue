<template>
  <div class="page-container categories">
    <div class="header flex-between">
      <div class="header-left">
        <h2 class="page-title">分类管理</h2>
        <span class="category-stats">
          <el-tag type="danger" size="small">支出: {{ expenseCategories.length }} 个</el-tag>
          <el-tag type="success" size="small" style="margin-left: 8px;">收入: {{ incomeCategories.length }} 个</el-tag>
        </span>
      </div>
      <div class="header-right">
        <el-button icon="el-icon-refresh" @click="handleReset">
          恢复默认
        </el-button>
        <el-button type="primary" icon="el-icon-plus" @click="handleAdd" style="margin-left: 8px;">
          新增分类
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="tabs">
      <el-tab-pane label="支出分类" name="expense">
        <div class="categories-list">
          <div
            v-for="cat in expenseCategories"
            :key="cat.id"
            class="category-card card"
          >
            <div class="category-left">
              <div class="category-icon" :style="{ backgroundColor: cat.color + '20', color: cat.color }">
                {{ cat.icon }}
              </div>
              <div class="category-info">
                <div class="category-name">{{ cat.name }}</div>
                <div class="category-color">
                  <span class="color-dot" :style="{ backgroundColor: cat.color }"></span>
                  {{ cat.color }}
                </div>
              </div>
            </div>
            <div class="category-actions">
              <el-button size="mini" type="primary" icon="el-icon-edit" @click="handleEdit(cat)" circle />
              <el-button size="mini" type="danger" icon="el-icon-delete" @click="handleDelete(cat)" circle />
            </div>
          </div>
          <el-empty v-if="expenseCategories.length === 0" description="暂无支出分类" />
        </div>
      </el-tab-pane>
      <el-tab-pane label="收入分类" name="income">
        <div class="categories-list">
          <div
            v-for="cat in incomeCategories"
            :key="cat.id"
            class="category-card card"
          >
            <div class="category-left">
              <div class="category-icon" :style="{ backgroundColor: cat.color + '20', color: cat.color }">
                {{ cat.icon }}
              </div>
              <div class="category-info">
                <div class="category-name">{{ cat.name }}</div>
                <div class="category-color">
                  <span class="color-dot" :style="{ backgroundColor: cat.color }"></span>
                  {{ cat.color }}
                </div>
              </div>
            </div>
            <div class="category-actions">
              <el-button size="mini" type="primary" icon="el-icon-edit" @click="handleEdit(cat)" circle />
              <el-button size="mini" type="danger" icon="el-icon-delete" @click="handleDelete(cat)" circle />
            </div>
          </div>
          <el-empty v-if="incomeCategories.length === 0" description="暂无收入分类" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      :title="isEdit ? '编辑分类' : '新增分类'"
      :visible.sync="dialogVisible"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="form" label-width="80px">
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio label="expense">支出</el-radio>
            <el-radio label="income">收入</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称" maxlength="10" show-word-limit />
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
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { categoryApi } from '@/api'

export default {
  name: 'Categories',
  data() {
    return {
      categories: [],
      activeTab: 'expense',
      dialogVisible: false,
      isEdit: false,
      form: {
        id: '',
        name: '',
        type: 'expense',
        icon: '💰',
        color: '#409EFF'
      },
      rules: {
        name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
        type: [{ required: true, message: '请选择类型', trigger: 'change' }],
        icon: [{ required: true, message: '请选择图标', trigger: 'change' }],
        color: [{ required: true, message: '请选择颜色', trigger: 'change' }]
      },
      iconList: [
        '🍜', '🍔', '☕', '🍱', '🥗',
        '🚗', '🚕', '🚌', '🚇', '✈️',
        '🛍️', '👕', '👟', '💄', '💍',
        '🎮', '🎬', '🎤', '🎨', '🎯',
        '🏠', '🏢', '🔌', '💧', '📱',
        '💊', '🏥', '💉', '🧴', '💪',
        '📚', '✏️', '🎓', '💻', '📱',
        '💰', '💵', '💳', '🎁', '📈',
        '💸', '📝', '🎧', '🎵', '🎮',
        '🌍', '🏖️', '🎿', '⛺', '🎪'
      ]
    }
  },
  computed: {
    expenseCategories() {
      return this.categories.filter(c => c.type === 'expense')
    },
    incomeCategories() {
      return this.categories.filter(c => c.type === 'income')
    }
  },
  created() {
    this.loadCategories()
  },
  methods: {
    async loadCategories() {
      const categories = await categoryApi.getCategories()
      this.categories = categories || []
    },
    handleAdd() {
      this.isEdit = false
      this.form = {
        id: '',
        name: '',
        type: this.activeTab,
        icon: '💰',
        color: this.activeTab === 'expense' ? '#F56C6C' : '#67C23A'
      }
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs.form.clearValidate()
      })
    },
    handleEdit(cat) {
      this.isEdit = true
      this.form = { ...cat }
      this.dialogVisible = true
    },
    async handleReset() {
      try {
        await this.$confirm('确定要恢复默认分类吗？这将重置所有分类为系统默认值。', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        const result = await categoryApi.resetCategories()
        if (result) {
          this.$message.success('已恢复默认分类')
          this.loadCategories()
        }
      } catch (e) {}
    },
    async handleDelete(cat) {
      try {
        await this.$confirm(`确定要删除分类「${cat.name}」吗？`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        const result = await categoryApi.deleteCategory(cat.id)
        if (result) {
          this.$message.success('删除成功')
          this.loadCategories()
        }
      } catch (e) {}
    },
    async handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (valid) {
          let result
          if (this.isEdit) {
            result = await categoryApi.updateCategory(this.form)
          } else {
            result = await categoryApi.addCategory(this.form)
          }
          if (result) {
            this.$message.success(this.isEdit ? '更新成功' : '创建成功')
            this.dialogVisible = false
            this.loadCategories()
          }
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.categories {
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
      
      .category-stats {
        display: flex;
        align-items: center;
      }
    }
    
    .header-right {
      display: flex;
      align-items: center;
    }
  }
  
  .tabs {
    ::v-deep .el-tabs__header {
      margin-bottom: 20px;
    }
  }
  
  .categories-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }
  
  .category-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-radius: 10px;
    
    .category-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .category-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    
    .category-name {
      font-size: 15px;
      font-weight: 500;
      color: $text-primary;
      margin-bottom: 4px;
    }
    
    .category-color {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: $text-secondary;
      
      .color-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
    }
  }
  
  .icon-picker {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
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
