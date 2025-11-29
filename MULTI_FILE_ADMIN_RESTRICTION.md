# 多文件审核功能 - Admin 权限限制

## 📋 功能说明

多文件审核功能现已限制为**仅管理员**可访问。

---

## 🔒 权限控制

### 1. 页面访问控制

**位置**: `/app/multi-review/page.tsx`

**逻辑**:

```typescript
// 检查用户是否为管理员
if (user.role !== "admin") {
  return <div>权限不足提示页面</div>;
}
```

**效果**:

- ✅ Admin 用户：可以正常访问多文件审核页面
- ❌ 普通用户：显示权限不足提示，无法访问

### 2. 导航按钮控制

**位置**: `/app/page.tsx`

**逻辑**:

```typescript
{
  user?.role === "admin" && <Link href="/multi-review">🚀 多文件审核</Link>;
}
```

**效果**:

- ✅ Admin 用户：在单文件审核页面顶部看到"多文件审核"按钮
- ❌ 普通用户：按钮不显示，无法通过 UI 导航到多文件审核页面

---

## 🎨 权限不足页面

当非管理员用户尝试访问多文件审核页面时，会看到：

### 显示内容

1. **警告图标** ⚠️
2. **标题**: "权限不足"
3. **说明**: "多文件审核功能仅限管理员使用"
4. **当前账号信息**:
   - 用户名: xxx
   - 角色: user/admin
5. **返回按钮**: "返回单文件审核"

### UI 特点

- 居中显示
- 清晰的视觉反馈
- 显示当前登录信息
- 提供明确的返回路径

---

## 🔐 角色说明

### Admin（管理员）

**权限**:

- ✅ 访问单文件审核
- ✅ 访问多文件审核
- ✅ 批量处理 Excel 文件
- ✅ 所有审核功能

**识别**:

- `user.role === "admin"`
- 可以看到"多文件审核"按钮

### User（普通用户）

**权限**:

- ✅ 访问单文件审核
- ❌ 无法访问多文件审核

**识别**:

- `user.role !== "admin"`
- 看不到"多文件审核"按钮
- 直接访问 `/multi-review` 会被拦截

---

## 🧪 测试验证

### 测试场景 1: Admin 用户

**步骤**:

1. 使用 admin 账号登录
2. 查看单文件审核页面

**预期**:

- ✅ 看到"🚀 多文件审核"按钮
- ✅ 点击可正常访问
- ✅ 多文件审核功能正常使用

### 测试场景 2: 普通用户

**步骤**:

1. 使用普通账号登录
2. 查看单文件审核页面

**预期**:

- ✅ 看不到"多文件审核"按钮
- ✅ 仅能使用单文件审核

### 测试场景 3: 直接 URL 访问

**步骤**:

1. 使用普通账号登录
2. 直接访问 `/multi-review`

**预期**:

- ✅ 显示权限不足页面
- ✅ 显示当前用户信息
- ✅ 提供"返回单文件审核"按钮

---

## 💡 设计考虑

### 1. 双重保护

- **UI 层**: 不显示按钮给非管理员
- **页面层**: 即使直接访问 URL 也会被拦截

### 2. 用户友好

- 清晰的权限提示
- 显示当前账号信息
- 明确的返回路径

### 3. 安全性

- 前端权限检查
- 基于用户角色判断
- 防止未授权访问

---

## 🔄 修改的文件

| 文件                         | 修改内容               | 行号     |
| ---------------------------- | ---------------------- | -------- |
| `/app/multi-review/page.tsx` | 添加 admin 权限检查    | ~186-226 |
| `/app/page.tsx`              | 多文件审核按钮条件渲染 | ~500-507 |

---

## 📝 代码示例

### 页面权限检查

```typescript
// /app/multi-review/page.tsx
if (user.role !== "admin") {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <svg className="mx-auto h-12 w-12 text-red-400">{/* 警告图标 */}</svg>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">权限不足</h2>
        <p className="text-gray-600 mb-6">多文件审核功能仅限管理员使用</p>
        <div className="space-y-3">
          <div className="text-sm text-gray-500 bg-gray-100 rounded-lg p-3">
            <p className="font-medium">当前账号信息：</p>
            <p className="mt-1">用户名: {user.username}</p>
            <p>角色: {user.role}</p>
          </div>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            返回单文件审核
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### 按钮条件渲染

```typescript
// /app/page.tsx
{
  user?.role === "admin" && (
    <Link
      href="/multi-review"
      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg text-sm font-medium"
    >
      🚀 多文件审核
    </Link>
  );
}
```

---

## ⚙️ 技术实现

### 使用的技术

1. **useAuth Hook**

   - 提供用户信息
   - 包含 `role` 字段

2. **条件渲染**

   - React 条件表达式
   - `user?.role === "admin"`

3. **早期返回**
   - 在组件渲染前检查权限
   - 返回权限不足页面

---

## 🔮 未来扩展

### 可选的改进方向

1. **后端权限验证**

   - API 层面的权限检查
   - 更安全的权限控制

2. **细粒度权限**

   - 定义更多角色（编辑、审核员等）
   - 基于功能的权限控制

3. **权限管理页面**

   - 管理员可分配角色
   - 用户权限管理界面

4. **审计日志**
   - 记录权限访问尝试
   - 追踪未授权访问

---

## 📚 相关文档

- [多文件审核指南](./MULTI_FILE_REVIEW_GUIDE.md)
- [自动队列改进](./MULTI_FILE_REVIEW_IMPROVEMENTS.md)
- [Bug 修复文档](./MULTI_FILE_REVIEW_BUGFIXES.md)

---

**实施日期**: 2024 年  
**版本**: v1.3.0  
**功能**: Admin 权限限制  
**状态**: ✅ 已完成
