# API 签名 URL 编码问题修复

## 问题描述

API 模式创建任务时出现验签失败：
```
{"code":5000,"message":"安全校验失败-验签失败","data":null,"count":null}
```

经过多次调试，发现问题在于 `encryptedText` 的生成方式不一致。

## 根本原因

### 我们的实现（错误）

```javascript
function toQueryString(obj) {
  const keys = Object.keys(obj).sort();
  return keys.map(k => 
    encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])
  ).join('&');
}
```

**问题**: 使用了 `encodeURIComponent` 进行 URL 编码！

**生成的 `encryptedText`**:
```
answer0=21~34+%E5%B2%81&answer1=%E4%BB%B7%E6%A0%BC%E5%AE%9E%E6%83%A0&...
```

### 后端实现（正确）

```javascript
function toQueryString(obj) {
  const part = [];
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object") {
      part.push(`${key}=${JSON.stringify(value)}`);
    } else {
      part.push(`${key}=${value}`);
    }
  }
  return part.join("&");
}
```

**特点**: **没有** URL 编码！

**生成的 `encryptedText`**:
```
answer0=21~34 岁&answer1=价格实惠&...
```

## 问题分析

### 签名验证流程

1. **前端**:
   ```javascript
   const encryptedText = toQueryString(params);  // 使用 URL 编码
   const signature = generateSign(encryptedText.substring(0, 255), signkey);
   ```

2. **后端**:
   ```javascript
   const receivedEncryptedText = request.body.encryptedText;  // 接收前端发送的
   const expectedSignature = generateSign(receivedEncryptedText, signkey);
   ```

3. **问题**:
   - 前端生成 `encryptedText` 时使用了 URL 编码
   - 后端生成 `encryptedText` 时没有 URL 编码
   - 即使前端发送的是截断后的 255 字符，但内容不一致
   - 导致签名不匹配

### 示例对比

**前端生成的 `encryptedText`（前 50 字符）**:
```
answer0=21~34+%E5%B2%81&answer1=%E4%BB%B7%E6%A0%BC%E5%AE%9E%E6%83%A0
```

**后端期望的 `encryptedText`（前 50 字符）**:
```
answer0=21~34 岁&answer1=价格实惠&answer2=坐堂医生&answer3
```

**结果**: 内容不一致 → 签名不匹配 → 验签失败！

## 解决方案

### 修改 `toQueryString` 函数

**文件**: `public/automation/js/automation/execution-logic.js`

**修改位置**: 第 233 行

**修改前**:
```javascript
"function toQueryString(obj){ const keys=Object.keys(obj).sort(); return keys.map(k=>encodeURIComponent(k)+'='+encodeURIComponent(obj[k])).join('&'); }",
```

**修改后**:
```javascript
"function toQueryString(obj){ const part=[]; for(const [key,value] of Object.entries(obj)){ if(typeof value==='object'){ part.push(key+'='+JSON.stringify(value)); }else{ part.push(key+'='+value); } } return part.join('&'); }",
```

### 关键变化

1. **移除 `encodeURIComponent`**: 不再对 key 和 value 进行 URL 编码
2. **保持与后端一致**: 使用与 `dcwj.js` 相同的实现
3. **处理对象类型**: 对象类型使用 `JSON.stringify`

## 为什么不需要 URL 编码？

### 1. `encryptedText` 只用于签名

`encryptedText` 不是通过 URL 传递的，而是作为 POST 请求的 body 参数：

```javascript
const ajaxData = {
  name: "任玄之",
  sex: "女",
  // ... 其他参数
  encryptedText: finalEncryptedText  // 作为 body 参数
};

$.ajax({
  url: "/api",
  type: "POST",
  data: ajaxData,  // 会被自动编码
  // ...
});
```

**jQuery 的 `$.ajax` 会自动对 body 参数进行 URL 编码！**

### 2. 签名验证不需要解码

后端接收到的 `encryptedText` 会被自动解码，然后直接用于签名验证：

```javascript
// 后端
const encryptedText = request.body.encryptedText;  // 已自动解码
const expectedSignature = generateSign(encryptedText, signkey);
```

### 3. 前后端必须一致

为了确保签名验证成功，前端和后端生成的 `encryptedText` 必须完全一致：

- ✅ 都不使用 URL 编码
- ✅ 都使用相同的参数顺序（字母排序）
- ✅ 都截取前 255 字符

## 验证方法

### 1. 检查生成的 `encryptedText`

在浏览器控制台中，检查生成的 `encryptedText`：

```javascript
// 应该看到中文字符，而不是 %E5%... 这样的编码
console.log(encryptedText);
// 输出: answer0=21~34 岁&answer1=价格实惠&...
```

### 2. 检查网络请求

在浏览器开发者工具的 Network 标签中，检查请求的 `encryptedText` 参数：

- **Form Data 视图**: 显示解码后的内容（中文）
- **View source 视图**: 显示 URL 编码后的内容（%E5%...）

**这是正常的！** 因为 jQuery 会自动编码。

### 3. 检查 API 响应

```javascript
📥 API响应: {code: 200, message: '操作成功', ...}  ✅
```

## 技术细节

### URL 编码的时机

1. **生成 `encryptedText` 时**: ❌ 不编码
2. **发送请求时**: ✅ jQuery 自动编码
3. **后端接收时**: ✅ 自动解码
4. **签名验证时**: ❌ 使用解码后的内容

### 为什么之前会使用 URL 编码？

可能是误解了 `encryptedText` 的用途，认为它需要通过 URL 传递，所以手动进行了 URL 编码。

但实际上：
- `encryptedText` 是作为 POST body 参数传递的
- jQuery 会自动处理编码和解码
- 我们只需要确保生成的内容与后端一致

## 相关文件

- `/Users/yao/Yao/excel-review-app/public/automation/js/automation/execution-logic.js` - 主要修复文件（第 233 行）
- `/Users/yao/Yao/excel-review-app/public/automation/js/automation/template-manager.js` - 已有正确实现（第 914 行）
- `/Users/yao/Yao/project/liuwei/html/zxyy2/zxyy.ltd/lgb/mobile/js/dcwj.js` - 参考实现（第 508 行）

## 总结

### 问题根源

- ❌ 前端使用了 URL 编码生成 `encryptedText`
- ✅ 后端没有使用 URL 编码生成 `encryptedText`
- ❌ 导致签名不匹配

### 解决方案

- ✅ 移除 `toQueryString` 中的 `encodeURIComponent`
- ✅ 与后端实现保持一致
- ✅ 让 jQuery 自动处理 URL 编码

### 关键理解

1. **`encryptedText` 只用于签名验证**，不用于参数传递
2. **生成时不编码**，发送时由 jQuery 自动编码
3. **前后端必须使用相同的生成逻辑**

---

**修复日期**: 2025-10-05  
**问题发现**: URL 编码导致 `encryptedText` 内容不一致  
**解决方案**: 移除手动 URL 编码，与后端实现保持一致
