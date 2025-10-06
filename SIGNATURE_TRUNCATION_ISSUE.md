# 签名截断问题分析与解决方案

## 发现日期

2025-10-05

## 问题分析

### 验签失败的真正原因

经过仔细分析用户日志，发现真正的问题：

**截断的 encryptedText 不包含关键参数**！

### 日志证据

```
📝 截取后 encryptedText: answer0=中医辨证热毒壅结证&answer1=明确提醒过&...&answers=...#服药后
                                                                                                    ↑
                                                                                            255字符截断点
```

关键发现：

1. `answers` 字段在中间被截断
2. 后面的 `corpId`, `date`, `projectId` 等**完全没有被包含在签名中**
3. 但后端会包含这些参数来生成签名
4. 导致前后端签名不匹配 → 验签失败

### 参数排序顺序

按字母排序后的顺序：

```
answer0, answer1, answer2, ..., answer9,
answers,
channelAddress,
corpId,          ← 关键参数
date,            ← 关键参数
dcdxName,
fieldName,
fill,
isForward,
latLng,
memo,
name,
nvcVal,
options,         ← 619字符的一部分
projectId,       ← 关键参数
projectTpl,      ← 关键参数
questions,       ← 619字符的一部分
recId,
sex,
sponsorProjectId, ← 关键参数
startTime,
title,
types,           ← 619字符的一部分
way
```

### 字符统计

从日志看：

- `questions/options/types` 总长度：619 字符
- `answer0-9` 每个约 50 字符 × 10 = 500 字符
- `answers` 字段（答案用#分隔）：约 200 字符
- **总计已超过 1300 字符**

截取前 255 字符时：

- ✅ 包含：`answer0-9`, 部分`answers`
- ❌ **不包含**：`corpId`, `date`, `projectId`, `sponsorProjectId`（所有关键项目参数）

## 根本原因

**`questions`, `options`, `types` 字段不应该参与签名！**

### 证据

1. 手动创建请求时，这些字段可能不参与签名（需要验证）
2. 这三个字段内容太长，导致截断时关键参数被排除
3. 从 `dcwj.js` 的逻辑看，可能只有特定字段参与签名

## 解决方案

### 方案 1：从签名中排除 questions/options/types（推荐）

```javascript
// 构建用于签名的参数（排除 questions, options, types）
const paramsForSign = {
    answer0: ...,
    answer1: ...,
    // ... 其他 answerN
    answers: answersString,
    corpId: corpId,
    date: requestData.date,
    dcdxName: dcdxName,
    isForward: 1,
    latLng: latLng,
    memo: memo,
    name: requestData.name,
    projectId: projectId,
    projectTpl: projectTpl,
    recId: recId,
    sex: requestData.sex,
    sponsorProjectId: sponsorProjectId,
    startTime: requestData.date,
    title: title,
    way: way,
    channelAddress: channelAddress
    // ⚠️ 不包含 questions, options, types
};

// 排序、转换、截取、签名
const formattedData = formatParams(paramsForSign);
const encryptedText = toQueryString(formattedData);
const finalEncryptedText = encryptedText.substring(0, 255);
const signature = generateSign(finalEncryptedText, saltData.signkey);

// 发送请求时包含所有字段（包括 questions, options, types）
const ajaxData = {
    ...paramsForSign,
    questions: questionsValue,  // 发送但不签名
    options: optionsValue,      // 发送但不签名
    types: typesValue           // 发送但不签名
};
```

### 方案 2：缩短 questions/options/types（不推荐）

不现实，因为这些是问卷定义，无法缩短。

### 方案 3：增加截断长度（不可行）

后端使用 255 字符截断，前端无法改变。

## 需要验证

**关键问题**：后端 `dcwj.js` 在生成签名时，是否包含 `questions`, `options`, `types`？

需要检查：

1. 手动创建的请求，签名参数中是否包含这三个字段
2. `dcwj.js` 源码中，哪些字段参与签名

## 临时测试方案

用户可以尝试：

```javascript
// 在生成签名前，打印参数的键和长度
console.log("签名参数keys:", Object.keys(paramsForSign).sort());
const testText = toQueryString(formatParams(paramsForSign));
console.log("完整encryptedText长度:", testText.length);
console.log("截断后包含的参数:", testText.substring(0, 255));

// 检查截断后是否包含 corpId, date, projectId
const truncated = testText.substring(0, 255);
console.log("包含corpId?", truncated.includes("corpId="));
console.log("包含date?", truncated.includes("date="));
console.log("包含projectId?", truncated.includes("projectId="));
```

## 紧急修复

如果 `questions/options/types` 确实不应该参与签名，立即修改：

```javascript
// 修改位置：execution-logic.js 的 createTaskApi 函数

// ❌ 修改前
const paramsForSign = {
  // ... 所有字段，包括 questions, options, types
};

// ✅ 修改后
const paramsForSign = {
  // ... 所有字段，但排除 questions, options, types
};
```

## 下一步

1. 用户需要确认：手动创建时，`questions/options/types` 是否在签名中
2. 检查 `dcwj.js` 源码，确认签名参数列表
3. 根据确认结果，调整我们的签名逻辑

---

**总结**：验签失败不是因为发送了 `encryptedText` 字段，而是因为签名时包含了过长的 `questions/options/types` 字段，导致关键参数 `corpId`, `date`, `projectId` 被截断排除，前后端签名不一致。
