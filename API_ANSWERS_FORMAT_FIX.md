# API 答案格式修复总结

## 问题描述

使用 API 模式执行自动补全时，后端返回 `系统异常！` 错误。

### 错误日志

```
📥 API响应: {errCode: '5000', errMsg: '系统异常！'}
❌ API创建失败: 祝凯 Error: API返回错误: 系统异常！
```

## 根本原因

通过对比**自动化脚本发送的请求**和**手动创建的成功请求**，发现以下关键差异：

### 1. `answers` 字段格式不同

**❌ 自动化脚本（失败）**:

```javascript
answers: '["肿瘤辅助治疗","未告知","手术治疗",...]'; // JSON 数组字符串
```

**✅ 手动请求（成功）**:

```javascript
answers: "肿瘤辅助治疗#未告知#手术治疗#..."; // 用 # 分隔的字符串
```

### 2. 缺少关键字段

手动请求包含但自动化脚本缺失的字段：

- `questions` - 问题列表（用 `#` 分隔）
- `options` - 选项列表（用 `#` 和 `;` 分隔）
- `types` - 问题类型（单选/多选，用 `#` 分隔）

### 3. `encryptedText` 格式不一致

**❌ 自动化脚本**:

```
encryptedText=answer0=...&answer1=...&answers=["...","..."]
```

**✅ 手动请求**:

```
encryptedText=answer0=...&answer1=...&answers=...#...#...
```

## 修复方案

### 修改文件

`/Users/yao/Yao/excel-review-app/public/automation/js/automation/execution-logic.js`

### 关键修改

#### 1. 从页面提取问卷结构

```javascript
// 从页面提取问卷结构（questions, options, types）
const questionsInput = contentWindow.document.querySelector(
  'input[name="questions"]'
);
const optionsInput = contentWindow.document.querySelector(
  'input[name="options"]'
);
const typesInput = contentWindow.document.querySelector('input[name="types"]');

const questionsValue = questionsInput ? questionsInput.value : "";
const optionsValue = optionsInput ? optionsInput.value : "";
const typesValue = typesInput ? typesInput.value : "";
```

#### 2. 将答案数组转换为 # 分隔的字符串

```javascript
// 将答案数组转换为 # 分隔的字符串（与手动请求格式一致）
const answersString = answersArray.filter((a) => a !== undefined).join("#");
```

#### 3. 更新 tempData 结构

```javascript
const tempData = {
  // 基本信息
  name: requestData.name,
  sex: requestData.sex,
  date: requestData.date,
  answers: answersString, // ✅ 使用 # 分隔的字符串，不是 JSON

  // 项目字段
  recId: "",
  nvcVal: "",
  latLng: "",
  projectId: config.projectId || "1756460958725101",
  corpId: config.corpId || "1749721838789101",
  projectTpl: config.projectTpl || "1756451075934101",
  sponsorProjectId: config.sponsorProjectId || "1756451241652103",
  isForward: 1,
  title: config.title || "致力庆西黄丸消费者问卷",
  way: "实名调查",
  startTime: requestData.date,
  memo:
    config.memo ||
    "为了充分了解客户对于西黄丸产品评价，为更好的做好临床药学服务，促进产品在临床的安全合理的使用，便于下一步市场策略的规划，特进行本次问卷调查。",
  dcdxName: config.dcdxName || "吴承",
  fieldName: "性别",
  fill: requestData.sex,
  channelAddress: "",

  // ✅ 添加问卷结构字段
  questions: questionsValue,
  options: optionsValue,
  types: typesValue,
};
```

#### 4. 更新 ajaxData 结构

