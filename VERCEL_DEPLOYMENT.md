# Vercel部署指南

## 📋 项目现状

**项目类型**: Next.js 15 + React 19 + TypeScript  
**部署平台**: Vercel  
**核心功能**:
- ✅ Excel文件验证（前端Worker）
- ✅ 图片水印检测（前端实现）
- ✅ 图片重复检测（前端实现）
- ⚠️ 服装季节检测（纯规则模式）

---

## 🚀 快速部署

### 1. 前置准备

确保已安装：
- Node.js 18+
- npm或yarn

### 2. 本地测试

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000 测试
```

### 3. 部署到Vercel

#### 方法A：通过Vercel CLI（推荐）

```bash
# 安装Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
vercel

# 生产部署
vercel --prod
```

#### 方法B：通过Git集成

1. 将代码推送到GitHub/GitLab/Bitbucket
2. 在Vercel控制台导入项目
3. 自动部署

---

## ⚙️ 配置文件

### vercel.json（已配置）

```json
{
  "functions": {
    "src/app/api/validate/route.ts": {
      "maxDuration": 30
    },
    "src/app/api/tasks/route.ts": {
      "maxDuration": 10
    },
    "src/app/api/clothing-detect/route.ts": {
      "maxDuration": 10
    }
  },
  "regions": ["iad1"],
  "buildCommand": "npm run build"
}
```

### 环境变量

在Vercel控制台设置：

```env
# 基础配置
NODE_ENV=production

# JWT认证（如果使用）
JWT_SECRET=your_secret_key_here

# 服装检测配置
CLOTHING_DETECTION_MODE=rule-based

