import Vue from 'vue'
import VueRouter from 'vue-router'
import Layout from '@/views/Layout.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/quick',
    children: [
      {
        path: 'quick',
        name: 'QuickAdd',
        component: () => import('@/views/QuickAdd.vue'),
        meta: { title: '快速记账', icon: 'el-icon-edit-outline' }
      },
      {
        path: 'records',
        name: 'Records',
        component: () => import('@/views/Records.vue'),
        meta: { title: '账单明细', icon: 'el-icon-document' }
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/views/Statistics.vue'),
        meta: { title: '统计图表', icon: 'el-icon-pie-chart' }
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/views/Categories.vue'),
        meta: { title: '分类管理', icon: 'el-icon-folder-opened' }
      },
      {
        path: 'accounts',
        name: 'Accounts',
        component: () => import('@/views/Accounts.vue'),
        meta: { title: '账户管理', icon: 'el-icon-wallet' }
      },
      {
        path: 'recurring',
        name: 'Recurring',
        component: () => import('@/views/Recurring.vue'),
        meta: { title: '周期账单', icon: 'el-icon-date' }
      },
      {
        path: 'receipts',
        name: 'Receipts',
        component: () => import('@/views/Receipts.vue'),
        meta: { title: '票据管理', icon: 'el-icon-picture-outline' }
      },
      {
        path: 'reimbursement',
        name: 'Reimbursement',
        component: () => import('@/views/Reimbursement.vue'),
        meta: { title: '报销管理', icon: 'el-icon-tickets' }
      },
      {
        path: 'import',
        name: 'DataImport',
        component: () => import('@/views/DataImport.vue'),
        meta: { title: '数据导入', icon: 'el-icon-upload2' }
      }
    ]
  }
]

const router = new VueRouter({
  mode: 'hash',
  routes
})

export default router
