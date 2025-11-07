# 登录改进说明

## 问题分析

用户报告"一天需要登录好几次"，经排查发现主要问题：

### 1. Cookie maxAge 单位错误（严重）
- **位置**: `src/app/api/auth/login/route.ts` 第73行
- **问题**: `maxAge: 365 * 24 * 60 * 60 * 1000` 使用了毫秒，但 Next.js cookie 的 `maxAge` 单位是**秒**
- **影响**: 浏览器可能拒绝接受这么长的过期时间，导致 cookie 失效
- **修复**: 改为 `maxAge: 365 * 24 * 60 * 60`（秒）

### 2. Vercel 内存缓存过短
- **位置**: `src/lib/auth.ts` 第79行
- **问题**: 内存缓存仅 5 分钟，在 Vercel 无服务器环境中容易导致会话信息丢失
- **影响**: 启用单设备登录时，缓存过期会导致会话验证失败
- **修复**: 延长到 1 小时

### 3. 单设备登录默认启用
- **位置**: `src/lib/auth-config.ts` 第13行
- **问题**: 默认启用单设备登录，多个浏览器/设备会互相踢出
- **影响**: 在不同设备间切换会频繁需要重新登录
- **修复**: 改为默认禁用

## 实施方案

### 修改1: 禁用单设备登录 + 保留账号存在性检查

```typescript
// src/lib/auth-config.ts
SINGLE_DEVICE_LOGIN: process.env.SINGLE_DEVICE_LOGIN === "true", // 默认禁用
```

```typescript
// src/lib/auth.ts - validateUserSession
export function validateUserSession(
  userId: string,
  tokenHash: string,
  sessionId?: string,
  loginTime?: number
): boolean {
  try {
    const userData = loadUsers();
    const user = userData.users.find((u) => u.id === userId);
    
    // 🔒 始终检查用户是否存在（即使禁用单设备登录）
    if (!user) {
      console.log(`用户 ${userId} 不存在，会话无效`);
      return false;
    }
    
    // 如果禁用了单设备登录，仅检查用户存在性即可
    if (!AUTH_CONFIG.SINGLE_DEVICE_LOGIN) {
      return true;
    }
    
    // 单设备登录启用时的额外检查...
  }
}
```

### 修改2: 审核时自动检测账号

在 `src/app/page.tsx` 的 `handleValidate` 函数中（已有）：

```typescript
const handleValidate = async () => {
  // ... 
  
  // 验证前检查登录状态（会检查账号是否存在）
  const isAuthValid = await ensureAuthenticated();
  if (!isAuthValid) {
    setLocalError("登录状态已过期，请重新登录");
    return;
  }
  
  // 执行审核...
}
```

## 验证流程

每次点击"审核"按钮时的完整流程：

```
用户点击审核
    ↓
handleValidate()
    ↓
ensureAuthenticated()
    ↓
调用 /api/auth/me
    ↓
verifyTokenWithSession(token)
    ↓
validateUserSession(userId, ...)
    ↓
检查用户是否存在 ✓
    ↓
返回验证结果
```

## 使用说明

### 启用单设备登录（按需）

如果需要强制单设备登录（一个账号只能在一个设备登录），设置环境变量：

```bash
# .env.local 或 Vercel 环境变量
SINGLE_DEVICE_LOGIN=true
```

### 调整登录有效期

```bash
# 默认为 365 天
JWT_EXPIRES_IN=365d

# 其他示例
JWT_EXPIRES_IN=7d    # 7天
JWT_EXPIRES_IN=30d   # 30天
JWT_EXPIRES_IN=24h   # 24小时
```

## 安全保障

即使禁用单设备登录，系统仍然保证：

1. ✅ 每次审核前检查账号是否存在
2. ✅ JWT token 正常验证和过期检查
3. ✅ 会话持久化（365天）
4. ✅ 账号被删除时立即失效
5. ✅ 用户主动登出时清除会话

## 测试建议

1. **测试频繁失效问题**: 登录后，间隔几小时再次访问，应该不需要重新登录
2. **测试多设备**: 在多个浏览器同时登录，应该都能正常使用
3. **测试账号删除**: 删除账号后，使用旧 token 应该立即失效
4. **测试审核**: 点击审核按钮时，应该自动检查账号状态

## 变更文件清单

- [x] `src/lib/auth-config.ts` - 禁用单设备登录
- [x] `src/lib/auth.ts` - 增强会话验证，始终检查账号存在性
- [x] `src/app/api/auth/login/route.ts` - 修复 cookie maxAge 单位
- [x] 延长 Vercel 内存缓存时间

## 部署后验证

```bash
# 检查配置
npm run build
npm start

# 测试登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}' \
  -c cookies.txt

# 测试会话验证
curl http://localhost:3000/api/auth/me -b cookies.txt
```
