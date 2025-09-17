# API端点统一配置总结

## 🎯 正确理解的端点模式

根据你的澄清，API端点应该按问卷类别统一：

### 消费者问卷（统一端点）
```
/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add
```
**所有消费者问卷都使用同一个端点**，不区分具体问卷类型

### 患者问卷（统一端点）
```
/lgb/payMerge/createDynamicsSalt?methodName=/hzwj/add
```
**所有患者问卷都使用同一个端点**，不区分具体问卷类型

## ✅ 已修正的配置

### 消费者问卷类型
1. **西黄消费者问卷** ✅
   ```javascript
   saltEndpoint: "/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add"
   ```

2. **牛解消费者问卷** ✅
   ```javascript
   saltEndpoint: "/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add"
   ```

3. **知柏消费者问卷** ✅
   ```javascript
   saltEndpoint: "/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add"
   ```

### 患者问卷类型
1. **六味患者问卷** ✅
   ```javascript
   saltEndpoint: "/lgb/payMerge/createDynamicsSalt?methodName=/hzwj/add"
   ```

2. **贴膏患者问卷** ✅
   ```javascript
   saltEndpoint: "/lgb/payMerge/createDynamicsSalt?methodName=/hzwj/add"
   ```

## 📊 统一后的配置对比

| 问卷名称 | 问卷类别 | 盐值端点 |
|---------|---------|----------|
| 西黄消费者问卷 | 消费者 | `/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add` |
| 牛解消费者问卷 | 消费者 | `/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add` |
| 知柏消费者问卷 | 消费者 | `/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add` |
| 六味患者问卷 | 患者 | `/lgb/payMerge/createDynamicsSalt?methodName=/hzwj/add` |
| 贴膏患者问卷 | 患者 | `/lgb/payMerge/createDynamicsSalt?methodName=/hzwj/add` |

## 🔧 关键修正点

### 1. 统一消费者问卷端点
**修正前**：每个消费者问卷使用不同的 methodName
- 西黄：`/xfzwj/add`
- 牛解：`/njwj/add`  
- 知柏：`/zbwj/add`

**修正后**：所有消费者问卷统一使用
- 统一：`/xfzwj/add`

### 2. 统一患者问卷端点
**修正前**：患者问卷使用专用端点
- 六味：`/lgb/hzwj/createDynamicsSalt`
- 贴膏：`/lgb/tgwj/createDynamicsSalt`

**修正后**：所有患者问卷统一使用
- 统一：`/lgb/payMerge/createDynamicsSalt?methodName=/hzwj/add`

### 3. 删除备用端点
删除了所有 `saltEndpointAlt` 配置，因为现在使用统一的端点格式。

## 🚀 预期效果

### 消费者问卷测试
所有消费者问卷（西黄、牛解、知柏）都应该能正常工作：
```
🔍 开始获取动态盐值...
请求端点: https://zxyy.ltd/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add
✅ 动态盐值获取成功
```

### 患者问卷测试
所有患者问卷（六味、贴膏）都应该能正常工作：
```
🔍 开始获取动态盐值...
请求端点: https://zxyy.ltd/lgb/payMerge/createDynamicsSalt?methodName=/hzwj/add
✅ 动态盐值获取成功
```

## 📋 测试建议

### 1. 立即测试
重新生成代码并测试API模式：
- 牛解消费者问卷（之前失败的）
- 其他所有问卷类型

### 2. 验证统一性
确认所有同类别问卷使用相同的端点：
- 所有消费者问卷都请求 `/xfzwj/add`
- 所有患者问卷都请求 `/hzwj/add`

### 3. 检查日志
查看控制台日志，确认端点统一：
```
[API] 开始处理第 1/15 个: 景彬娣 (女)
🔍 开始获取动态盐值...
请求端点: https://zxyy.ltd/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add
✅ 动态盐值获取成功
```

## 🎯 总结

通过这次统一配置：

1. **简化了端点管理** - 只需要维护2个端点（消费者+患者）
2. **消除了配置差异** - 同类别问卷使用完全相同的配置
3. **提高了一致性** - 减少了因端点不同导致的错误
4. **便于维护** - 如果端点需要调整，只需要修改2个地方

现在所有问卷的API模式都应该能正常工作了！请重新测试牛解消费者问卷。
