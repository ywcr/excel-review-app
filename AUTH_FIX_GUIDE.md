# Vercel 认证问题修复指南

## 🚨 问题描述

Vercel 部署后出现 401 错误：

- 用户无法登录
- `/api/auth/refresh` 返回 401 错误
- 提示"您的会话已过期或在其他设备登录，请重新登录"

## 🔍 根本原因

1. **文件系统限制**：Vercel 无服务器环境不支持文件写入
2. **会话存储问题**：原认证系统依赖本地 `data/users.json` 文件
3. **环境变量缺失**：JWT_SECRET 等关键配置可能未设置

## ✅ 修复方案（已实施）

### 1. 代码修复

- ✅ 添加 Vercel 环境检测函数
- ✅ 在生产环境中跳过文件系统会话管理
- ✅ 使用纯 JWT 验证作为回退方案
- ✅ 添加默认管理员用户
- ✅ 延长生产环境 JWT 过期时间

### 2. 支持的用户账号

系统现在支持 `data/users.json` 文件中的所有用户：

- **admin** - 管理员账号
- **chenrong** - 管理员账号
- **yaowei** - 管理员账号

⚠️ **注意**: 请使用您在本地设置的密码登录这些账号

## 🔧 部署步骤

### 1. 设置 Vercel 环境变量

在 Vercel Dashboard → Settings → Environment Variables 中添加：

```bash
JWT_SECRET=your-super-secret-jwt-key-here-please-change-in-production-environment-2024
JWT_EXPIRES_IN=365d
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

### 2. 重新部署

```bash
git add .
git commit -m "fix: 修复 Vercel 认证问题"
git push
```

### 3. 验证修复

访问以下 URL 测试：

1. **认证系统状态**：

   ```
   GET https://your-app.vercel.app/api/auth/test
   ```

2. **登录测试**：

   ```
   POST https://your-app.vercel.app/api/auth/login
   Content-Type: application/json

   {
     "username": "admin",
     "password": "your-actual-password"
   }
   ```

   或使用其他用户：chenrong、yaowei

3. **用户信息**：
   ```
   GET https://your-app.vercel.app/api/auth/me
   ```

## 🔒 安全建议

⚠️ **重要**：请立即更改默认密码！

1. 登录后创建新的管理员账户
2. 删除或禁用默认账户
3. 使用强密码策略

## 🚀 长期解决方案

建议迁移到数据库存储：

- **Vercel KV** (Redis)
- **Supabase**
- **PlanetScale**
- **MongoDB Atlas**

这样可以支持：

- 多用户管理
- 持久化会话
- 用户注册
- 更好的安全性

## 🐛 故障排除

如果问题仍然存在：

1. **检查环境变量**：确保 JWT_SECRET 已设置
2. **查看部署日志**：Vercel Dashboard → Functions → View Logs
3. **测试认证 API**：访问 `/api/auth/test`
4. **清除浏览器缓存**：删除旧的认证 cookies

## 📞 技术支持

如需帮助，请提供：

- Vercel 部署 URL
- `/api/auth/test` 响应结果
- 浏览器控制台错误截图
- Vercel 函数日志
