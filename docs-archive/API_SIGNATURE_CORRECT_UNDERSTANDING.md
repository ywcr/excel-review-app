# API 签名机制的正确理解

## 问题回顾

经过多次测试和对比，我们发现了 API 签名机制的真正工作原理。

## ❌ 错误理解 #1

**认为**: `encryptedText` 有两个用途

- 签名验证：使用前 255 字符
- 参数传递：使用完整内容

**实际**: 这是错误的！后端**不会**从 `encryptedText` 中解析参数！

## ❌ 错误理解 #2

**认为**:

- 前端：用前 255 字符签名，发送完整 `encryptedText`
- 后端：用前 255 字符验签，从完整 `encryptedText` 解析参数

**实际**: 后端**只用于验签**，不用于解析参数！

## ✅ 正确理解

### `encryptedText` 的唯一用途

**`encryptedText` 只用于签名验证，不用于参数传递！**

### 前端逻辑

```javascript
// 1. 构建签名参数对象
const paramsForSign = {
  name: "任玄之",
  sex: "女",
  date: "2025-09-06",
  answers: "answer1#answer2#...",
  answer0: "answer1",
  answer1: "answer2",
  // ... 其他参数
  corpId: "1749721838789101",
  projectId: "1756460958725101",
  // ...
};

// 2. 格式化参数（按字母排序）
const formattedData = formatParams(paramsForSign);
// 结果：answer0, answer1, ..., answer9, answers, channelAddress, corpId, date, ...

// 3. 生成查询字符串
const encryptedText = toQueryString(formattedData);
// 结果：answer0=xxx&answer1=xxx&...&answers=xxx&channelAddress=&corpId=xxx&...

// 4. 截取前 255 字符
const finalEncryptedText = encryptedText.substring(0, 255);

// 5. 生成签名
const signature = generateSign(finalEncryptedText, signkey);

// 6. 发送请求
const requestData = {
  name: "任玄之",
  sex: "女",
  date: "2025-09-06",
  answers: "answer1#answer2#...",
  answer0: "answer1",
  answer1: "answer2",
  // ... 所有参数都在 body 中
  encryptedText: finalEncryptedText, // ⚠️ 发送截断后的
};

fetch("/api", {
  headers: {
    sign: signature,
    signkey: signkey,
  },
  body: new URLSearchParams(requestData),
});
```

### 后端逻辑

```javascript
// 1. 接收请求
const receivedEncryptedText = request.body.encryptedText; // 255 字符
const receivedSignature = request.headers.sign;
const signkey = request.headers.signkey;

// 2. 验证签名
const expectedSignature = generateSign(receivedEncryptedText, signkey);
if (receivedSignature !== expectedSignature) {
  return { code: 5000, message: "安全校验失败-验签失败" };
}

// 3. 从 body 中获取业务参数（不是从 encryptedText！）
const name = request.body.name;
const sex = request.body.sex;
const date = request.body.date;
const answers = request.body.answers;
// ...

// 4. 处理业务逻辑
// ...
```

## 关键点

### 1. `encryptedText` 只用于验签

- ✅ 前端：生成 `encryptedText`，截取 255 字符，签名，发送截断后的
- ✅ 后端：接收 `encryptedText`（255 字符），验签
- ❌ 后端：**不从** `encryptedText` 中解析参数

### 2. 业务参数从 `body` 中获取

- 所有业务参数（`name`, `sex`, `date`, `answers`, `answer0-9`, `corpId`, `projectId` 等）都在请求 `body` 中
- 后端直接从 `request.body` 中读取这些参数
- **不需要**从 `encryptedText` 中解析

### 3. 255 字符限制的影响

由于 `formatParams` 按字母排序，`answer0-9` 会排在最前面：

**短答案（成功）：**

```
answer0=35~59&answer1=服务周到&...&answer9=价格&answers=...&channelAddress=&corpId=xxx&date=xxx&...
                                                     ↑ 255 字符截断在这里
```

- ✅ 前 255 字符包含了部分关键参数（`channelAddress`, `corpId`, `date`）
- ✅ 但这些参数**不影响验签**，因为前后端都用相同的截断逻辑

**长答案（之前失败）：**

```
answer0=甲状腺 / 乳腺结节消结散结&answer1=明确提醒过&...&answer9=价格偏高&answers=...&channelAddress=&corpId=xxx&...
                                                                    ↑ 255 字符截断在这里
```

