# Vercel 环境变量设置指南

## 必需的环境变量

请在 Vercel 项目设置中添加以下环境变量：

### 1. JWT 密钥
```
JWT_SECRET=your-super-secret-jwt-key-here-please-change-in-production-environment-2024
```

### 2. JWT 过期时间（可选）
```
JWT_EXPIRES_IN=365d
```

### 3. 应用 URL
```
NEXT_PUBLIC_APP_URL=https://your-vercel-app-url.vercel.app
```

## 设置步骤

1. 登录 Vercel Dashboard
2. 选择您的项目
3. 进入 Settings > Environment Variables
4. 添加上述环境变量
5. 重新部署项目

## 验证设置

部署完成后，访问以下 URL 验证：
- `https://your-app.vercel.app/api/auth/me` （应该返回 401，表示认证系统正常工作）
