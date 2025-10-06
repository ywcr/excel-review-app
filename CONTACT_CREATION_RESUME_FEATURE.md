# 联系人创建断点续传功能

## 功能说明

支持从指定位置或姓名开始创建联系人，适用于中途中断后继续创建的场景。

## 使用方法

### 1. 从指定位置开始（按序号）

```javascript
// 从第 25 个开始创建
startAddContact(25);

// 快速模式：从第 25 个开始创建
startAddContactFast(10, 25);
```

### 2. 从指定姓名开始

```javascript
// 从"张三"开始创建
startAddContact("张三");

// 快速模式：从"张三"开始创建
startAddContactFast(10, "张三");
```

### 3. 从头开始（默认）

```javascript
// 不传参数，从头开始
startAddContact();

// 快速模式：从头开始
startAddContactFast(10);
```

## 使用场景

### 场景 1：中途中断后继续

```javascript
// 假设你创建到第 30 个时网络断了
👥 准备创建消费者，共 48 个
[1/48] 添加成功：张三
[2/48] 消费者已存在：李四
...
[30/48] 添加成功：王五
❌ 网络错误

// 重新生成代码后，从第 31 个继续
startAddContact(31);
```

### 场景 2：按姓名恢复

```javascript
// 记得最后处理的是"王五"
startAddContact("王五");

// 输出：
📍 从「王五」开始创建（第 30 个）
👥 准备创建消费者，共 48 个，处理 19 个
[30/48] 消费者已存在：王五
[31/48] 添加成功：赵六
...
```

### 场景 3：分段处理

```javascript
// 早上处理前 30 个
startAddContactFast(10, 1); // 第 1-30 个

// 下午处理后 18 个
startAddContactFast(10, 31); // 第 31-48 个
```

## 参数说明

### startAddContact(startFrom)

| 参数        | 类型             | 说明                          | 示例                      |
| ----------- | ---------------- | ----------------------------- | ------------------------- |
| `startFrom` | `number`         | 从第几个开始（从 1 开始计数） | `startAddContact(25)`     |
| `startFrom` | `string`         | 从哪个姓名开始                | `startAddContact("张三")` |
| `startFrom` | `null/undefined` | 从头开始（默认）              | `startAddContact()`       |

### startAddContactFast(batchSize, startFrom)

| 参数        | 类型             | 说明                          | 示例                              |
| ----------- | ---------------- | ----------------------------- | --------------------------------- |
| `batchSize` | `number`         | 批量大小（默认 10）           | `startAddContactFast(20)`         |
| `startFrom` | `number`         | 从第几个开始（从 1 开始计数） | `startAddContactFast(10, 25)`     |
| `startFrom` | `string`         | 从哪个姓名开始                | `startAddContactFast(10, "张三")` |
| `startFrom` | `null/undefined` | 从头开始（默认）              | `startAddContactFast(10)`         |

## 日志输出示例

### 按序号开始

```javascript
startAddContact(25);

// 输出：
📍 从第 25 个开始创建
👥 准备创建消费者，共 48 个，处理 24 个
💡 提示: 使用 startAddContactFast() 可以更快速地创建（并发模式）
[25/48] 添加成功：王五
[26/48] 消费者已存在：赵六
...
✅ 消费者创建完毕！
📊 统计: 新建 15 个, 已存在 9 个
```

### 按姓名开始

```javascript
startAddContactFast(10, "王五");

// 输出：
📍 从「王五」开始创建（第 25 个）
⚡ 准备快速创建消费者，共 48 个，处理 24 个
📦 批量大小: 10 个/批
📦 处理第 1/3 批，共 10 个
[25/48] ⏭️  消费者已存在：王五
[26/48] ✅ 添加成功：赵六
...
✅ 消费者快速创建完毕！
📊 统计: 新建 15 个, 已存在 9 个
⏱️  总耗时约: 3 秒
```

### 姓名未找到

```javascript
startAddContact("不存在的人");

// 输出：
⚠️ 未找到姓名「不存在的人」，从头开始
👥 准备创建消费者，共 48 个，处理 48 个
...
```

## 实用技巧

### 技巧 1：查看数据列表

```javascript
// 查看所有数据的姓名和序号
data.forEach((item, index) => {
    console.log((index + 1) + '. ' + item.name + ' (' + item.sex + ')');
});

// 输出：
1. 张三 (男)
2. 李四 (女)
3. 王五 (男)
...
```

