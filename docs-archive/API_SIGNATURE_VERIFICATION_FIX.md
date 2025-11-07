# API 模式验签失败修复

## 问题描述

用户在使用 API 模式执行自动补全时，遇到验签失败的错误：

```json
{
  "code": 5000,
  "message": "安全校验失败-验签失败",
  "data": null,
  "count": null
}
```

## 问题原因

通过对比正确的实现（`zxyy2/zxyy.ltd/lgb/mobile/js/dcwj.js`）和我们的实现，发现了以下问题：

### 1. 签名参数包含了不应该参与签名的字段

**错误的实现：**

```javascript
const tempData = {
  name: requestData.name,
  sex: requestData.sex,
  date: requestData.date,
  answers: answersString,
  recId: "",
  nvcVal: "", // ❌ 不应该参与签名
  latLng: "",
  projectId: config.projectId,
  // ... 其他字段
  fieldName: "性别", // ❌ 不应该参与签名
  fill: requestData.sex, // ❌ 不应该参与签名
  channelAddress: "",
  questions: questionsValue, // ❌ 不应该参与签名
  options: optionsValue, // ❌ 不应该参与签名
  types: typesValue, // ❌ 不应该参与签名
};
```

**正确的实现（参考 dcwj.js 第 414-434 行）：**

```javascript
var formData = $("[lay-filter=formFilter]").serializeArray();
var params = {};
var exclutionParamsArr = [];
$(formData).each(function (i, v) {
  if (
    v.name === "fieldName" || // 排除
    v.name === "fill" || // 排除
    v.name === "nvcVal" // 排除
  ) {
    return true;
  }
  if (v.value && v.value !== "") {
    if (params[v.name]) {
      exclutionParamsArr.push(v.name);
    }
    params[v.name] = v.value;
  }
});
```

### 2. 正确的验签流程

根据 `dcwj.js` 的实现，正确的验签流程是：

1. **构建参数对象**：排除 `fieldName`, `fill`, `nvcVal`
2. **格式化参数**：使用 `formatParams()` 对参数键进行排序
3. **生成查询字符串**：使用 `toQueryString()` 将参数转换为字符串
4. **截取前 255 字符**：作为 `encryptedText`
5. **生成签名**：使用 `hex(sign(key, value))` 生成签名
6. **发送请求**：
   - 请求体包含所有字段（包括 `fieldName`, `fill`, `nvcVal`, `questions`, `options`, `types`, `encryptedText`）
   - 请求头包含 `sign` 和 `signKey`

## 修复方案

### 1. 分离签名数据和请求数据

创建两个数据对象：

- `paramsForSign`：仅用于生成签名，排除不参与签名的字段
- `ajaxData`：完整的请求数据，包含所有字段

```javascript
// 用于签名的数据（排除 fieldName, fill, nvcVal, questions, options, types）
const paramsForSign = {
  name: requestData.name,
  sex: requestData.sex,
  date: requestData.date,
  answers: answersString,
  recId: "",
  // nvcVal: "",  // 排除：不参与签名
  latLng: "",
  projectId: config.projectId,
  corpId: config.corpId,
  projectTpl: config.projectTpl,
  sponsorProjectId: config.sponsorProjectId,
  isForward: 1,
  title: config.title,
  way: "实名调查",
  startTime: requestData.date,
  memo: config.memo,
  dcdxName: config.dcdxName,
  // fieldName: "性别",  // 排除：不参与签名
  // fill: requestData.sex,  // 排除：不参与签名
  channelAddress: "",
  // questions, options, types 也不参与签名
};

// 添加 answer0, answer1, ... 到签名数据
requestData.answers.forEach((answer, index) => {
  if (answer !== undefined) {
    paramsForSign[`answer${index}`] = answer;
  }
});

// 生成 encryptedText
const formattedData = formatParams(paramsForSign);
const encryptedText = toQueryString(formattedData);
const finalEncryptedText =
  encryptedText.length > 255 ? encryptedText.substring(0, 255) : encryptedText;

// 生成签名
const signature = generateSign(finalEncryptedText, saltData.signkey);
```

### 2. 完整的请求数据

