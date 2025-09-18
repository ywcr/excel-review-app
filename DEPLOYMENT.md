# 部署指南

## Vercel 部署配置

### 必需的环境变量

在 Vercel 控制台中需要配置以下环境变量：

#### 1. JWT 认证密钥
```
JWT_SECRET=your-super-secret-jwt-key-here-please-change-in-production-environment-2024
```
**重要：** 这个密钥必须与本地开发环境保持一致，否则会导致登录失败。

#### 2. 应用URL（可选）
```
NEXT_PUBLIC_APP_URL=https://your-vercel-app-url.vercel.app
```

### 配置步骤

1. **登录 Vercel 控制台**
   - 访问 https://vercel.com
   - 进入你的项目

2. **配置环境变量**
   - 点击项目 → Settings → Environment Variables
   - 添加以下变量：
     - `JWT_SECRET`: `your-super-secret-jwt-key-here-please-change-in-production-environment-2024`
     - `NEXT_PUBLIC_APP_URL`: `https://your-domain.vercel.app`

3. **重新部署**
   - 配置完环境变量后，触发重新部署
   - 或者推送新的代码提交

### 常见问题

#### 登录提示"会话已过期"
**原因：** JWT_SECRET 环境变量未配置或与本地不一致
**解决：** 在 Vercel 中正确配置 JWT_SECRET 环境变量

#### 页面加载错误
**原因：** 构建配置问题
**解决：** 确保 next.config.mjs 中的 distDir 配置正确

### 本地开发 vs 生产环境

- **本地开发：** 使用 `.env.local` 文件
- **生产环境：** 使用 Vercel 环境变量配置

### 安全注意事项

1. **JWT_SECRET** 必须是强密钥，建议使用随机生成的长字符串
2. 不要在代码中硬编码敏感信息
3. 定期更换生产环境的密钥
