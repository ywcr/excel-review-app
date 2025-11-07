# 验证遗漏功能修复总结

## 修复日期

2025-10-05

## 问题描述

用户反馈验证遗漏功能（`updateWithMissing()`）存在以下问题：

1. **缺少实施日期参数** - 补充缺失数据时没有传递 `item.time` 字段
2. **字段标签名称不正确** - 不同问卷类型应使用不同的姓名标签（消费者姓名 vs 患者姓名）
3. **实施日期标签错误** - 使用了 `'实施时间'` 而不是 `'实施日期'`

## 问题分析

### 1. 缺少日期参数

**原代码**（validation-manager.js 第 246-247 行）：

```javascript
if (typeof createTaskApi !== "undefined") {
  await createTaskApi(item.name, item.sex);
} else if (typeof createTask !== "undefined") {
  await createTask(item.name, item.sex);
}
```

**问题**：

- 只传递了 `name` 和 `sex` 参数
- `createTask` 和 `createTaskApi` 内部使用全局 `date` 变量
- 但补充缺失数据时，不同数据项可能有不同的日期

### 2. 字段标签名称

**参考实现**（牛解消费者问卷.html 第 416 行）：

```javascript
setInputValue("消费者姓名", name);
```

**参考实现**（贴膏患者问卷.html 第 367 行）：

```javascript
setInputValue("患者姓名", name);
```

**原代码**（execution-logic.js）：

```javascript
setInputValue("姓名", name); // ❌ 硬编码，不区分问卷类型
```

### 3. 实施日期标签

**参考实现**（两个 HTML 文件都使用）：

```javascript
setInputValue("实施日期", year + "-" + date.replace(/\./g, "-"));
```

**原代码**：

```javascript
setInputValue("实施时间", formattedDate); // ❌ 标签名称错误
```

## 修复方案

### 修复 1: 添加日期参数传递

#### validation-manager.js

**位置**: 第 242-250 行

**修改前**:

```javascript
for (const item of dataToProcess) {
    try {
        console.log(\`处理: \${item.name} (\${item.sex})\`);

        if (typeof createTaskApi !== 'undefined') {
            await createTaskApi(item.name, item.sex);
        } else if (typeof createTask !== 'undefined') {
            await createTask(item.name, item.sex);
        }
```

**修改后**:

```javascript
for (const item of dataToProcess) {
    try {
        console.log(\`处理: \${item.name} (\${item.sex}) - \${item.time}\`);

        if (typeof createTaskApi !== 'undefined') {
            await createTaskApi(item.name, item.sex, item.time);
        } else if (typeof createTask !== 'undefined') {
            await createTask(item.name, item.sex, item.time);
        }
```

### 修复 2: 更新函数签名接收日期参数

#### execution-logic.js - createTask()

**位置**: 第 21-34 行

**修改前**:

```javascript
async function createTask(name, sex) {
    return new Promise((resolve, reject) => {
        // 设置基本信息
        setInputValue('姓名', name);
        setInputValue('性别', sex);
        setInputValue('实施时间', \`\${year}-\${date.replace('.', '-')}\`);
```

**修改后**:

```javascript
async function createTask(name, sex, taskDate) {
    return new Promise((resolve, reject) => {
        // 确定实施日期
        const implementDate = taskDate || date;
        const implementYear = (new Date()).getFullYear();
        const formattedDate = \`\${implementYear}-\${implementDate.replace('.', '-')}\`;

        // 根据配置确定姓名标签
        const nameLabel = config.labelName || '姓名';

        // 设置基本信息
        setInputValue(nameLabel, name);
        setInputValue('性别', sex);
        setInputValue('实施日期', formattedDate);
```

**改进点**:

1. ✅ 添加 `taskDate` 参数，支持传入特定日期
2. ✅ 使用 `config.labelName` 动态确定姓名标签（消费者姓名/患者姓名）
3. ✅ 修正标签名称：`'实施时间'` → `'实施日期'`
4. ✅ 使用 `(new Date()).getFullYear()` 获取当前年份，不依赖全局变量

#### execution-logic.js - createTaskApi()

**位置**: 第 357-371 行

**修改前**:

```javascript
async function createTaskApi(name, sex) {
    try {
        // 获取动态盐值
        const saltData = await createDynamicsSalt();

        // 构建请求数据
        const requestData = {
            name: name,
            sex: sex,
            date: \`\${year}-\${date.replace('.', '-')}\`,
            answers: {}
        };
```

**修改后**:

```javascript
async function createTaskApi(name, sex, taskDate) {
    try {
        // 确定实施日期
        const implementDate = taskDate || date;
        const implementYear = (new Date()).getFullYear();
        const formattedDate = \`\${implementYear}-\${implementDate.replace('.', '-')}\`;

        // 获取动态盐值
        const saltData = await createDynamicsSalt();

        // 构建请求数据
        const requestData = {
            name: name,
            sex: sex,
            date: formattedDate,
            answers: {}
        };
```

### 修复 3: 更新所有调用点

#### execution-logic.js - start()

**位置**: 第 90-91 行

```javascript
console.log(\`[DOM] 开始处理第 \${currentIndex + 1}/\${data.length} 个: \${item.name} (\${item.sex}) - \${item.time}\`);
await createTask(item.name, item.sex, item.time);
```

#### execution-logic.js - automatic()

**位置**: 第 139-140 行

```javascript
console.log(\`[DOM] 处理第 \${i + 1}/\${dataToProcess.length} 个: \${item.name} (\${item.sex}) - \${item.time}\`);
await createTask(item.name, item.sex, item.time);
```

#### execution-logic.js - startApi()

**位置**: 第 542-543 行

