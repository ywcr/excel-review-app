# 联系人创建功能缺失修复

## 问题描述

点击"创建联系人"按钮时报错：`函数不可用: startAddContact`

## 根本原因

在代码生成器中，只包含了问卷答题逻辑（`getQuestionLogic()`），但没有包含联系人创建逻辑（`getContactCreationLogic()`）。

### 代码结构

#### BaseQuestionnaire 类提供两个方法

1. **`getQuestionLogic()`** - 问卷答题逻辑

   - 包含 `_answer0()`, `_answer1()` 等答题函数
   - 由子类实现（如 `XihuangQuestionnaire`, `NiujieQuestionnaire` 等）

2. **`getContactCreationLogic()`** - 联系人创建逻辑
   - 包含 `getSame()` - 查询联系人是否存在
   - 包含 `addContact()` - 创建联系人
   - 包含 `startAddContact()` - 执行创建联系人任务
   - 由基类实现，所有问卷类型共享

### 问题所在

#### 修复前（code-generator.js 第 66 行）

```javascript
// 获取各部分代码
const questionLogic = this.questionnaireLogic.getQuestionLogic(); // ❌ 只包含答题逻辑
const executionLogic = this.getExecutionLogic(mode, isAllDates);
const validationCode = includeValidation
  ? this.validationManager.getValidationCode()
  : "";
const controlPanelCode = this.getControlPanelCode(isAllDates);
```

**结果**：

- ✅ 生成的代码包含 `_answer0()`, `_answer1()` 等函数
- ❌ 生成的代码**不包含** `startAddContact()` 函数
- ❌ 点击"创建联系人"按钮时报错

## 修复方案

### 修改文件

`/Users/yao/Yao/excel-review-app/public/automation/js/automation/code-generator.js`

### 修复代码

#### 修复后（第 66 行）

```javascript
// 获取各部分代码
const questionLogic =
  this.questionnaireLogic.getQuestionLogic() +
  "\n\n" +
  this.questionnaireLogic.getContactCreationLogic();
const executionLogic = this.getExecutionLogic(mode, isAllDates);
const validationCode = includeValidation
  ? this.validationManager.getValidationCode()
  : "";
const controlPanelCode = this.getControlPanelCode(isAllDates);
```

**改动**：

- ✅ 将 `getQuestionLogic()` 和 `getContactCreationLogic()` 的结果合并
- ✅ 使用 `\n\n` 分隔两部分代码，保持可读性

## 修复效果

### 生成的代码现在包含

#### 1. 问卷答题逻辑

```javascript
// ==================== 西黄消费者问卷答题逻辑 ====================

function _answer0() {
    const option = ['肿瘤辅助治疗','甲状腺 / 乳腺结节消结散结', ...];
    const index = random(0, option.length - 1);
    return option[index];
}

function _answer1() { ... }
// ... 更多答题函数
```

#### 2. 联系人创建逻辑（新增）

```javascript
// ==================== 消费者创建逻辑 ====================

// 查询消费者是否存在
function getSame(name, sex) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/lgb/lxrgl/getMessage",
      type: "POST",
      data: {
        recId: "",
        nvcVal: "",
        empRecId: "",
        lxrType: "消费者",
        name: name,
        sex: sex,
        remark: "",
      },
      traditional: true,
      success: function (res) {
        setTimeout(function () {
          resolve(res);
        }, 500);
      },
    });
  });
}

// 创建消费者
function addContact(name, sex) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/lgb/lxrgl/save",
      type: "POST",
      data: {
        recId: "",
        nvcVal: "",
        empRecId: "",
        lxrType: "消费者",
        name: name,
        sex: sex,
        remark: "",
      },
      traditional: true,
      success: function (res) {
        setTimeout(function () {
          resolve();
        }, 2000);
      },
    });
  });
}

// 执行创建消费者任务
async function startAddContact() {
  console.log("👥 准备创建消费者，共" + data.length + "个");

  let successCount = 0;
  let existCount = 0;

  for (let i = 0; i < data.length; i++) {
    let name = data[i].name;
    let sex = data[i].sex;

    await getSame(name, sex).then(async (res) => {
      if (res.code == 0) {
        await addContact(name, sex);
        console.log("[" + (i + 1) + "/" + data.length + "] 添加成功：" + name);
        successCount++;
      } else {
        console.log(
          "[" + (i + 1) + "/" + data.length + "] 消费者已存在：" + name
        );
        existCount++;
      }
    });
  }

  console.log("✅ 消费者创建完毕！");
  console.log(
    "📊 统计: 新建" + successCount + "个, 已存在" + existCount + "个"
  );
}
```

## 影响范围

### 修改的文件

- `/Users/yao/Yao/excel-review-app/public/automation/js/automation/code-generator.js`

### 影响的功能

- ✅ DOM 模式 - 创建联系人功能
- ✅ API 模式 - 创建联系人功能
- ✅ 所有问卷类型（西黄、牛解、知柏、贴膏、六味等）

### 不影响的功能

- 问卷答题逻辑（已有功能）
- 数据验证功能（已有功能）
- 自动执行功能（已有功能）

## 测试步骤

1. **刷新页面，重新生成代码**

   - 确保使用最新的修复代码

2. **检查生成的代码**

   - 搜索 `startAddContact` 函数
   - 应该能找到完整的函数定义

3. **点击"创建联系人"按钮**

   ```javascript
   startAddContact();
   ```

4. **观察日志**
   - ✅ 不应该出现"函数不可用"错误
   - ✅ 应该显示"👥 准备创建消费者，共 X 个"
   - ✅ 应该逐个创建联系人
   - ✅ 最后显示统计信息

## 预期效果

### 修复前

```
点击"创建联系人"按钮
❌ 函数不可用: startAddContact
```

### 修复后

```
点击"创建联系人"按钮
👥 准备创建消费者，共 48 个
[1/48] 添加成功：张三
[2/48] 消费者已存在：李四
[3/48] 添加成功：王五
...
✅ 消费者创建完毕！
📊 统计: 新建 32 个, 已存在 16 个
```

## 技术要点

### 为什么分开两个方法？

1. **职责分离**：

   - `getQuestionLogic()` - 问卷特定逻辑（每个问卷不同）
   - `getContactCreationLogic()` - 通用逻辑（所有问卷相同）

2. **继承复用**：

   - 子类只需实现 `getQuestionLogic()`
   - 联系人创建逻辑由基类提供，自动继承

3. **灵活组合**：
   - 可以单独使用答题逻辑
   - 可以单独使用联系人创建逻辑
   - 可以组合使用（当前修复）

### 联系人类型自动适配

`getContactCreationLogic()` 使用 `this.contactType` 变量：

- 西黄消费者问卷 → `contactType = "消费者"`
- 贴膏患者问卷 → `contactType = "患者"`
- 生成的代码会自动使用正确的联系人类型

## 相关文档

- [API 模式 contentWindow 修复](./API_MODE_CONTENTWINDOW_FIX.md)
- [DOM 模式中断修复](./DOM_MODE_INTERRUPTION_FIX.md)
- [API 答案格式修复](./API_ANSWERS_FORMAT_FIX.md)

## 修复日期

2025-10-05
