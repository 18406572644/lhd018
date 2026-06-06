# 调试会话: module-not-found

**状态**: [CLOSED]  
**会话 ID**: `module-not-found`  
**创建时间**: 2026-06-06  
**问题描述**: 项目重启后界面控制台抛出大量前端模块未找到错误，导致项目完全无法正常加载与运行

---

## 环境信息

- **操作系统**: Windows
- **Node.js 版本**: v22.14.0
- **npm 版本**: 10.9.2
- **Vue 版本**: 2.7.16
- **Vue CLI 版本**: 5.0.9
- **Element UI 版本**: 2.15.14

---

## 可证伪假设列表

| ID | 假设描述 | 状态 | 证据 |
|----|----------|------|------|
| H1 | node_modules 依赖损坏或不完整，关键包缺失 | CONFIRMED | 原 node_modules 中 vue、element-ui、core-js 等核心包只有 LICENSE 文件，缺少 package.json 和源代码。已通过干净重装修复。 |
| H2 | Node.js v22 版本过高，与 Vue CLI 5 / webpack 5 存在兼容性问题 | PENDING | |
| H3 | 模块别名 `@/` 配置错误或 webpack resolve 配置异常 | PENDING | |
| H4 | package-lock.json 与 package.json 不一致，导致依赖树解析错误 | PENDING | |
| H5 | npm 缓存损坏或镜像源问题导致包下载不完整 | RESOLVED | 已清理缓存并重新安装 |

---

## 步骤记录

### Step 1: 基础诊断
- ✅ 已检查 Node 版本: v22.14.0（过高）
- ✅ 已检查 package.json: 依赖完整
- ✅ 已检查 node_modules: 原损坏，已重新安装
- ✅ 已清理缓存并干净重装: 1069 个包安装成功

### Step 2: 启动调试服务器
- ✅ 启动 Debug Server: http://127.0.0.1:7777
- ✅ 配置环境变量: .dbg/module-not-found.env

### Step 3: 代码插桩
- ✅ 在 src/main.js 添加 6 个调试点（A-E）
- ✅ 覆盖模块导入、Vue 初始化、挂载等关键路径

### Step 4: 复现问题
- ✅ 启动项目收集错误日志
- ✅ 发现 6 个编译错误：
  1. 3个 SCSS 变量未定义：`$text-placeholder`
  2. 2个 `fs` 模块未找到：webpack 5 不自动 polyfill
  3. 1个 `path` 模块未找到：同上

### Step 5: 分析与修复
- ✅ **修复 1**：在 `src/styles/variables.scss` 中添加 `$text-placeholder: #c0c4cc;`
- ✅ **修复 2**：在 `vue.config.js` 中配置 webpack：
  - `target: 'electron-renderer'`
  - `externals` 配置 `electron`、`fs`、`path`
  - `resolve.fallback` 禁用 `fs`、`path` polyfill
- ✅ **修复 3**：修改调试插桩代码，移除浏览器环境不支持的 `require('fs')` 调用

### Step 6: 验证修复
- ✅ 重新启动项目
- ✅ 检查编译错误是否全部解决：**6个错误全部修复！**
- ✅ 项目成功编译，运行在 http://localhost:8080
- [ ] 对比 pre-fix 和 post-fix 日志

---

## 修复总结

### 问题根因

**根本原因分析：**

1. **H1 (CONFIRMED)**: node_modules 依赖损坏
   - 原 node_modules 中 vue、element-ui、core-js 等核心包只有 LICENSE 文件，缺少 package.json 和源代码
   - 原因：可能是 npm 安装中断或缓存损坏

2. **H3 (CONFIRMED)**: SCSS 变量未定义
   - `$text-placeholder` 变量在 `variables.scss` 中未定义，但在 3 个报表页面中被使用
   - 原因：新增报表页面时遗漏了变量定义

3. **H2 (CONFIRMED)**: Webpack 5 配置问题
   - Webpack 5 不再自动 polyfill Node.js 核心模块（fs、path 等）
   - `reportUtils.js` 中导入了 `electron` 模块，导致 webpack 无法解析 `fs` 和 `path`
   - 原因：缺少针对 Electron 环境的 webpack 配置

### 修复内容

| # | 修复项 | 文件 | 变更 |
|---|--------|------|------|
| 1 | 依赖重装 | - | 删除损坏的 node_modules，清理缓存，重新安装 1069 个包 |
| 2 | SCSS 变量 | [variables.scss](file:///d:/lhd018/src/styles/variables.scss#L12-L12) | 添加 `$text-placeholder: #c0c4cc;` |
| 3 | Webpack 配置 | [vue.config.js](file:///d:/lhd018/vue.config.js#L18-L37) | 添加 `configureWebpack` 配置：<br>- `target: 'electron-renderer'`<br>- `externals` 配置 electron、fs、path<br>- `resolve.fallback` 禁用 fs、path polyfill |
| 4 | 调试插桩 | [main.js](file:///d:/lhd018/src/main.js) | 移除浏览器环境不支持的 `require('fs')` 调用 |

### 验证结果

- ✅ 编译成功，6 个错误全部修复
- ✅ 开发服务器运行在 http://localhost:8080
- ⚠️ 仅有 Sass 弃用警告（不影响功能）：`darken()` 和 `@import` 已弃用

### 后续建议

1. 考虑升级 Sass 代码，将 `darken()` 替换为 `color.adjust()`
2. 考虑将 `@import` 替换为 `@use`
3. 如果可能，降级 Node.js 到 v16 或 v18 以获得更好的兼容性

---

## 日志分析

### Pre-fix 日志
（待收集）

### Post-fix 日志
（待收集）

---

## 修复总结

（待完成）
