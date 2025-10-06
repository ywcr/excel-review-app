# 问卷内容自动同步功能

## 功能概述

为了解决默认问卷内容与网站实际问卷内容不匹配的问题，我们实现了一个自动抓取和对比功能。在每次执行创建任务前，系统会自动从网站页面抓取最新的问卷内容，并与代码中的默认配置进行对比。如果发现不一致，系统会自动使用网站中抓取到的最新内容。

## 功能特点

1. **自动抓取**：从网站页面 DOM 结构中自动提取问卷题目和选项
2. **智能对比**：将抓取的内容与默认配置进行对比，检测差异
3. **动态更新**：如果发现不匹配，自动生成新的答案函数
4. **无缝集成**：在执行任务前自动运行，无需手动干预
5. **详细日志**：提供完整的抓取、对比和更新日志

## 工作原理

### 1. 抓取问卷内容

系统通过以下步骤从网站页面抓取问卷内容：

```javascript
// 定位到问卷表单区域
const contentWindow =
  document.querySelector("#ssfwIframe")?.contentWindow ?? window;
const mainElements = contentWindow.document.querySelectorAll(".main");
const questionItems = mainElements[1].querySelectorAll(".layui-form-item");

// 遍历每个问题项
questionItems.forEach((item, index) => {
  // 获取问题标题
  const labelElement = item.querySelector("label");
  const questionTitle = labelElement.innerText.trim();

  // 获取所有选项
  const inputElements = item.querySelectorAll(
    'input[type="radio"], input[type="checkbox"]'
  );
  const options = Array.from(inputElements).map((input) => input.value.trim());
});
```

### 2. 对比内容

对比过程：

1. 检查每个问题索引对应的答案函数是否存在
2. 获取答案函数的源代码
3. 检查网站抓取的选项是否都存在于函数源码中
4. 如果有任何选项不匹配，标记为需要更新

### 3. 动态更新

如果检测到不匹配：

```javascript
// 生成新的答案函数
function generateAnswerFunction(question) {
  const options = question.options;
  return function () {
    const index = Math.floor(Math.random() * options.length);
    return options[index];
  };
}

// 替换原有的答案函数
window[`_answer${index}`] = generateAnswerFunction(question);
```

## 使用方式

### 自动模式（推荐）

功能已自动集成到执行流程中，无需额外操作：

- **DOM 模式**：调用 `start()` 或 `automatic()` 时自动检查
- **API 模式**：调用 `startApi()` 或 `automaticApi()` 时自动检查

### 手动调用

如果需要单独检查问卷内容：

```javascript
// 在浏览器控制台中执行
await initializeQuestionnaireContent();
```

## 日志输出示例

### 正常情况（内容匹配）

```
📋 初始化问卷内容检查...
🔍 开始从页面抓取问卷选项...
  问题 0: 您的年龄是
    选项: [20 岁以下, 21~34 岁, 35~59, 60 岁以上]
  问题 1: 您选择这家药店购买西黄丸的原因
    选项: [价格实惠, 质量好, 交通便利, 药品种类齐全, 服务周到]
✅ 成功抓取 10 个问题
🔄 开始对比问卷内容...
✅ 问题 0 的选项匹配
✅ 问题 1 的选项匹配
...
✅ 问卷内容与网站一致，无需更新
✅ 问卷内容检查完成
```

### 发现不匹配（自动更新）

```
📋 初始化问卷内容检查...
🔍 开始从页面抓取问卷选项...
  问题 0: 您的年龄是
    选项: [18 岁以下, 19~35 岁, 36~60, 60 岁以上]
✅ 成功抓取 10 个问题
🔄 开始对比问卷内容...
🔄 问题 0 的选项不匹配，更新答案函数
  原选项: 从函数源码中
  新选项: [18 岁以下, 19~35 岁, 36~60, 60 岁以上]
✅ 问题 1 的选项匹配
...
✅ 问卷内容已更新为网站最新版本
✅ 问卷内容检查完成
```

## 技术实现

### 文件修改

1. **template-manager.js**

   - 添加 `extractQuestionOptionsFromPage()` - 抓取页面问卷内容
   - 添加 `compareAndUpdateQuestions()` - 对比并更新问卷内容
   - 添加 `generateAnswerFunction()` - 动态生成答案函数
   - 添加 `initializeQuestionnaireContent()` - 初始化检查流程

2. **execution-logic.js**

   - 在 `start()` 函数中添加首次执行检查
   - 在 `automatic()` 函数中添加执行前检查
   - 在 `startApi()` 函数中添加首次执行检查
   - 在 `automaticApi()` 函数中添加执行前检查

3. **validation-manager.js**
   - 在 `updateWithMissing()` 函数中添加执行前检查
   - 确保补充缺失数据时使用最新的问卷内容

### DOM 结构依赖

系统依赖以下 DOM 结构：

```html
<div class="main">
  <!-- 基本信息区域 -->
</div>
<div class="main">
  <!-- 问卷问题区域 -->
  <div class="layui-form-item">
    <label>问题标题</label>
    <input type="radio" value="选项1" />
    <input type="radio" value="选项2" />
    ...
  </div>
  ...
</div>
```

## 注意事项

1. **页面加载时机**：确保在问卷页面完全加载后再执行任务
2. **iframe 支持**：自动检测并支持 iframe 中的问卷表单
3. **错误处理**：如果抓取失败，会使用默认配置并记录警告日志
4. **性能影响**：检查过程约需 500ms，对整体执行影响很小

## 兼容性

- ✅ DOM 模式 - 完全支持
- ✅ API 模式 - 完全支持
- ✅ 单任务执行 - 首次执行时检查
- ✅ 批量执行 - 执行前统一检查
- ✅ Worker 模式 - 自动回退到主线程检查
- ✅ 验证遗漏功能 - `updateWithMissing()` 执行前检查

## 故障排除

### 问题：抓取失败

**可能原因**：

- 页面结构发生变化
- iframe 未正确加载
- 权限限制

**解决方案**：

1. 检查控制台错误日志
2. 确认页面完全加载
3. 手动刷新问卷页面后重试

### 问题：对比不准确

**可能原因**：

- 选项文本包含特殊字符
- 函数源码被压缩或混淆

**解决方案**：

1. 查看详细的对比日志
2. 手动检查抓取的选项是否正确
3. 必要时手动更新默认配置

## 未来改进

1. **缓存机制**：缓存抓取结果，避免重复检查
2. **版本控制**：记录问卷版本，追踪变更历史
3. **智能匹配**：支持模糊匹配和相似度计算
4. **配置持久化**：将更新后的配置保存到本地存储

## 相关文件

- `/public/automation/js/automation/template-manager.js` - 模板管理器
- `/public/automation/js/automation/execution-logic.js` - 执行逻辑
- `/public/automation/js/automation/validation-manager.js` - 验证管理器
- `/html/js/automation/template-manager.js` - HTML 版本（同步）
- `/html/js/automation/execution-logic.js` - HTML 版本（同步）
- `/html/js/automation/validation-manager.js` - HTML 版本（同步）

## 更新日期

2025-10-05
