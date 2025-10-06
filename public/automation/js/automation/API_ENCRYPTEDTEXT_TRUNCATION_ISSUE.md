# API encryptedText 截断导致验签失败问题

## 问题现象

用户报告了一个反直觉的现象：

- **第一个请求（问卷创建页）**：返回"安全校验失败-验签失败" ❌
- **第二个请求（任务列表页）**：返回"重复提交" ✅（说明验签成功）

## 详细分析

### 第一个请求（验签失败）

**环境**：在问卷创建页执行

**参数状态**：

- ✅ `corpId=1733101264425101`（正确）
- ✅ `projectTpl=1757054166586103`（正确）
- ✅ `sponsorProjectId=1757066425772107`（正确）
- ✅ `title=西黄丸消费者问卷25.9.5（平晓）`（正确）
- ✅ `questions/options/types` 都有值（完整的问卷结构）
- ✅ `nvcVal` 有值（很长的 JSON）
- ✅ `encryptedText` 正确排除了多选题的 `answer2`

**问题**：

```
encryptedText=answer0=淋巴结肿大 / 炎症肿痛缓解&answer1=未告知&answer3=体力 / 食欲改善&answer4=详细说明&answer5=未留意过储存相关说明&answer6=药师主动告知过注意事项&answer8=对比后性价比更高&answer9=其他&answers=淋巴结肿大 / 炎症肿痛缓解#未告知#靶向治疗 / 免疫治疗#体力 / 食欲改善#详细说明#未留意过储存相关说明#药师主动告知过注意事项#不清楚疗程时长#对比后性价比更高#其他&corpId=1733101264425101&d
```

注意：`encryptedText` 在 `corpId` 后面就截断了（`&d`），说明被截断到 255 字符。

### 第二个请求（重复提交）

**环境**：在任务列表页执行

**参数状态**：

- ❌ `corpId=1749721838789101`（错误的默认值）
- ❌ `projectTpl=1756451075934101`（错误的默认值）
- ❌ `sponsorProjectId=1756451241652103`（错误的默认值）
- ❌ `title=致力庆西黄丸消费者问卷`（错误的默认值）
- ❌ `questions/options/types` **都为空**
- ❌ `nvcVal` 为空
- ❌ `encryptedText` 包含了所有 `answer0-9`（包括多选题的 `answer2`）

**但是**：因为 `questions/options/types` 为空，它们被 `cleanedParamsForSign` 的逻辑排除了（空值不参与签名），所以 `encryptedText` 更短，前 255 字符包含了所有关键参数。

虽然使用了错误的 `corpId` 等参数，但因为数据已经存在（之前手动创建过），所以返回"重复提交"而不是"验签失败"。

## 根本原因

### 问题链条

1. **在问卷创建页执行时**：

   - 正确读取到 `questions/options/types`（值很长，总长度可能超过 1000 字符）
   - 这些字段参与签名（根据 `dcwj.js` 的逻辑）

2. **生成 `encryptedText`**：

   - 所有参数排序后拼接：`answer0=...&answer1=...&answers=...&channelAddress=&corpId=...&date=...&dcdxName=...&isForward=1&latLng=&memo=...&name=...&options=...&projectId=...&projectTpl=...&questions=...&recId=&sex=...&sponsorProjectId=...&startTime=...&title=...&types=...&way=...`
   - 按字母排序后，`options`, `questions`, `types` 在中间位置
   - 这些字段的值很长，占用了大量空间

3. **截断到 255 字符**：

   - 根据 `dcwj.js` 的逻辑，`encryptedText` 必须截断到 255 字符
   - 截断后可能只包含：`answer0=...&answer1=...&answers=...&channelAddress=&corpId=...&d`
   - **关键问题**：后面的 `options`, `questions`, `types` 被截断了

4. **后端验签**：

   - 后端使用相同的逻辑生成 `encryptedText`
   - 后端也会截断到 255 字符
   - 但因为参数顺序和内容完全一致，理论上签名应该匹配

5. **为什么还是验签失败？**
   - 可能原因 1：前端和后端的参数排序逻辑不完全一致
   - 可能原因 2：某些参数的值在前端和后端不一致（如 URL 编码）
   - 可能原因 3：`questions/options/types` 的值在前端和后端不一致

### 第二个请求为什么成功？

1. **`questions/options/types` 为空**：

   - 这些字段不参与签名（被 `cleanedParamsForSign` 排除）
   - `encryptedText` 更短，前 255 字符包含了所有关键参数

2. **虽然使用了错误的参数**：
   - 但数据已经存在（之前手动创建过）
   - 返回"重复提交"而不是"验签失败"

