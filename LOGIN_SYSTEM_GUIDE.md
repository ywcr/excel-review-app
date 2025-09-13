# Excel 审核系统 - 登录系统使用指南

## 概述

本系统已集成了基于 JWT 的登录认证系统，支持用户管理和权限控制。系统不支持用户注册，所有用户账户需要通过管理脚本创建。

## 技术架构

- **认证方式**: JWT (JSON Web Token)
- **密码加密**: bcrypt (10 轮加密)
- **会话存储**: HTTP-only Cookie
- **用户数据**: 基于文件存储 (data/users.json)
- **路由保护**: Next.js 中间件

## 默认管理员账户

系统已创建默认管理员账户：

- **用户名**: admin
- **密码**: admin123
- **角色**: admin

⚠️ **重要**: 请在生产环境中立即修改默认密码！

## 用户管理

### 1. 交互式用户管理

运行用户管理脚本：

```bash
node scripts/manage-users.js
```

这将显示交互式菜单：

```
=== Excel审核系统 - 用户管理 ===
1. 添加用户
2. 删除用户
3. 列出用户
4. 修改密码
5. 退出
```

### 2. 命令行用户管理

也可以直接使用命令行参数：

```bash
# 添加用户
node scripts/manage-users.js add

# 删除用户
node scripts/manage-users.js delete

# 列出所有用户
node scripts/manage-users.js list

# 修改密码
node scripts/manage-users.js change-password
```

### 3. 用户角色

系统支持两种角色：

- **admin**: 管理员，拥有所有权限
- **user**: 普通用户，可以使用系统功能

## 登录流程

1. 访问系统任何受保护的页面
2. 系统自动重定向到 `/login` 页面
3. 输入用户名和密码
4. 登录成功后重定向到原始页面或首页
5. 登录状态保持 24 小时（可配置）

## 会话管理和过期处理

### 1. 自动令牌刷新

系统实现了智能的令牌刷新机制：

- **自动刷新**: 每 20 分钟自动刷新令牌
- **任务保护**: Excel 验证期间每 5 分钟刷新令牌
- **无感知刷新**: 用户无需重新登录

### 2. 长时间任务保护

在进行 Excel 验证等长时间任务时：

- 系统自动启用会话保持模式
- 更频繁的令牌刷新（5 分钟间隔）
- 确保任务完成前不会过期

### 3. 过期处理策略

- **页面访问**: 自动重定向到登录页面
- **API 调用**: 返回 401 状态码，前端自动处理
- **任务进行中**: 自动刷新令牌，无需中断

## 安全特性

### 1. 密码安全

- 使用 bcrypt 进行密码哈希
- 10 轮加密强度
- 密码不以明文存储

### 2. 会话安全

- JWT 令牌存储在 HTTP-only Cookie 中
- 防止 XSS 攻击
- 自动过期和刷新机制
- 智能会话保持

### 3. 路由保护

- 中间件自动保护所有页面和 API
- 未认证用户自动重定向
- API 请求返回 401 状态码

## 配置选项

可以通过环境变量配置系统：

```bash
# JWT 密钥（生产环境必须设置）
JWT_SECRET=your-super-secret-jwt-key

# JWT 过期时间 (支持格式: 30s, 5m, 2h, 7d)
JWT_EXPIRES_IN=24h

# 自动刷新令牌设置
AUTO_REFRESH_ENABLED=true          # 是否启用自动刷新
AUTO_REFRESH_INTERVAL=1200000      # 自动刷新间隔(毫秒) - 20分钟

# 任务期间会话保持设置
TASK_SESSION_KEEP_ALIVE=true       # 是否在任务期间保持会话
TASK_REFRESH_INTERVAL=300000       # 任务期间刷新间隔(毫秒) - 5分钟
```

复制 `.env.example` 到 `.env.local` 并根据需要修改配置。

## 文件结构

```
├── data/
│   └── users.json              # 用户数据文件
├── scripts/
│   ├── manage-users.js         # 用户管理脚本
│   └── create-admin.js         # 创建管理员脚本
├── src/
│   ├── app/
│   │   ├── api/auth/           # 认证API路由
│   │   │   ├── login/route.ts  # 登录API
│   │   │   ├── logout/route.ts # 登出API
│   │   │   └── me/route.ts     # 获取用户信息API
│   │   └── login/
│   │       └── page.tsx        # 登录页面
│   ├── components/
│   │   ├── LoginForm.tsx       # 登录表单组件
│   │   └── UserMenu.tsx        # 用户菜单组件
│   ├── hooks/
│   │   └── useAuth.ts          # 认证状态管理Hook
│   ├── lib/
│   │   └── auth.ts             # 认证工具函数
│   └── middleware.ts           # 路由保护中间件
```

## 常见问题

### Q: 在做 Excel 任务时会话过期怎么办？

A: 系统已实现智能会话保持机制：

- Excel 验证期间自动每 5 分钟刷新令牌
- 无需担心任务中途过期
- 如果意外过期，系统会自动尝试刷新

### Q: 如何重置管理员密码？

A: 运行 `node scripts/manage-users.js change-password` 并选择 admin 用户。

### Q: 如何添加新用户？

A: 运行 `node scripts/manage-users.js add` 并按提示输入用户信息。

### Q: 用户数据存储在哪里？

A: 用户数据存储在 `data/users.json` 文件中。

### Q: 如何备份用户数据？

A: 复制 `data/users.json` 文件即可。

### Q: 登录页面在哪里？

A: 访问 `/login` 或者访问任何受保护的页面会自动重定向。

### Q: 如何修改 JWT 过期时间？

A: 设置环境变量 `JWT_EXPIRES_IN`，例如 `JWT_EXPIRES_IN=7d` 表示 7 天。

## 生产环境部署注意事项

1. **修改默认密码**: 立即修改 admin 用户的默认密码
2. **设置 JWT 密钥**: 设置强随机的 `JWT_SECRET` 环境变量
3. **备份用户数据**: 定期备份 `data/users.json` 文件
4. **HTTPS**: 确保在生产环境中使用 HTTPS
5. **文件权限**: 确保 `data/users.json` 文件权限安全

## 开发和测试

启动开发服务器：

```bash
npm run dev
```

访问 http://localhost:3000，系统会自动重定向到登录页面。

使用默认管理员账户登录：

- 用户名: admin
- 密码: admin123

登录成功后即可正常使用系统功能。
