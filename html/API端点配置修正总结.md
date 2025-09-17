# API端点配置修正总结

## 🎯 正确的端点模式

根据你的指导，API端点应该遵循以下模式：

### 消费者问卷
```
/lgb/payMerge/createDynamicsSalt?methodName=/问卷类型/add
```

### 患者问卷
```
/lgb/问卷类型/createDynamicsSalt
```
或者对于六味患者问卷：
```
/lgb/hzwj/createDynamicsSalt
```

## 🔧 已修正的配置

### 1. 西黄消费者问卷 ✅
```javascript
saltEndpoint: "/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add"
```
**修正**: 去掉了URL编码 `%2F`，使用直接的 `/`

### 2. 牛解消费者问卷 ✅
```javascript
saltEndpoint: "/lgb/payMerge/createDynamicsSalt?methodName=/njwj/add"
```
**修正**: 已经是正确格式

### 3. 知柏消费者问卷 ✅
```javascript
saltEndpoint: "/lgb/payMerge/createDynamicsSalt?methodName=/zbwj/add"
```
**修正**: 去掉了URL编码 `%2F`，使用直接的 `/`

### 4. 六味患者问卷 ✅
```javascript
saltEndpoint: "/lgb/hzwj/createDynamicsSalt"
```
**说明**: 患者问卷使用专用端点，不需要 methodName 参数

### 5. 贴膏患者问卷 ✅
```javascript
saltEndpoint: "/lgb/tgwj/createDynamicsSalt",
saltEndpointAlt: "/lgb/payMerge/createDynamicsSalt?methodName=/tgwj/add"
```
**说明**: 主端点使用患者问卷模式，备用端点使用消费者问卷模式

## 📊 配置对比

| 问卷类型 | 类别 | 主端点 | 备用端点 |
|---------|------|--------|----------|
| 西黄 | 消费者 | `/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add` | - |
| 牛解 | 消费者 | `/lgb/payMerge/createDynamicsSalt?methodName=/njwj/add` | `/lgb/njwj/createDynamicsSalt` |
| 知柏 | 消费者 | `/lgb/payMerge/createDynamicsSalt?methodName=/zbwj/add` | - |
| 六味 | 患者 | `/lgb/hzwj/createDynamicsSalt` | - |
| 贴膏 | 患者 | `/lgb/tgwj/createDynamicsSalt` | `/lgb/payMerge/createDynamicsSalt?methodName=/tgwj/add` |

## 🚀 修正的关键点

### 1. URL编码问题
**修正前**:
```
methodName=%2Fxfzwj%2Fadd  // URL编码的 /xfzwj/add
```

**修正后**:
```
methodName=/xfzwj/add     // 直接使用斜杠
```

### 2. 患者问卷端点模式
**消费者问卷**: 使用通用的 `payMerge` 端点 + `methodName` 参数
**患者问卷**: 使用专用的问卷类型端点，不需要额外参数

### 3. 备用端点策略
- 牛解消费者问卷：有备用端点，防止参数验证异常
- 贴膏患者问卷：有备用端点，因为患者问卷可能也支持消费者模式

## 🔍 测试建议

现在配置已经修正，建议按以下顺序测试：

### 1. 立即测试
重新生成代码并测试API模式，特别是：
- 牛解消费者问卷（之前失败的）
- 其他消费者问卷

### 2. 使用测试页面验证
打开 `html/test-api-endpoints.html` 验证所有端点都能正常工作

### 3. 检查日志
查看控制台日志，确认：
```
🔍 开始获取动态盐值...
请求端点: https://zxyy.ltd/lgb/payMerge/createDynamicsSalt?methodName=/njwj/add
HTTP响应状态: 200 OK
✅ 动态盐值获取成功: {signkey: "...", timestamp: ...}
```

## 🎯 预期结果

修正后，所有问卷的API模式都应该能正常工作：

### 成功的日志示例
```
[API] 开始处理第 1/15 个: 景彬娣 (女)
🔍 开始获取动态盐值...
✅ 动态盐值获取成功: 87093
签名参数: { dataLength: 156, keyLength: 32, key: "abc123def4..." }
✅ 签名生成成功: 8f2a3b4c5d6e7f8g...
✅ API创建成功: 景彬娣 (女)
```

### 如果仍有问题
系统会自动尝试备用端点：
```
⚠️ 主端点参数验证异常，尝试备用端点...
🔄 尝试备用端点: /lgb/njwj/createDynamicsSalt
✅ 备用端点获取成功
```

## 📋 总结

通过这次修正：
1. **修复了URL编码问题** - 所有消费者问卷端点都使用正确的格式
2. **区分了患者和消费者问卷** - 使用不同的端点模式
3. **添加了备用端点** - 提高了系统的容错性
4. **保持了向后兼容** - 原有功能不受影响

现在API模式应该能正常工作了！请重新测试牛解消费者问卷的API模式。
