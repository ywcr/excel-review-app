# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## 架构概览

这是一个基于 Next.js 的 Excel 文件验证和审查应用程序，采用纯前端解析架构，无需上传文件到服务器。

### 核心架构流程

```
用户界面 (src/app/page.tsx)
    ↓
前端验证Hook (src/hooks/useFrontendValidation.ts)
    ↓
Web Worker (public/validation-worker.js) 🚀 主流程
    ↓
图片处理器 (src/lib/imageProcessor.ts)
```

### 关键技术特性

- **纯前端解析**: 使用 Web Worker 进行 Excel 文件解析，保护数据安全
- **工作表过滤**: 支持 WPS Excel 按工作表过滤图片（修复了之前包含所有工作表的问题）
- **实时进度**: Web Worker 提供实时验证进度反馈
- **图片验证**: 清晰度检测、重复检测、尺寸验证、疑似网图检测
- **多线程处理**: 不阻塞 UI，支持大文件处理
- **认证系统**: JWT 基础的用户认证，支持持久化会话

## 开发命令

### 基础开发流程
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

### 代码质量检查
```bash
# ESLint 检查
npm run lint

# TypeScript 类型检查
npx tsc --noEmit
# 或使用预设的脚本
npm run type-check

# 严格模式检查（自定义脚本）
npm run strict-check
```

### 调试和测试
```bash
# 运行单个测试文件
npx jest path/to/test.test.ts

# TypeScript 编译检查（不输出文件）
npx tsc --noEmit

# 查看具体的 Next.js 构建分析
npx next build --debug
```

## 主要技术栈

### 前端框架
- **Next.js 15.5.2** with App Router
- **React 19.1.0** with TypeScript
- **Tailwind CSS 4** for styling

### Excel 和图片处理
- **SheetJS (XLSX)**: Excel 文件解析（前端）
- **JSZip**: ZIP 文件处理（解析 Excel 内部图片）
- **Canvas API**: 图片质量检测
- **blockhash**: 图片指纹和重复检测

### 认证和状态管理
- **JWT (jsonwebtoken)**: 用户认证
- **bcryptjs**: 密码哈希
- **React Hooks**: 状态管理

## 代码结构详解

### 主要入口文件
- `src/app/page.tsx`: 主页面组件，使用前端解析流程
- `src/hooks/useFrontendValidation.ts`: 前端验证的核心 Hook
- `public/validation-worker.js`: Web Worker，负责所有验证逻辑

### 核心库文件
- `src/lib/imageProcessor.ts`: 统一图片处理器（清晰度、重复性检测）
- `src/lib/validationRules.ts`: 验证规则和模板定义
- `src/lib/auth.ts`: 认证相关工具函数
- `src/lib/templateManager.ts`: 模板管理

### 组件架构
- `src/components/FileUpload.tsx`: 文件上传组件
- `src/components/FrontendSheetSelector.tsx`: 工作表选择器
- `src/components/ValidationResults.tsx`: 验证结果显示
- `src/components/TaskSelector.tsx`: 任务类型选择
- `src/components/UserMenu.tsx`: 用户菜单（认证相关）

## 特殊配置说明

### WPS Excel 兼容性
该应用专门处理了 WPS Excel 的图片过滤问题：
- WPS Excel 的 `cellimages.xml` 包含所有工作表的图片
- 应用会根据选定的工作表过滤相关图片
- 修复前：解析 162 张图片（所有工作表）
- 修复后：解析 28 张图片（仅选定工作表）

### 性能配置
```javascript
// 在 public/validation-worker.js 中的配置
const PERFORMANCE_CONFIG = {
  CHUNK_SIZE: 1000,        // 每次处理的行数
  PROGRESS_INTERVAL: 100,   // 进度更新间隔（毫秒）
  MEMORY_THRESHOLD: 100 * 1024 * 1024, // 100MB内存阈值
  MAX_ROWS_IN_MEMORY: 10000 // 内存中最大行数
}
```

### 图片验证配置
```javascript
// 图片重复检测配置
const IMAGE_DUP_CONFIG = {
  BLOCKHASH_BITS: 12,
  HAMMING_THRESHOLD: 12,
  // ... 其他配置
}

// 移动设备拍摄启发式检测
const MOBILE_DIMENSION_CONFIG = {
  MIN_SHORT_SIDE: 720,
  MIN_LONG_SIDE: 1280,
  MIN_MEGAPIXELS: 2,
  // ... 比例配置
}
```

## 认证系统

### 用户认证流程
1. 用户在 `/login` 页面登录
2. 成功后生成 JWT token 存储在 httpOnly cookie
3. 中间件检查受保护路由的认证状态
4. `useAuth` Hook 管理客户端认证状态

### 会话管理
- 使用持久化会话，无需频繁刷新 token
- 支持"记住我"功能，延长会话有效期
- 自动处理会话过期和重新认证

## 调试和故障排除

### Web Worker 调试
- 使用浏览器开发者工具的 Application > Service Workers
- Console 中查看前端解析的详细日志
- 进度消息带有 "🚀 前端解析" 标识

### 性能监控
- Worker 内置内存使用监控
- 支持大文件处理的分块机制
- 实时进度反馈和错误处理

### 常见问题
1. **文件格式问题**: 仅支持 .xlsx 和 .xls 格式
2. **大文件处理**: 超过 100MB 的文件会显示警告，建议分批处理
3. **图片验证失败**: 检查 `blockhash-core.js` 是否正确加载
4. **WPS Excel 图片数量异常**: 确认工作表过滤功能正常工作

## 开发最佳实践

### 添加新验证规则
1. 在 `src/lib/validationRules.ts` 中定义新的模板
2. 在 `public/validation-worker.js` 中添加对应的验证逻辑
3. 更新 UI 组件以显示新的验证结果

### 修改图片处理逻辑
1. 主要逻辑在 `src/lib/imageProcessor.ts`
2. Worker 中的图片处理调用统一的处理器
3. 配置参数可在 Worker 顶部调整

### 性能优化
1. 大文件处理：调整 `CHUNK_SIZE` 和内存阈值
2. 图片处理：优化 blockhash 参数和 SSIM 计算
3. 进度反馈：调整 `PROGRESS_INTERVAL` 平衡性能和用户体验

## 部署注意事项

### 静态资源
- `public/validation-worker.js`: 核心 Worker 文件
- `public/vendor/`: 第三方库（xlsx.js, jszip.js）
- `public/blockhash-core.js`: 图片哈希库

### 环境变量
检查是否需要配置认证相关的环境变量（JWT 密钥等）

### 浏览器兼容性
- 需要支持 Web Worker 的现代浏览器
- Canvas API 用于图片处理
- ES2018+ 语法支持