# 未来升级：AI服务（可选）
# REPLICATE_API_TOKEN=your_replicate_token
# HUGGINGFACE_API_TOKEN=your_hf_token
```

---

## 📁 项目结构（Vercel兼容）

```
excel-review-app/
├── src/
│   ├── app/
│   │   ├── api/                    # ✅ Vercel Serverless Functions
│   │   │   ├── auth/              # 认证API
│   │   │   ├── tasks/             # 任务管理
│   │   │   ├── clothing-detect/  # 服装检测API（新）
│   │   │   └── templates/         # 模板API
│   │   ├── page.tsx               # 首页
│   │   └── layout.tsx             # 布局
│   └── components/                 # React组件
│
├── public/
│   ├── validation-worker.js       # ✅ Web Worker（核心验证）
│   ├── clothing-season-checker.js # ✅ 服装检测集成
│   ├── advanced-watermark-detection.js
│   └── blockhash-core.js
│
├── scripts/                        # ❌ Python脚本（不部署）
│   ├── detect_clothing_enhanced.py # 本地测试用
│   └── ...
│
├── vercel.json                     # ✅ Vercel配置
├── next.config.ts                  # ✅ Next.js配置
└── package.json                    # ✅ 依赖配置
```

### 不部署的文件（自动忽略）

- `scripts/` - Python脚本
- `dataset/` - 训练数据
- `runs/` - 训练结果
- `.venv/` - Python虚拟环境
- `node_modules/` - npm模块
- `.next-dev/` - 开发缓存

---

## 🔧 服装检测功能说明

### 当前实现：纯规则模式

**功能**：
- ✅ 根据月份自动判断季节
- ✅ 换季期自动放宽容差
- ✅ 返回季节信息
- ⚠️ 无AI检测（需人工审核）

**API端点**：
```
GET  /api/clothing-detect?month=10
POST /api/clothing-detect
```

**返回示例**：
```json
{
  "success": true,
  "mode": "placeholder",
  "warning": "此为占位响应。完整AI检测需要外部服务支持。",
  "data": {
    "season_name": "秋季",
    "expected_season": "light",
    "is_transition_period": true,
    "message": "服装检测功能需要AI服务支持"
  }
}
```

### 未来升级：AI检测

#### 选项1：集成Replicate API

```typescript
// src/app/api/clothing-detect/route.ts
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 调用YOLO模型
const output = await replicate.run(
  "yolov8-model-id",
  { input: { image: base64Image } }
);
```

**费用**：按使用量付费，约$0.001-0.01/次

#### 选项2：部署独立Python服务

```yaml
# Railway/Render部署
Service: clothing-detection-api
Runtime: Python 3.11
Command: uvicorn api.clothing_season_api:app
Port: 8000
```

然后在Vercel API中调用：
```typescript
const response = await fetch(
  'https://your-python-service.railway.app/api/detect',
  { method: 'POST', body: imageData }
);
```

---

## ✅ 部署检查清单

### 部署前

- [ ] 运行 `npm run build` 确保构建成功
- [ ] 检查 `vercel.json` 配置正确
- [ ] 确认环境变量已设置
- [ ] 删除大文件（dataset/runs等）

### 部署后

- [ ] 访问生产URL验证首页加载
- [ ] 测试Excel文件上传功能
- [ ] 测试图片验证功能
- [ ] 检查控制台无严重错误
- [ ] 测试服装检测API: `/api/clothing-detect`

---

## 🐛 常见问题

### 问题1：构建失败

```
Error: Cannot find module 'xxx'
```

**解决**：
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 问题2：API超时

```
Function execution exceeded 10s timeout
```

**解决**：调整 `vercel.json`
```json
{
  "functions": {
    "src/app/api/your-route/route.ts": {
      "maxDuration": 30
    }
  }
}
```

### 问题3：Worker加载失败

```
Failed to load resource: clothing-season-checker.js
```

**解决**：确认文件在 `public/` 目录下

### 问题4：环境变量未生效

在Vercel控制台：
1. 进入项目设置
2. Environment Variables
3. 添加变量
4. 重新部署

---

## 📊 性能优化

### 1. 启用边缘运行时（可选）

```typescript
// src/app/api/clothing-detect/route.ts
export const runtime = 'edge'; // 更快的响应
```

### 2. 图片优化

```typescript
// next.config.ts
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};
```

### 3. 减小打包体积

```bash
# 分析打包大小
npm run build
npx @next/bundle-analyzer
```

---

## 🔐 安全建议

### 1. API路由保护

```typescript
// 添加认证中间件
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization');
  if (!verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // 处理请求...
}
```

### 2. 环境变量管理

- 生产环境使用 `.env.production`
- 开发环境使用 `.env.local`
- 敏感信息存储在Vercel环境变量

### 3. CORS配置

```typescript
// 限制跨域访问
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = ['https://your-domain.com'];
  
  if (!allowedOrigins.includes(origin)) {
    return new NextResponse(null, { status: 403 });
  }
  // ...
}
```

---

## 📈 监控和日志

### Vercel Analytics（推荐）

```bash
npm install @vercel/analytics
```

```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 错误追踪

考虑集成：
- Sentry
- LogRocket
- Vercel Logs（内置）

---

## 🚀 持续部署

### Git工作流

```bash
# 开发分支
git checkout -b feature/new-feature
git commit -m "Add new feature"
git push origin feature/new-feature

# Vercel自动部署预览
# 预览链接: https://your-app-git-branch-name.vercel.app

# 合并到主分支
git checkout main
git merge feature/new-feature
git push origin main

# 自动部署到生产
# 生产链接: https://your-app.vercel.app
```

---

## 📞 技术支持

**问题报告**：提交Issue到项目仓库  
**文档参考**：
- [Vercel官方文档](https://vercel.com/docs)
- [Next.js文档](https://nextjs.org/docs)
- 项目README

---

## 📄 更新日志

### 2025-10-16
- ✅ 添加服装季节检测API（纯规则模式）
- ✅ 更新Vercel配置支持新API
- ✅ 完善部署文档

### 未来计划
- [ ] 集成AI服务实现智能检测
- [ ] 添加更多验证规则
- [ ] 性能优化
