# 选项对比显示改进

## 修复日期

2025-10-05

## 问题描述

在问卷内容对比时，日志显示：

```
🔄 问题 9 的选项不匹配，更新答案函数
  原选项: 从函数源码中
  新选项: [略高于预期, 价格偏高, 更关注疗效，对价格不敏感, 其他]
```

**问题**：`原选项: 从函数源码中` 是一个占位符文本，没有实际显示原来的选项内容，不利于调试和确认更新是否正确。

## 原有代码

```javascript
// 获取当前答案函数的选项（通过检查函数源码）
const currentFunc = window[answerFuncName];
const funcSource = currentFunc.toString();

// 检查选项是否匹配
let allOptionsMatch = true;
for (const option of question.options) {
    if (!funcSource.includes(option)) {
        allOptionsMatch = false;
        break;
    }
}

if (!allOptionsMatch) {
    console.log(\`🔄 问题 \${index} 的选项不匹配，更新答案函数\`);
    console.log(\`  原选项: 从函数源码中\`);  // ❌ 占位符文本
    console.log(\`  新选项: [\${question.options.join(', ')}]\`);

    // 动态生成新的答案函数
    const newFunction = generateAnswerFunction(question);
    window[answerFuncName] = newFunction;
    hasChanges = true;
}
```

## 改进方案

### 从函数源码中提取选项

使用正则表达式从函数源码中提取 `const option = [...]` 数组：

```javascript
// 尝试从函数源码中提取选项数组
let currentOptions = [];
try {
    // 匹配 const option = [...] 或 const option=[...]
    const optionMatch = funcSource.match(/const\s+option\s*=\s*\[([^\]]+)\]/);
    if (optionMatch) {
        // 提取选项字符串，去掉引号和空格
        currentOptions = optionMatch[1]
            .split(',')
            .map(opt => opt.trim().replace(/^['"]|['"]$/g, ''))
            .filter(opt => opt);
    }
} catch (error) {
    console.warn(\`⚠️ 无法解析问题 \${index} 的原选项\`, error);
}

if (!allOptionsMatch) {
    console.log(\`🔄 问题 \${index} 的选项不匹配，更新答案函数\`);
    if (currentOptions.length > 0) {
        console.log(\`  原选项: [\${currentOptions.join(', ')}]\`);  // ✅ 显示实际选项
    } else {
        console.log(\`  原选项: (无法从函数源码中提取)\`);
    }
    console.log(\`  新选项: [\${question.options.join(', ')}]\`);

    // 动态生成新的答案函数
    const newFunction = generateAnswerFunction(question);
    window[answerFuncName] = newFunction;
    hasChanges = true;
}
```

## 正则表达式说明

### 匹配模式

```javascript
/const\\s+option\\s*=\\s*\\[([^\\]]+)\\]/;
```

**注意**：在模板字符串中，反斜杠需要双重转义（`\\s` 而不是 `\s`）

**解析**：

- `const\\s+option` - 匹配 `const option`（允许多个空格）
- `\\s*=\\s*` - 匹配 `=`（允许前后有空格）
- `\\[` - 匹配左方括号 `[`
- `([^\\]]+)` - 捕获组：匹配除了 `]` 之外的所有字符（选项内容）
- `\\]` - 匹配右方括号 `]`

### 示例函数源码

```javascript
function _answer9() {
  const option = ["略高于预期", "价格偏高", "更关注疗效，对价格不敏感", "其他"];
  const index = random(0, option.length - 1);
  return option[index];
}
```

**匹配结果**：

- `optionMatch[0]`: `const option = ['略高于预期', '价格偏高', '更关注疗效，对价格不敏感', '其他']`
- `optionMatch[1]`: `'略高于预期', '价格偏高', '更关注疗效，对价格不敏感', '其他'`

### 提取处理

```javascript
currentOptions = optionMatch[1]
  .split(",") // 按逗号分隔
  .map((opt) => opt.trim().replace(/^['"]|['"]$/g, "")) // 去掉引号和空格
  .filter((opt) => opt); // 过滤空字符串

// 结果: ["略高于预期", "价格偏高", "更关注疗效，对价格不敏感", "其他"]
```

## 改进效果

### 改进前 ❌

```
🔄 问题 0 的选项不匹配，更新答案函数
  原选项: 从函数源码中
  新选项: [肿瘤辅助治疗, 甲状腺 / 乳腺结节消结散结, 淋巴结肿大 / 炎症肿痛缓解, 中医辨证热毒壅结证, 其他]

🔄 问题 9 的选项不匹配，更新答案函数
  原选项: 从函数源码中
  新选项: [略高于预期, 价格偏高, 更关注疗效，对价格不敏感, 其他]
```

**问题**：

- 看不到原来的选项是什么
- 无法判断是否真的需要更新
- 不利于调试和问题排查

### 改进后 ✅

