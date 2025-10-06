# API 上下文验证修复

## 问题描述

用户报告了一个奇怪的现象：

- **在问卷创建页执行**：返回"重复提交"错误（说明验签成功，只是数据重复）
- **在任务列表页执行**：返回"安全校验失败-验签失败"

## 根本原因分析

通过对比两个请求的差异，发现了问题根源：

### 请求对比

| 字段                           | 问卷创建页 ✅      | 任务列表页 ❌                     |
| ------------------------------ | ------------------ | --------------------------------- |
| `corpId`                       | `1733101264425101` | `1749721838789101` (错误的默认值) |
| `questions`                    | 有值               | **空**                            |
| `options`                      | 有值               | **空**                            |
| `types`                        | 有值               | **空**                            |
| `dcdxName`                     | 空                 | `任玄之`                          |
| `encryptedText` 中的 `answerN` | 只包含单选题       | **包含所有题目（含多选）**        |

### 问题链条

1. **在任务列表页执行时**：

   - iframe 没有正确找到或内容未加载
   - `questions/options/types` 读取失败（全为空）

2. **因为 `types` 为空**：

   - 无法判断哪些是多选题
   - 所有 `answerN` 都被加入签名（包括 `answer2` 多选题）

3. **但在手动创建时**：

   - 多选题的 `answerN` 不会加入签名（jQuery `serialize()` 的行为）
   - 只有单选题的 `answerN` 在签名中

4. **结果**：

   - 自动化脚本的签名包含了不该包含的 `answer2`
   - 与后端验证的签名不匹配
   - 返回"安全校验失败-验签失败"

5. **额外问题**：
   - `corpId` 使用了错误的默认值 `1749721838789101`
   - 应该是 `1733101264425101`

## 修复方案

### 1. 添加 `types` 为空时的保护逻辑

```javascript
// 添加单选题的 answerN 到签名（多选题不加入 answerN）
// ⚠️ 关键：如果 types 为空，说明问卷结构未正确读取，不应添加 answerN
if (!typesValue) {
  console.error("❌ types 字段为空，无法判断题型，不添加 answerN 到签名");
  console.error("💡 这会导致验签失败！请确保在问卷页面上下文中执行");
} else {
  const typeList = typesValue.split("#");
  requestData.answers.forEach((answer, index) => {
    if (answer !== undefined && answer !== "") {
      const typeName = (typeList[index] || "").trim();
      const isMulti = typeName.indexOf("多选") !== -1;
      if (!isMulti) {
        cleanedParamsForSign[`answer${index}`] = answer;
        console.log(`  ✅ answer${index} (${typeName}): 加入签名`);
      } else {
        console.log(`  ⏭️  answer${index} (${typeName}): 跳过（多选题）`);
      }
    }
  });
}
```

### 2. 添加关键字段缺失检查（提前终止）

```javascript
// 如果关键参数缺失，给出明确提示并终止执行
if (!questionsValue || !optionsValue || !typesValue) {
  console.error("❌ 问卷结构字段缺失，无法继续执行！");
  console.error("💡 解决方案：");
  console.error("   1. 确保在问卷页面（如 xfzwj.jsp）内执行");
  console.error("   2. 或者在外层页面先打开问卷 iframe");
  console.error("   3. 检查 iframe 选择器是否正确");
  throw new Error(
    "问卷结构字段缺失 (questions/options/types)，无法生成正确的签名"
  );
}
```

### 3. 添加 `corpId` 错误值检查

```javascript
// 检查 corpId 是否正确（不应该使用旧的默认值）
if (corpId === "1749721838789101") {
  console.error("❌ corpId 使用了错误的默认值！");
  console.error("💡 当前 corpId:", corpId);
  console.error("💡 这会导致验签失败或系统异常");
}
```

## 为什么问卷创建页可以成功？

1. **在问卷创建页**：

   - 脚本在 iframe 内执行，或者能正确访问 iframe
   - `questions/options/types` 能正确读取
   - `corpId` 能正确读取（`1733101264425101`）
   - 多选题被正确识别并从签名中排除

2. **在任务列表页**：
   - 脚本在外层页面执行
   - iframe 可能未加载或无法访问
   - 所有隐藏字段读取失败
   - 使用了错误的默认值

## 最佳实践

### ✅ 推荐做法

1. **在问卷页面内执行**（最可靠）：

   - 打开问卷创建页
   - 在浏览器控制台切换到 iframe 上下文
   - 粘贴并执行脚本

2. **在外层页面执行前确保 iframe 已加载**：
   ```javascript
   // 等待 iframe 加载
   const iframe = document.querySelector('iframe[src*="xfzwj"]');
   if (iframe && iframe.contentWindow) {
     // 执行脚本
   }
   ```

### ❌ 避免的做法

- 在任务列表页直接执行（iframe 未加载）
- 在 iframe 加载前执行脚本
- 忽略"问卷结构字段缺失"错误继续执行

## 预期效果

修复后：

1. **如果在错误的上下文执行**：

   ```
   ❌ 问卷结构字段缺失，无法继续执行！
   💡 解决方案：
      1. 确保在问卷页面（如 xfzwj.jsp）内执行
      2. 或者在外层页面先打开问卷 iframe
      3. 检查 iframe 选择器是否正确
   Error: 问卷结构字段缺失 (questions/options/types)，无法生成正确的签名
   ```

2. **如果 types 为空但继续执行**：

   ```
   ❌ types 字段为空，无法判断题型，不添加 answerN 到签名
   💡 这会导致验签失败！请确保在问卷页面上下文中执行
   ```

3. **如果 corpId 使用错误默认值**：

   ```
   ❌ corpId 使用了错误的默认值！
   💡 当前 corpId: 1749721838789101
   💡 这会导致验签失败或系统异常
   ```

4. **如果在正确的上下文执行**：
   ```
   🔍 目标窗口: iframe窗口
   📋 从页面读取的项目参数: {
     projectId: '1757128526...',
     corpId: '1733101264...',
     ...
   }
   ✅ answer0 (单选项): 加入签名
   ✅ answer1 (单选项): 加入签名
   ⏭️  answer2 (多选项): 跳过（多选题）
   ...
   ```

## 修改文件

- `public/automation/js/automation/execution-logic.js`

## 关键改动

1. **添加 `types` 为空时的保护逻辑**：防止错误地将多选题加入签名
2. **添加关键字段缺失检查**：提前终止执行，避免生成错误的请求
3. **添加 `corpId` 错误值检查**：提醒用户使用了错误的默认值
4. **增强日志输出**：明确显示哪些 `answerN` 被加入签名，哪些被跳过

## 修复日期

2025-10-05

## 相关问题

- API_IFRAME_CONTEXT_FIX.md - iframe 上下文查找修复
- API_DYNAMIC_PARAMS_FIX.md - 动态参数读取修复
- API_SIGNATURE_FINAL_FIX.md - 签名验证修复
