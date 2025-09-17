# DOM vs API 模式职责分析

## ✅ 职责分离良好的地方

### 1. **执行方式完全分离**
- **DOM模式**: 通过浏览器页面操作
  ```javascript
  setInputValue('姓名', name);           // 设置表单字段
  setOptionValue(i, answer);            // 选择选项
  submitBtn.click();                    // 点击提交按钮
  ```

- **API模式**: 直接HTTP请求
  ```javascript
  const response = await fetch(`${API_BASE_URL}${config.apiEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
  });
  ```

### 2. **函数命名区分**
- DOM: `start()`, `automatic()`, `createTask()`
- API: `startApi()`, `automaticApi()`, `createTaskApi()`

### 3. **配置分离**
- DOM模式需要: `contentWindow`, 页面元素选择器
- API模式需要: `API_BASE_URL`, 签名算法, 端点配置

## 🔴 存在冲突的地方

### 1. **共享状态变量** ⚠️
```javascript
let currentIndex = 0;  // 两种模式共享
let isRunning = false; // 两种模式共享
```
**问题**: 如果用户同时使用DOM和API模式会产生状态冲突

### 2. **相同的问题答案逻辑**
```javascript
// 两种模式都调用相同的答案函数
for (let i = 0; i < 10; i++) {
    const answerFunc = window[`_answer${i}`];
    const answer = answerFunc();
    // 只是使用方式不同
}
```
**影响**: 这个其实是合理的，因为答案逻辑应该一致

### 3. **验证功能共享**
两种模式都使用相同的 `validateData()` 函数，这是合理的。

## 💡 改进建议

### 1. **状态分离** (已创建解决方案)
创建了 `ExecutionStateManager` 来分离状态：
```javascript
const domState = { currentIndex: 0, isRunning: false };
const apiState = { currentIndex: 0, isRunning: false };
```

### 2. **互斥执行检查**
```javascript
function canStartExecution(mode) {
    const status = getExecutionStatus();
    if (status.anyRunning) {
        console.log(`⚠️ ${mode}模式无法启动，另一模式正在运行中`);
        return false;
    }
    return true;
}
```

## 📋 需要补充的问卷逻辑

根据配置文件，需要补充以下4个问卷的具体逻辑：

### 1. **牛解消费者问卷** (niujie-questionnaire.js)
- 状态: ❌ 只有占位符
- 配置: ✅ 已完整配置
- 需要: 具体的答题逻辑函数

### 2. **知柏消费者问卷** (zhibai-questionnaire.js)  
- 状态: ❌ 只有占位符
- 配置: ✅ 已完整配置
- 需要: 具体的答题逻辑函数

### 3. **六味患者问卷** (liuwei-questionnaire.js)
- 状态: ❌ 只有占位符  
- 配置: ✅ 已完整配置
- 需要: 具体的答题逻辑函数

### 4. **贴膏患者问卷** (tiegao-questionnaire.js)
- 状态: ❌ 只有占位符
- 配置: ✅ 已完整配置  
- 需要: 具体的答题逻辑函数

### 5. **西黄消费者问卷** (xihuang-questionnaire.js)
- 状态: ✅ 已完整实现
- 包含: 10个问题的具体答题逻辑

## 🎯 问卷逻辑实现模板

每个问卷需要实现的标准格式：
```javascript
class XxxQuestionnaire extends BaseQuestionnaire {
    getQuestionLogic() {
        return `
// ==================== XXX问卷答题逻辑 ====================

${this.getRandomAnswerFunctions()}

// 1、问题1
function _answer0() {
    const option = ['选项1', '选项2', '选项3'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 2、问题2  
function _answer1() {
    // 具体逻辑
}

// ... 更多问题
`;
    }
}
```

## 🔧 总结

### DOM和API职责分离情况：
- ✅ **执行方式完全分离** - 无冲突
- ✅ **函数命名区分** - 无冲突  
- ✅ **配置分离** - 无冲突
- ⚠️ **状态管理共享** - 存在潜在冲突，已提供解决方案
- ✅ **答案逻辑共享** - 合理的共享

### 需要补充的内容：
1. **立即需要**: 4个问卷类型的具体答题逻辑
2. **建议改进**: 状态管理分离（可选）
3. **长期优化**: 执行模式互斥检查（可选）

**结论**: 当前的职责分离基本合理，主要问题是缺少具体的问卷逻辑实现。