```javascript
// 完整的请求数据（包含所有字段）
const ajaxData = {
  name: requestData.name,
  sex: requestData.sex,
  date: requestData.date,
  answers: answersString,
  recId: "",
  nvcVal: "", // 包含在请求中，但不参与签名
  latLng: "",
  projectId: config.projectId,
  corpId: config.corpId,
  projectTpl: config.projectTpl,
  sponsorProjectId: config.sponsorProjectId,
  isForward: 1,
  title: config.title,
  way: "实名调查",
  startTime: requestData.date,
  memo: config.memo,
  dcdxName: config.dcdxName,
  fieldName: "性别", // 包含在请求中，但不参与签名
  fill: requestData.sex, // 包含在请求中，但不参与签名
  channelAddress: "",
  questions: questionsValue, // 包含在请求中，但不参与签名
  options: optionsValue, // 包含在请求中，但不参与签名
  types: typesValue, // 包含在请求中，但不参与签名
  encryptedText: finalEncryptedText, // 用于后端验证
};

// 添加 answer0, answer1, ... 到请求数据
requestData.answers.forEach((answer, index) => {
  if (answer !== undefined) {
    ajaxData[`answer${index}`] = answer;
  }
});
```

### 3. 发送请求

```javascript
$.ajax({
  url: config.apiEndpoint,
  type: "POST",
  data: ajaxData,
  headers: {
    sign: signature,
    signKey: saltData.signkey,
  },
  traditional: true,
  success: function (res) {
    console.log("📥 API响应:", res);
    resolve(res);
  },
  error: function (xhr, status, error) {
    console.error("❌ Ajax请求失败:", { status, error });
    reject(new Error(`请求失败: ${status} - ${error}`));
  },
});
```

## 关键点总结

### 不参与签名的字段（排除）

1. `fieldName` - 字段名称
2. `fill` - 字段值
3. `nvcVal` - 滑动验证值
4. `questions` - 问题列表
5. `options` - 选项列表
6. `types` - 问题类型列表

### 参与签名的字段（包含）

1. 基本信息：`name`, `sex`, `date`
2. 答案数据：`answers` (# 分隔的字符串), `answer0`, `answer1`, ...
3. 项目信息：`projectId`, `corpId`, `projectTpl`, `sponsorProjectId`, `isForward`
4. 问卷信息：`title`, `way`, `startTime`, `memo`, `dcdxName`
5. 其他字段：`recId`, `latLng`, `channelAddress`

### 验签流程

```
参数对象（排除特定字段）
    ↓
formatParams（键排序）
    ↓
toQueryString（转换为字符串）
    ↓
截取前255字符（encryptedText）
    ↓
sign(key, encryptedText)（HMAC-SHA256）
    ↓
hex（转换为十六进制字符串）
    ↓
signature（最终签名）
```

## 调试日志

修复后，代码会输出详细的调试日志：

```javascript
console.log("🔐 签名参数:", {
  dataLength: finalEncryptedText.length,
  keyLength: saltData.signkey.length,
  key: saltData.signkey.substring(0, 5) + "...",
});
console.log(
  "📝 encryptedText (前100字符):",
  finalEncryptedText.substring(0, 100)
);
console.log("🔑 签名生成成功:", signature.substring(0, 16) + "...");
console.log("📤 发送请求数据:", ajaxData);
console.log("🔐 签名信息:", {
  signature: signature.substring(0, 16) + "...",
  signKey: saltData.signkey,
});
```

## 参考文件

- **正确实现**：`/Users/yao/Yao/project/liuwei/html/zxyy2/zxyy.ltd/lgb/mobile/js/dcwj.js` (第 414-474 行)
- **加密库**：`/Users/yao/Yao/project/liuwei/html/zxyy2/zxyy.ltd/lgb/pay/crypto.js`
- **问卷页面**：`/Users/yao/Yao/project/liuwei/html/zxyy2/zxyy.ltd/lgb/mobile/xfzwj.jsp`

## 修改的文件

- `/Users/yao/Yao/excel-review-app/public/automation/js/automation/execution-logic.js`
  - 修改 `createTaskApi` 函数
  - 分离签名数据和请求数据
  - 添加详细的调试日志

## 测试方法

1. 刷新页面并重新生成自动化代码
2. 执行 API 模式的自动补全：`updateWithMissing()`
3. 查看控制台日志，确认：
   - `encryptedText` 不包含 `fieldName`, `fill`, `nvcVal`, `questions`, `options`, `types`
   - 签名生成成功
   - API 响应成功（`code: 1` 或 `code: 200`）

## 预期结果

修复后，API 模式应该能够成功创建问卷，不再出现"安全校验失败-验签失败"的错误。

## 修复日期

2025-10-05
