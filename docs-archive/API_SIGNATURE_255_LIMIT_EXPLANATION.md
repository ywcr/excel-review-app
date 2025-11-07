# API 签名 255 字符限制说明

## 问题回顾

之前我尝试移除 255 字符限制，但这导致了新的错误：

```json
{
  "code": 5000,
  "message": "安全校验失败-验签失败"
}
```

## 根本原因

通过仔细分析 dcwj.js 的实现（第 443-452 行），我发现：

```javascript
let value = toQueryString(fData);
if (value && value.length > 255) {
  value = value.substring(0, 255); // 截取前255字符
}
// ...
let signRes = hex(sign(key, value)); // 使用截断后的value签名
```

**关键点：**

1. 前端截取前 255 字符作为 `encryptedText`
2. 使用截断后的 `encryptedText` 生成签名
3. 将截断后的 `encryptedText` 放入请求体
4. **后端也会使用相同的逻辑重新生成 `encryptedText` 并验签**

## 为什么必须保持 255 字符限制？

后端验签流程：

1. 接收请求数据
2. 提取所有参数（排除 `fieldName`, `fill`, `nvcVal`）
3. 使用 `formatParams` 排序
4. 使用 `toQueryString` 生成字符串
5. **截取前 255 字符**
6. 使用这个截断后的字符串和 `signKey` 重新计算签名
7. 对比前端发送的签名

**如果前端不截取，后端截取，签名就会不匹配！**

## 为什么之前成功的请求能工作？

之前成功的请求（例如你提供的手动创建请求）：

- 答案内容较短：`35~59`, `服务周到`, `提供更完善的药学服务` 等
- 截取前 255 字符后，仍然包含了关键参数：
  ```
  answer0=35~59&...&answer9=价格&answers=...#价格#channelAddress=&corpId=1749721838789101&date=2025-09-06&dcdxName=吴承&fieldName
  ```

## 现在失败的请求为什么失败？

现在的请求：

- 答案内容较长：`中医辨证热毒壅结证`, `提到过但未强调`, `放疗 / 化疗` 等
- 截取前 255 字符后，**只包含答案部分**：
  ```
  answer0=中医辨证热毒壅结证&...&answers=中医辨证热毒壅结证#提到过但未强调#放疗 / 化疗#
  ```
- **所有关键参数（corpId, date, projectId 等）都在第 255 个字符之后，被截断了！**

## 真正的问题

**问题不是 255 字符限制本身，而是参数排序导致答案字段排在最前面！**

由于 `formatParams` 按字母排序：

- `answer*` (字母 'a' 开头) → 排在最前面
- `channelAddress`, `corpId`, `date` 等 → 排在后面

当答案内容过长时，前 255 字符只包含答案，关键参数全部被截断。

## 解决方案

### 方案 1：调整参数命名（不可行）

将 `answer*` 改为 `zanswer*`，让它们排到最后。

**问题：** 需要修改后端代码，不现实。

### 方案 2：缩短答案内容（不可行）

让用户选择更短的答案。

**问题：** 答案内容由问卷设计决定，无法控制。

### 方案 3：接受现实（当前方案）

**保持 255 字符限制，但接受某些长答案的问卷可能无法通过 API 模式创建。**

对于这些情况，用户需要：

1. 使用 DOM 模式（直接操作页面，不受签名限制）
2. 或者手动创建

## 技术说明

### 为什么后端要有 255 字符限制？

可能的原因：

1. **数据库字段限制**：`encryptedText` 字段可能是 `VARCHAR(255)`
2. **URL 长度限制**：某些浏览器/服务器对 URL 长度有限制
3. **性能考虑**：限制签名数据的长度，提高验签速度

### 为什么不能只对关键参数签名？

如果只对关键参数签名，恶意用户可以：

1. 复制一个有效的签名
2. 修改答案内容
3. 提交篡改后的数据

所以必须对所有参数（包括答案）进行签名。

## 当前实现

```javascript
// 必须截取前255字符（与后端dcwj.js保持一致）
const finalEncryptedText =
  encryptedText.length > 255 ? encryptedText.substring(0, 255) : encryptedText;

console.log("📝 截取后 encryptedText 长度:", finalEncryptedText.length);
if (encryptedText.length > 255) {
  console.warn("⚠️ encryptedText 超过255字符，已截取前255字符用于签名");
  console.log("📝 截取后 encryptedText:", finalEncryptedText);
}

// 使用截断后的 encryptedText 生成签名
const signature = generateSign(finalEncryptedText, saltData.signkey);
```

## 用户建议

对于包含长答案的问卷：

1. **优先使用 DOM 模式**：不受签名限制，更稳定
2. **API 模式仅适用于短答案问卷**：例如年龄、性别、简单选择题等
3. **如果必须使用 API 模式**：考虑简化问卷选项文字

## 修复日期

2025-10-05

## 相关文档

- [API 签名验证修复](./API_SIGNATURE_VERIFICATION_FIX.md)
- [API 签名最终修复](./API_SIGNATURE_FIX_FINAL.md)
- [API 签名调查](./API_SIGNATURE_INVESTIGATION.md)