- ❌ 前 255 字符只包含答案，不包含 `channelAddress`, `corpId` 等
- ✅ 但这**不影响验签**，因为前后端都用相同的截断逻辑
- ✅ 业务参数从 `body` 中获取，不受影响

## 为什么之前会失败？

### 第一次失败（验签失败）

```javascript
// 前端
const signature = generateSign(encryptedText.substring(0, 255), signkey);
ajaxData.encryptedText = encryptedText; // 发送完整的 580 字符

// 后端
const receivedEncryptedText = request.body.encryptedText; // 580 字符
const expectedSignature = generateSign(
  receivedEncryptedText.substring(0, 255),
  signkey
);
// 验签失败！因为前端签名时用的 255 字符 ≠ 后端验签时截取的 255 字符
```

**问题**: 前端发送完整的 `encryptedText`，但签名时用的是截断后的。

### 第二次失败（系统异常）

即使验签成功，也可能因为其他原因（如参数格式错误）导致"系统异常"。

### 正确做法

```javascript
// 前端
const finalEncryptedText = encryptedText.substring(0, 255);
const signature = generateSign(finalEncryptedText, signkey);
ajaxData.encryptedText = finalEncryptedText; // 发送截断后的 255 字符

// 后端
const receivedEncryptedText = request.body.encryptedText; // 255 字符
const expectedSignature = generateSign(receivedEncryptedText, signkey);
// 验签成功！因为前后端用的是相同的 255 字符
```

## 总结

### `encryptedText` 的作用

- ✅ **唯一用途**: 签名验证
- ❌ **不用于**: 参数传递

### 正确的实现

1. **生成 `encryptedText`**: 包含所有签名参数，按字母排序
2. **截取 255 字符**: 前端和后端都使用相同的截断逻辑
3. **生成签名**: 使用截断后的 `encryptedText`
4. **发送请求**:
   - `body`: 包含所有业务参数
   - `body.encryptedText`: 截断后的 255 字符
   - `headers.sign`: 签名
   - `headers.signkey`: 密钥
5. **后端验签**: 使用接收到的 `encryptedText`（255 字符）验签
6. **后端处理**: 从 `body` 中读取业务参数

### 为什么需要 255 字符限制？

- **历史原因**: 可能是数据库字段长度限制
- **安全考虑**: 限制签名字符串长度
- **性能优化**: 减少签名计算的数据量

### 255 字符限制的影响

- ✅ **对验签**: 无影响，前后端都用相同的截断逻辑
- ✅ **对业务**: 无影响，业务参数从 `body` 中获取
- ⚠️ **对调试**: 可能导致混淆，因为 `encryptedText` 被截断

## 修复内容

### 文件：`public/automation/js/automation/execution-logic.js`

**修改位置：** 第 513 行

**修改前：**

```javascript
encryptedText: encryptedText; // ❌ 错误：发送完整的
```

**修改后：**

```javascript
encryptedText: finalEncryptedText; // ✅ 正确：发送截断后的
```

## 验证方法

### 1. 检查日志

```
📝 完整 encryptedText 长度: 580
📝 截取后 encryptedText 长度: 255
⚠️ encryptedText 超过255字符，已截取前255字符用于签名
🔐 签名参数: {dataLength: 255, ...}
📤 发送请求数据: {...}
📥 API响应: {code: 200, message: '操作成功', ...}  ✅
```

### 2. 检查网络请求

在浏览器开发者工具中，检查 `encryptedText` 的长度应该是 255 字符（或更少）。

### 3. 对比手动创建

手动创建的请求也是发送截断后的 `encryptedText`（255 字符）。

## 相关文件

- `/Users/yao/Yao/excel-review-app/public/automation/js/automation/execution-logic.js` - 主要修复文件
- `/Users/yao/Yao/project/liuwei/html/zxyy2/zxyy.ltd/lgb/mobile/js/dcwj.js` - 参考实现
- `API_SIGNATURE_FINAL_FIX.md` - 之前的错误理解
- `WHY_MANUAL_WORKS_BUT_AUTO_FAILS.md` - 手动创建成功的原因分析

---

**修复日期**: 2025-10-05  
**最终理解**: `encryptedText` 只用于签名验证，不用于参数传递。前端和后端都使用截断后的 255 字符。