### 技巧 2：查找姓名位置

```javascript
// 查找某个姓名的位置
const name = "王五";
const index = data.findIndex(item => item.name === name);
console.log(name + ' 在第 ' + (index + 1) + ' 个');

// 输出：
王五 在第 25 个
```

### 技巧 3：查看剩余数量

```javascript
// 查看从某个位置开始还剩多少
const startFrom = 25;
const remaining = data.length - (startFrom - 1);
console.log('从第 ' + startFrom + ' 个开始，还剩 ' + remaining + ' 个');

// 输出：
从第 25 个开始，还剩 24 个
```

### 技巧 4：批量处理策略

```javascript
// 分三批处理，每批处理 1/3
const total = data.length;
const batch1End = Math.floor(total / 3);
const batch2End = Math.floor((total * 2) / 3);

// 第一批：1 - 16
startAddContactFast(10, 1);

// 第二批：17 - 32
startAddContactFast(10, batch1End + 1);

// 第三批：33 - 48
startAddContactFast(10, batch2End + 1);
```

## 注意事项

### 1. 序号从 1 开始

```javascript
// ✅ 正确：序号从1开始
startAddContact(1); // 第1个
startAddContact(25); // 第25个

// ❌ 错误：序号从0开始
startAddContact(0); // 会被自动修正为1
```

### 2. 姓名必须完全匹配

```javascript
// ✅ 正确：完全匹配
startAddContact("张三");

// ❌ 错误：部分匹配不生效
startAddContact("张"); // 找不到
startAddContact("张 三"); // 找不到（多了空格）
```

### 3. 重复姓名的处理

```javascript
// 如果有多个同名的人，会找到第一个
data = [
  { name: "张三", sex: "男" }, // 第1个
  { name: "李四", sex: "女" }, // 第2个
  { name: "张三", sex: "女" }, // 第3个
];

startAddContact("张三");
// 会从第1个"张三"开始，而不是第3个

// 如果要从第3个开始，使用序号
startAddContact(3);
```

### 4. 数据变化的影响

```javascript
// 如果重新上传了Excel，data会变化
// 之前记录的序号或姓名可能不准确
// 建议重新检查：
data.forEach((item, index) => {
  console.log(index + 1 + ". " + item.name);
});
```

## 与其他功能的结合

### 结合快速模式

```javascript
// 从第 25 个开始，使用快速模式，批量大小 20
startAddContactFast(20, 25);

// 从"王五"开始，使用快速模式，批量大小 15
startAddContactFast(15, "王五");
```

### 结合性别校验

```javascript
// 从指定位置开始，仍然会校验性别
startAddContact(25);

// 输出可能包含：
[25/48] 消费者已存在：王五，性别已由「男」修正为「女」
```

## 常见问题

### Q1: 如何知道上次处理到哪里了？

**A:** 查看控制台日志，最后一条成功的记录：

```
[30/48] 添加成功：王五
```

说明处理到第 30 个，下次从 31 开始：

```javascript
startAddContact(31);
```

### Q2: 可以跳过某些人吗？

**A:** 可以分段处理：

```javascript
// 处理 1-20
startAddContactFast(10, 1);

// 跳过 21-25，从 26 开始
startAddContactFast(10, 26);
```

### Q3: 起始位置会影响统计吗？

**A:** 统计只计算实际处理的部分：

```javascript
startAddContact(41);  // 从第 41 个开始

// 输出：
📊 统计: 新建 5 个, 已存在 3 个
// 只统计第 41-48 个，共 8 个
```

### Q4: 可以从最后一个往前处理吗？

**A:** 不支持倒序，但可以手动指定范围：

```javascript
// 想处理最后 10 个
const total = data.length; // 48
startAddContact(total - 9); // 从第 39 个开始
```

## 修改的文件

- `/Users/yao/Yao/excel-review-app/public/automation/js/automation/questionnaire-logic/base-questionnaire.js`

  - `startAddContact(startFrom)` - 添加起始位置参数
  - `startAddContactFast(batchSize, startFrom)` - 添加起始位置参数

- `/Users/yao/Yao/excel-review-app/public/automation/js/automation/template-manager.js`
  - 更新命令提示信息

## 相关文档

- [联系人创建速度优化](./CONTACT_CREATION_SPEED_OPTIMIZATION.md)
- [联系人创建功能修复](./CONTACT_CREATION_FIX.md)

## 修复日期

2025-10-05