```javascript
const ajaxData = {
  // 基本信息
  name: requestData.name,
  sex: requestData.sex,
  date: requestData.date,

  // ✅ 答案数据 - 使用 # 分隔的字符串格式
  answers: answersString,

  // 必要的项目字段
  recId: "",
  nvcVal: "",
  latLng: "",
  projectId: config.projectId || "1756460958725101",
  corpId: config.corpId || "1749721838789101",
  projectTpl: config.projectTpl || "1756451075934101",
  sponsorProjectId: config.sponsorProjectId || "1756451241652103",
  isForward: 1,
  title: config.title || "致力庆西黄丸消费者问卷",
  way: "实名调查",
  startTime: requestData.date,
  memo:
    config.memo ||
    "为了充分了解客户对于西黄丸产品评价，为更好的做好临床药学服务，促进产品在临床的安全合理的使用，便于下一步市场策略的规划，特进行本次问卷调查。",
  dcdxName: config.dcdxName || "吴承",
  fieldName: "性别",
  fill: requestData.sex,
  channelAddress: "",

  // ✅ 添加问卷结构字段
  questions: questionsValue,
  options: optionsValue,
  types: typesValue,

  // encryptedText用于签名验证
  encryptedText: finalEncryptedText,
};
```

## 对比示例

### 修复前（失败）

```javascript
{
    name: '祝凯',
    sex: '女',
    date: '2025-09-11',
    answers: '["肿瘤辅助治疗","未告知","手术治疗",...]',  // ❌ JSON 格式
    // ❌ 缺少 questions, options, types
    ...
}
```

### 修复后（成功）

```javascript
{
    name: '祝凯',
    sex: '女',
    date: '2025-09-11',
    answers: '肿瘤辅助治疗#未告知#手术治疗#...',  // ✅ # 分隔
    questions: '您使用西黄丸的主要目的是？#医生 / 药师是否告知您西黄丸含麝香，孕妇禁用？#...',  // ✅ 新增
    options: '肿瘤辅助治疗;甲状腺 / 乳腺结节消结散结;...#明确提醒过;提到过但未强调;未告知#...',  // ✅ 新增
    types: '单选项#单选项#多选项#...',  // ✅ 新增
    ...
}
```

## 影响范围

### 修改的文件

1. `/Users/yao/Yao/excel-review-app/public/automation/js/automation/execution-logic.js`
2. `/Users/yao/Yao/excel-review-app/html/js/automation/execution-logic.js`（同步）

### 影响的功能

- ✅ API 模式 - 单日期自动创建
- ✅ API 模式 - 全日期自动创建
- ✅ 验证遗漏功能（使用 API 模式创建）

### 不影响的功能

- DOM 模式（不使用 API 请求）

## 测试建议

1. **测试 API 模式创建**

   - 使用 API 模式执行单日期创建
   - 检查请求数据格式是否正确
   - 验证后端是否返回成功

2. **测试验证遗漏功能**

   - 执行数据验证
   - 使用"补充遗漏"功能
   - 确认缺失数据能够成功创建

3. **检查日志输出**
   ```javascript
   console.log("📤 发送请求数据:", ajaxData);
   // 应该看到：
   // answers: "肿瘤辅助治疗#未告知#手术治疗#..."
   // questions: "您使用西黄丸的主要目的是？#..."
   // options: "肿瘤辅助治疗;甲状腺 / 乳腺结节消结散结;...#..."
   // types: "单选项#单选项#多选项#..."
   ```

## 技术要点

### 为什么要用 # 分隔？

后端期望的数据格式是：

- `answers`: 答案用 `#` 分隔（例如：`答案1#答案2#答案3`）
- `questions`: 问题用 `#` 分隔
- `options`: 选项组用 `#` 分隔，每组内的选项用 `;` 分隔
- `types`: 类型用 `#` 分隔

这种格式与后端的解析逻辑一致，使用 JSON 数组会导致解析失败。

### 为什么需要 questions, options, types？

这些字段用于后端：

1. 验证答案的完整性
2. 重建问卷结构
3. 生成 `encryptedText` 用于签名验证

缺少这些字段会导致后端无法正确处理请求。

### 关于 encryptedText

`encryptedText` 是用于签名验证的字符串，包含所有请求参数的 URL 编码形式。修复后，`encryptedText` 中的 `answers` 字段也会是 `#` 分隔的格式，与实际请求数据保持一致。

## 相关文档

- [API 参数验证异常修复总结](./html/API参数验证异常修复总结.md)
- [API 签名机制说明](./html/API签名机制说明.md)
- [问卷内容同步功能](./QUESTIONNAIRE_CONTENT_SYNC.md)

## 修复日期

2025-10-05