## 解决方案

### 方案 1：调试日志增强（已实现）

添加详细的日志，帮助诊断问题：

```javascript
// 检查 questions/options/types 的长度
const qotLength =
  questionsValue.length + optionsValue.length + typesValue.length;
console.log("📊 questions/options/types 总长度:", qotLength);
if (qotLength > 500) {
  console.warn("⚠️ questions/options/types 字段过长，可能导致关键参数被截断");
}

// 检查截断后是否包含关键的 answerN 参数
const hasAnswers = /answer\d+=/.test(finalEncryptedText);
if (!hasAnswers) {
  console.error("❌ 截断后的 encryptedText 不包含任何 answerN 参数！");
  console.error("💡 这会导致验签失败，因为后端期望签名中包含答案");
  console.error(
    "💡 可能原因：questions/options/types 字段过长，占用了大部分空间"
  );
}
```

### 方案 2：对比手动请求（推荐）

用户应该：

1. 在问卷创建页手动创建一个任务
2. 在浏览器开发者工具中复制 `fetch` 请求
3. 对比自动化脚本生成的请求和手动请求的差异
4. 特别关注：
   - `encryptedText` 的内容和长度
   - 截断后包含哪些参数
   - `questions/options/types` 的值是否一致

### 方案 3：排除 questions/options/types（需验证）

**⚠️ 警告**：这个方案需要先确认后端是否真的需要这些字段参与签名。

如果后端实际上**不需要** `questions/options/types` 参与签名，我们可以排除它们：

```javascript
const paramsForSign = {
  // 基本信息
  name: requestData.name,
  sex: requestData.sex,
  date: requestData.date,
  answers: answersString,
  // ... 其他字段
  // 排除 questions/options/types（如果后端不需要）
  // questions: questionsValue,
  // options: optionsValue,
  // types: typesValue
};
```

**但是**：根据 `dcwj.js` 的代码，`$.serialize()` 会包含所有表单字段（包括隐藏字段），所以理论上 `questions/options/types` 应该参与签名。

### 方案 4：确认后端行为（最可靠）

最可靠的方法是：

1. 查看后端代码，确认签名验证的逻辑
2. 确认哪些字段参与签名
3. 确认是否有特殊的排除规则

## 临时解决方案

在确认根本原因之前，用户可以：

1. **在任务列表页执行**（虽然使用了错误的参数，但因为 `questions/options/types` 为空，签名更可能成功）
2. **手动修改问卷结构**（减少 `questions/options/types` 的长度）
3. **使用 DOM 模式**（不依赖签名验证）

## 预期日志输出

### 如果 questions/options/types 过长

```
📊 questions/options/types 总长度: 1523
⚠️ questions/options/types 字段过长，可能导致关键参数被截断
📝 完整 encryptedText 长度: 2145
⚠️ encryptedText 超过255字符，已截取前255字符用于签名
📝 截取后 encryptedText: answer0=淋巴结肿大 / 炎症肿痛缓解&answer1=未告知&answer3=体力 / 食欲改善&answer4=详细说明&answer5=未留意过储存相关说明&answer6=药师主动告知过注意事项&answer8=对比后性价比更高&answer9=其他&answers=淋巴结肿大 / 炎症肿痛缓解#未告知#靶向治疗 / 免疫治疗#体力 / 食欲改善#详细说明#未留意过储存相关说明#药师主动告知过注意事项#不清楚疗程时长#对比后性价比更高#其他&corpId=1733101264425101&d
```

### 如果截断后不包含 answerN

```
❌ 截断后的 encryptedText 不包含任何 answerN 参数！
💡 这会导致验签失败，因为后端期望签名中包含答案
💡 可能原因：questions/options/types 字段过长，占用了大部分空间
```

## 修改文件

- `public/automation/js/automation/execution-logic.js`

## 关键改动

1. 添加 `questions/options/types` 长度检查
2. 添加截断后 `encryptedText` 的 `answerN` 存在性检查
3. 增强日志输出，帮助诊断问题

## 修复日期

2025-10-05

## 相关问题

- API_CONTEXT_VALIDATION_FIX.md - 上下文验证修复
- API_IFRAME_CONTEXT_FIX.md - iframe 上下文查找修复
- API_SIGNATURE_FINAL_FIX.md - 签名验证修复

## 下一步行动

1. **用户提供手动创建的 fetch 请求**（成功的）
2. **对比自动化脚本生成的请求**（失败的）
3. **确认 `encryptedText` 的差异**
4. **确认后端签名验证逻辑**
