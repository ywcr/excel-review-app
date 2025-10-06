# API dcdxName 字段缺失修复

## 问题现象

验签成功，但创建的工单中**消费者姓名（dcdxName）为空**。

## 问题分析

### 自动化请求（错误）

```
&dcdxName=&  ❌ 空值
```

### 手动创建请求（正确）

```
&dcdxName=%E4%BB%BB%E7%8E%84%E4%B9%8B&  ✅ 任玄之
```

## 根本原因

### 原代码逻辑

```javascript
const dcdxName = getInputValue("dcdxName", config.dcdxName || name);
```

**问题**：

1. `getInputValue` 从页面读取 `dcdxName` 隐藏字段
2. 如果隐藏字段**存在但值为空字符串**，`getInputValue` 返回空字符串
3. 空字符串是一个有效值，不会触发默认值逻辑
4. 导致 `dcdxName` 为空

### getInputValue 的行为

```javascript
const getInputValue = (name, fallback = "") => {
  const input = targetWindow.document.querySelector(`input[name="${name}"]`);
  return input ? input.value : fallback;
  //              ^^^^^^^^^^
  //              如果 input.value 是空字符串，直接返回空字符串
  //              不会使用 fallback
};
```

## 修复方案

### 修复后的代码

```javascript
const way = getInputValue("way", "实名调查");
// ⚠️ 关键：dcdxName（调查对象姓名）必须有值
// 如果页面隐藏字段为空，使用 config.dcdxName 或当前调查对象的 name
let dcdxName = getInputValue("dcdxName", "");
if (!dcdxName || dcdxName.trim() === "") {
  dcdxName = config.dcdxName || name;
  console.log("📝 dcdxName 为空，使用默认值:", dcdxName);
}
const channelAddress = getInputValue("channelAddress", "");
```

**改进点**：

1. 先尝试从页面读取 `dcdxName`
2. **显式检查是否为空或只包含空格**
3. 如果为空，使用 `config.dcdxName` 或当前调查对象的 `name`
4. 添加日志，方便调试

## 为什么手动创建时有值？

手动创建时，`dcdxName` 字段的值是通过以下方式设置的：

1. **在表单中有一个输入框**：用户输入或自动填充消费者姓名
2. **表单提交时**：`$.serialize()` 会包含这个字段的值
3. **我们的自动化脚本**：没有正确设置这个字段的值

## dcdxName 的作用

`dcdxName` 是"调查对象姓名"（Diào Chá Duì Xiàng Name）：

- 对于**消费者问卷**：是消费者姓名
- 对于**患者问卷**：是患者姓名
- 对于**医生问卷**：是医生姓名

这个字段非常重要，因为：

1. 用于标识工单的调查对象
2. 在工单列表中显示
3. 可能参与重复提交检查

## 预期效果

修复后：

- ✅ `dcdxName` 字段会有正确的值（调查对象的姓名）
- ✅ 创建的工单中会显示消费者姓名
- ✅ 日志会显示 `dcdxName` 的来源

### 日志示例

**如果页面隐藏字段有值**：

```
📋 从页面读取的项目参数: {
  ...
  dcdxName: '任玄之'
}
```

**如果页面隐藏字段为空**：

```
📝 dcdxName 为空，使用默认值: 任玄之
📋 从页面读取的项目参数: {
  ...
  dcdxName: '任玄之'
}
```

## 修改文件

- `public/automation/js/automation/execution-logic.js`

## 关键改动

1. 将 `dcdxName` 的获取逻辑从单行改为多行
2. 添加显式的空值检查（包括空字符串和只包含空格的字符串）
3. 添加日志输出，方便调试

## 修复日期

2025-10-05

## 相关问题

- API_MULTISELECT_ANSWER_FIX.md - 多选题 answerN 签名修复
- API_CONTEXT_VALIDATION_FIX.md - 上下文验证修复
- API_IFRAME_CONTEXT_FIX.md - iframe 上下文查找修复

## 教训

1. **不要信任隐藏字段的默认值**：即使字段存在，值也可能为空
2. **显式检查空值**：空字符串和 `undefined` 是不同的
3. **添加日志**：帮助快速定位问题
4. **对比手动请求**：这是发现问题的最快方法
