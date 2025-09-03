# Excel Review Application

一个基于 Next.js 的 Excel 文件验证和审查应用程序。

## 功能特点

- 📊 Excel 文件上传和验证
- 🔍 智能模板解析
- 📋 多种验证任务支持
- ✨ 现代化用户界面
- 🚀 实时验证结果展示

## 技术栈

- **框架**: Next.js 14 with App Router
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **Excel处理**: 自定义验证逻辑
- **UI组件**: 自定义 React 组件

## 安装和运行

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

## 项目结构

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API 路由
│   └── globals.css     # 全局样式
├── components/         # React 组件
│   ├── FileUpload.tsx
│   ├── SheetSelector.tsx
│   ├── TaskSelector.tsx
│   ├── ValidationRequirements.tsx
│   └── ValidationResults.tsx
└── lib/                # 工具库
    ├── exportErrors.ts
    ├── imageValidator.ts
    ├── templateParser.ts
    └── validator.ts
```

## 使用说明

1. 选择验证任务类型
2. 上传 Excel 文件
3. 选择要验证的工作表
4. 查看验证结果和错误报告
5. 导出错误信息（如需要）

## 开发者

- 项目维护者: hida
- 邮箱: hida@whitesand.online