```
🔄 问题 0 的选项不匹配，更新答案函数
  原选项: [21~34 岁, 35~44 岁, 45~54 岁, 55~64 岁, 65 岁以上]
  新选项: [肿瘤辅助治疗, 甲状腺 / 乳腺结节消结散结, 淋巴结肿大 / 炎症肿痛缓解, 中医辨证热毒壅结证, 其他]

🔄 问题 9 的选项不匹配，更新答案函数
  原选项: [价格合理, 价格实惠, 价格偏高, 对价格不敏感]
  新选项: [略高于预期, 价格偏高, 更关注疗效，对价格不敏感, 其他]
```

**改进**：

- ✅ 清楚显示原选项和新选项
- ✅ 可以直观对比差异
- ✅ 便于确认更新是否正确
- ✅ 方便调试和问题排查

## 容错处理

### 场景 1: 成功提取选项

```javascript
// 函数源码
function _answer0() {
  const option = ["选项A", "选项B", "选项C"];
  return option[random(0, option.length - 1)];
}

// 日志输出
原选项: [选项A, 选项B, 选项C];
```

### 场景 2: 无法提取选项

```javascript
// 函数源码（特殊格式）
function _answer0() {
  return randomAnswer(["选项A", "选项B"]);
}

// 日志输出
原选项: 无法从函数源码中提取;
```

### 场景 3: 提取失败（异常）

```javascript
// 函数源码格式异常
function _answer0() {
    const opt = ['选项A']  // 变量名不是 option
    return opt[0]
}

// 日志输出
⚠️ 无法解析问题 0 的原选项
原选项: (无法从函数源码中提取)
```

## 支持的函数格式

### 格式 1: 标准格式（推荐）

```javascript
function _answer0() {
  const option = ["选项A", "选项B", "选项C"];
  const index = random(0, option.length - 1);
  return option[index];
}
```

✅ 能够提取

### 格式 2: 紧凑格式

```javascript
function _answer0() {
  const option = ["选项A", "选项B", "选项C"];
  return option[random(0, option.length - 1)];
}
```

✅ 能够提取

### 格式 3: 多行格式

```javascript
function _answer0() {
  const option = ["选项A", "选项B", "选项C"];
  return option[random(0, option.length - 1)];
}
```

❌ 无法提取（正则表达式不支持多行）

**解决方案**：显示 `(无法从函数源码中提取)`，不影响功能

## 实际应用场景

### 场景 1: 问卷选项更新

```
🔄 问题 0 的选项不匹配，更新答案函数
  原选项: [20岁以下, 20-35岁, 35-45岁, 45-60岁, 60岁以上]
  新选项: [肿瘤辅助治疗, 甲状腺 / 乳腺结节消结散结, 淋巴结肿大 / 炎症肿痛缓解, 中医辨证热毒壅结证, 其他]
```

**分析**：问题类型完全变了，从年龄问题变成了用药目的问题

### 场景 2: 选项文字微调

```
🔄 问题 9 的选项不匹配，更新答案函数
  原选项: [价格合理, 价格实惠, 价格偏高, 对价格不敏感]
  新选项: [略高于预期, 价格偏高, 更关注疗效，对价格不敏感, 其他]
```

**分析**：选项文字有调整，增加了"其他"选项

### 场景 3: 选项顺序变化

```
🔄 问题 5 的选项不匹配，更新答案函数
  原选项: [未关注, 看过说明书但未重视, 药师主动告知过注意事项]
  新选项: [药师主动告知过注意事项, 看过说明书但未重视, 未关注]
```

**分析**：选项内容相同，但顺序变了

## 调试价值

### 1. 确认更新正确性

通过对比原选项和新选项，可以确认：

- 是否真的需要更新
- 更新的内容是否正确
- 是否有意外的变化

### 2. 问题排查

如果出现问题，可以：

- 检查原选项是否正确
- 确认新选项来源
- 追踪选项变化历史

### 3. 数据一致性验证

可以验证：

- 默认配置是否过时
- 网站内容是否有更新
- 抓取逻辑是否正确

## 修改文件清单

### Public 目录

1. ✅ `/public/automation/js/automation/template-manager.js` - DOM 模式对比函数
2. ✅ `/public/automation/js/automation/template-manager.js` - API 模式对比函数（同一文件两处）

### HTML 目录（同步）

3. ✅ `/html/js/automation/template-manager.js`

## 相关文档

- `HIDDEN_FIELD_DELIMITER_FIX.md` - 隐藏字段分隔符修复
- `QUESTIONNAIRE_EXTRACTION_ENHANCEMENT.md` - 问卷内容抓取增强
- `QUESTIONNAIRE_CONTENT_SYNC.md` - 问卷内容同步功能

## 总结

### 改进内容

1. ✅ 从函数源码中提取原选项
2. ✅ 清晰显示原选项和新选项的对比
3. ✅ 添加容错处理
4. ✅ 提供更好的调试信息

### 改进效果

- ✅ 提高日志可读性
- ✅ 便于问题排查
- ✅ 确认更新正确性
- ✅ 追踪选项变化

现在日志能够清楚地显示原选项和新选项的对比了！🎉