```javascript
console.log(\`[API] 开始处理第 \${currentIndex + 1}/\${data.length} 个: \${item.name} (\${item.sex}) - \${item.time}\`);
const result = await createTaskApi(item.name, item.sex, item.time);
```

#### execution-logic.js - automaticApi()

**位置**: 第 607-608 行

```javascript
console.log(\`[API] 处理第 \${i + 1}/\${dataToProcess.length} 个: \${item.name} (\${item.sex}) - \${item.time}\`);
const result = await createTaskApi(item.name, item.sex, item.time);
```

## 配置文件说明

### config.js 中的 labelName 配置

```javascript
questionnaireTypes: {
    liuwei_patient: {
        labelName: "患者姓名",  // 患者问卷使用
        contactType: "患者",
        // ...
    },
    xihuang_consumer: {
        labelName: "消费者姓名",  // 消费者问卷使用
        contactType: "消费者",
        // ...
    },
    // 其他问卷类型...
}
```

## 修复效果

### 修复前

```javascript
// 验证遗漏补充时
updateWithMissing() 调用
  ↓
createTask("张三", "男")  // ❌ 缺少日期参数
  ↓
setInputValue('姓名', "张三")  // ❌ 硬编码标签
setInputValue('实施时间', "2025-11-07")  // ❌ 标签名称错误
```

**问题**:

- 所有补充数据使用相同日期（全局 `date` 变量）
- 消费者问卷也使用 `'姓名'` 标签而不是 `'消费者姓名'`
- 使用错误的标签 `'实施时间'` 而不是 `'实施日期'`

### 修复后

```javascript
// 验证遗漏补充时
updateWithMissing() 调用
  ↓
createTask("张三", "男", "11.07")  // ✅ 传递具体日期
  ↓
const nameLabel = config.labelName  // "消费者姓名" 或 "患者姓名"
setInputValue(nameLabel, "张三")  // ✅ 动态标签
setInputValue('实施日期', "2025-11-07")  // ✅ 正确标签
```

**改进**:

- ✅ 每条数据使用自己的日期
- ✅ 根据问卷类型使用正确的姓名标签
- ✅ 使用正确的日期标签名称

## 数据结构示例

### Excel 数据结构

```javascript
[
  {
    name: "张三",
    sex: "男",
    time: "11.07", // ⭐ 每条数据有自己的日期
    assignee: "李四",
  },
  {
    name: "王五",
    sex: "女",
    time: "11.08", // ⭐ 不同日期
    assignee: "李四",
  },
];
```

### 验证遗漏返回的缺失数据

```javascript
missingData = [
  {
    name: "赵六",
    sex: "男",
    time: "11.09", // ⭐ 包含日期信息
  },
];
```

## 测试场景

### 场景 1: 消费者问卷补充缺失数据

```javascript
// 1. 选择西黄消费者问卷
// 2. 执行 validateData() 发现缺失
// 3. 执行 updateWithMissing()

// 预期结果:
// - 使用 '消费者姓名' 标签
// - 使用 '实施日期' 标签
// - 使用数据项自己的日期（如 11.09）
```

### 场景 2: 患者问卷补充缺失数据

```javascript
// 1. 选择六味患者问卷
// 2. 执行 validateData() 发现缺失
// 3. 执行 updateWithMissing()

// 预期结果:
// - 使用 '患者姓名' 标签
// - 使用 '实施日期' 标签
// - 使用数据项自己的日期
```

### 场景 3: 跨日期补充

```javascript
// 缺失数据包含多个日期
missingData = [
  { name: "A", sex: "男", time: "11.07" },
  { name: "B", sex: "女", time: "11.08" },
  { name: "C", sex: "男", time: "11.09" },
];

// 预期结果:
// - A 创建时使用 2025-11-07
// - B 创建时使用 2025-11-08
// - C 创建时使用 2025-11-09
```

## 修改文件清单

### Public 目录

1. ✅ `/public/automation/js/automation/validation-manager.js` - 添加日期参数传递
2. ✅ `/public/automation/js/automation/execution-logic.js` - 更新函数签名和实现

### HTML 目录（同步）

3. ✅ `/html/js/automation/validation-manager.js`
4. ✅ `/html/js/automation/execution-logic.js`

## 向后兼容性

### 函数签名兼容

```javascript
// 新签名支持可选参数
async function createTask(name, sex, taskDate) {
  const implementDate = taskDate || date; // 向后兼容
  // ...
}

// 旧调用方式仍然有效
await createTask("张三", "男"); // 使用全局 date

// 新调用方式
await createTask("张三", "男", "11.07"); // 使用指定日期
```

### 配置兼容

```javascript
// 如果 config.labelName 不存在，使用默认值
const nameLabel = config.labelName || "姓名";
```

## 相关文档

- `QUESTIONNAIRE_CONTENT_SYNC.md` - 问卷内容同步功能
- `VALIDATION_API_FIX.md` - 验证 API 修复
- `PROJECT_ID_FIX_SUMMARY.md` - ProjectId 获取修复

## 总结

### 修复的核心问题

1. ✅ **日期参数传递** - 补充缺失数据时正确传递每条数据的日期
2. ✅ **字段标签动态化** - 根据问卷类型使用正确的姓名标签
3. ✅ **标签名称修正** - 使用正确的 `'实施日期'` 标签

### 改进效果

- ✅ 支持跨日期补充缺失数据
- ✅ 消费者问卷和患者问卷使用正确的字段标签
- ✅ 与原始 HTML 实现保持一致
- ✅ 保持向后兼容性

### 覆盖范围

- ✅ DOM 模式单任务执行
- ✅ DOM 模式批量执行
- ✅ API 模式单任务执行
- ✅ API 模式批量执行
- ✅ 验证遗漏功能补充

所有创建任务的函数现在都能正确处理日期参数和字段标签！🎉
