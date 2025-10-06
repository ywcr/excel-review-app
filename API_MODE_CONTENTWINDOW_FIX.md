# API 模式 contentWindow 未定义错误修复

## 问题描述

使用 API 模式执行"补充遗漏"功能时，出现 `ReferenceError: contentWindow is not defined` 错误。

### 错误日志
```
❌ API创建失败: 常兵茜 ReferenceError: contentWindow is not defined
    at createTaskApi (Script snippet #10:5916:32)
    at async updateWithMissing (Script snippet #10:5119:17)
```

## 根本原因

在修复 API 答案格式问题时，我们在 `createTaskApi` 函数中添加了从页面提取问卷结构的代码：

```javascript
// 第397-399行：直接使用 contentWindow
const questionsInput = contentWindow.document.querySelector('input[name="questions"]');
const optionsInput = contentWindow.document.querySelector('input[name="options"]');
const typesInput = contentWindow.document.querySelector('input[name="types"]');
```

**问题**：
- ❌ `contentWindow` 变量只在 **DOM 模式模板** 中定义
- ❌ API 模式模板中没有定义 `contentWindow`
- ❌ 导致 API 模式执行时报 `ReferenceError`

### 变量定义位置

#### DOM 模式（有定义）
```javascript
// template-manager.js - getDomSingleTemplate()
const contentWindow = document.querySelector('#ssfwIframe')?.contentWindow ?? window;
```

#### API 模式（无定义）
```javascript
// template-manager.js - getApiSingleTemplate()
// ❌ 没有定义 contentWindow
```

## 修复方案

### 修改文件
`/Users/yao/Yao/excel-review-app/public/automation/js/automation/execution-logic.js`

### 修复代码

#### 修复前（第396-399行）
```javascript
// 从页面提取问卷结构（questions, options, types）
const questionsInput = contentWindow.document.querySelector('input[name="questions"]');
const optionsInput = contentWindow.document.querySelector('input[name="options"]');
const typesInput = contentWindow.document.querySelector('input[name="types"]');
```

#### 修复后（第396-408行）
```javascript
// 从页面提取问卷结构（questions, options, types）
// 获取 contentWindow（可能在 iframe 中或直接在当前页面）
const targetWindow = (typeof contentWindow !== 'undefined') 
    ? contentWindow 
    : (document.querySelector('#ssfwIframe')?.contentWindow || window);

const questionsInput = targetWindow.document.querySelector('input[name="questions"]');
const optionsInput = targetWindow.document.querySelector('input[name="options"]');
const typesInput = targetWindow.document.querySelector('input[name="types"]');

const questionsValue = questionsInput ? questionsInput.value : '';
const optionsValue = optionsInput ? optionsInput.value : '';
const typesValue = typesInput ? typesInput.value : '';
```

## 修复逻辑

### 智能检测 contentWindow

```javascript
const targetWindow = (typeof contentWindow !== 'undefined') 
    ? contentWindow  // ✅ DOM 模式：使用已定义的 contentWindow
    : (document.querySelector('#ssfwIframe')?.contentWindow || window);  // ✅ API 模式：动态获取
```

**逻辑说明**：
1. **检查是否已定义**：`typeof contentWindow !== 'undefined'`
   - DOM 模式：已定义，直接使用
   - API 模式：未定义，进入下一步

2. **动态获取 iframe**：`document.querySelector('#ssfwIframe')?.contentWindow`
   - 如果页面中有 `#ssfwIframe`，使用其 contentWindow
   - 使用可选链 `?.` 避免 null 错误

3. **回退到当前窗口**：`|| window`
   - 如果没有 iframe，使用当前窗口
   - 适用于直接在问卷页面运行的情况

## 影响范围

### 修改的文件
1. `/Users/yao/Yao/excel-review-app/public/automation/js/automation/execution-logic.js`
2. `/Users/yao/Yao/excel-review-app/html/js/automation/execution-logic.js`（已同步）

### 影响的功能
- ✅ API 模式 - 补充遗漏功能
- ✅ API 模式 - 单日期自动创建
- ✅ API 模式 - 全日期自动创建

### 不影响的功能
- DOM 模式（已有 contentWindow 定义）

## 测试步骤

1. **刷新页面，重新生成代码**
   - 确保使用最新的修复代码

2. **执行数据验证**
   ```javascript
   validateData();
   ```

3. **查看缺失数据**
   ```javascript
   showMissing();
   ```

4. **补充遗漏（API 模式）**
   ```javascript
   updateWithMissing();
   ```

5. **观察日志**
   - ✅ 不应该出现 `contentWindow is not defined` 错误
   - ✅ 应该能正常获取动态盐值
   - ✅ 应该能成功创建任务

## 预期效果

### 修复前
```
处理: 常兵茜 (男) - 09.11
🔍 开始获取动态盐值...
✅ 动态盐值获取成功: 49056
❌ API创建失败: 常兵茜 ReferenceError: contentWindow is not defined
```

### 修复后
```
处理: 常兵茜 (男) - 09.11
🔍 开始获取动态盐值...
✅ 动态盐值获取成功: 49056
📤 发送请求数据: {...}
📥 API响应: {code: 0, message: '操作成功'}
✅ 创建成功: 常兵茜
```

## 技术要点

### 为什么不在模板中定义 contentWindow？

**原因**：
1. **模板分离**：DOM 模式和 API 模式使用不同的模板
2. **执行逻辑共享**：`execution-logic.js` 被两种模式共享
3. **动态适配**：在执行逻辑中动态检测和适配更灵活

### typeof 检查的重要性

```javascript
// ✅ 正确：使用 typeof 检查
typeof contentWindow !== 'undefined'

// ❌ 错误：直接检查会报错
if (contentWindow) { ... }  // 如果未定义，这行本身就会报错
```

### 可选链的作用

```javascript
// ✅ 使用可选链
document.querySelector('#ssfwIframe')?.contentWindow

// ❌ 不使用可选链（如果 querySelector 返回 null 会报错）
document.querySelector('#ssfwIframe').contentWindow  // TypeError: Cannot read property 'contentWindow' of null
```

## 相关文档
- [API 答案格式修复](./API_ANSWERS_FORMAT_FIX.md)
- [DOM 模式中断修复](./DOM_MODE_INTERRUPTION_FIX.md)
- [自动化功能问题分析](./AUTOMATION_ISSUES_ANALYSIS.md)

## 修复日期
2025-10-05
