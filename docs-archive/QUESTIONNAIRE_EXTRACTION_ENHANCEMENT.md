# 问卷内容抓取增强

## 修复日期

2025-10-05

## 问题描述

用户在使用验证遗漏功能（`updateWithMissing()`）时发现：

- 抓取问卷内容返回 0 个问题
- 导致使用默认配置的答案选项
- 默认选项与实际页面选项不匹配，出现大量错误：
  ```
  第0个问题：未找到选项值为"21~34 岁"的元素
  第1个问题：未找到选项值为"价格实惠"的元素
  ...
  ```

## 问题分析

### 原有抓取逻辑

```javascript
function extractQuestionOptionsFromPage() {
  const mainElements = contentWindow.document.querySelectorAll(".main");
  if (mainElements.length < 2) {
    console.warn("⚠️ 页面结构异常：找不到足够的.main元素");
    return null;
  }
  // 从 DOM 结构抓取...
}
```

**问题**：

1. 只依赖 DOM 结构（`.main` 元素）
2. 在验证遗漏功能执行时，可能不在问卷填写页面
3. 如果页面未加载完整或结构不符合预期，返回 null
4. 没有备用方案

### 参考实现分析

从 `西黄消费者问卷 平晓 （无渠道）.html` 可以看到（第 392-396 行）：

```javascript
const questions = getValueFromIframe("questions");
const options = getValueFromIframe("options");
const types = getValueFromIframe("types");
```

这些隐藏字段包含了完整的问卷定义，格式为：

- `questions`: 问题列表，用 `#` 分隔
- `options`: 选项列表，用 `#` 分隔问题，用 `|` 分隔每个问题的选项
- `types`: 问题类型（单选/多选）

## 解决方案

### 双重抓取策略

实现两种抓取方法，按优先级尝试：

1. **方法 1：从 DOM 结构抓取**（优先）
   - 当在问卷填写页面时使用
   - 直接从表单元素获取最准确的数据
2. **方法 2：从隐藏字段抓取**（备用）
   - 当 DOM 结构不可用时使用
   - 从 `input[name="questions"]` 和 `input[name="options"]` 读取
   - 解析格式化的字符串

### 实现代码

#### DOM 模式和 API 模式（两处相同修改）

```javascript
function extractQuestionOptionsFromPage() {
    try {
        console.log('🔍 开始从页面抓取问卷选项...');

        const contentWindow = document.querySelector('#ssfwIframe')?.contentWindow ?? window;

        // 方法1: 尝试从DOM结构抓取（当在问卷填写页面时）
        const mainElements = contentWindow.document.querySelectorAll('.main');
        if (mainElements.length >= 2) {
            const questionItems = mainElements[1].querySelectorAll('.layui-form-item');
            const extractedQuestions = [];

            questionItems.forEach((item, index) => {
                try {
                    const labelElement = item.querySelector('label');
                    const questionTitle = labelElement ? labelElement.innerText.trim() : '';

                    const options = [];
                    const inputElements = item.querySelectorAll('input[type="radio"], input[type="checkbox"]');

                    inputElements.forEach(input => {
                        const value = input.value;
                        if (value && value.trim()) {
                            options.push(value.trim());
                        }
                    });

                    if (questionTitle && options.length > 0) {
                        extractedQuestions.push({
                            index: index,
                            title: questionTitle,
                            options: options
                        });
                        console.log(\`  问题 \${index}: \${questionTitle}\`);
                        console.log(\`    选项: [\${options.join(', ')}]\`);
                    }
                } catch (error) {
                    console.warn(\`⚠️ 解析问题 \${index} 时出错:\`, error);
                }
            });

            if (extractedQuestions.length > 0) {
                console.log(\`✅ 从DOM结构成功抓取 \${extractedQuestions.length} 个问题\`);
                return extractedQuestions;
            }
        }

        // 方法2: 尝试从隐藏字段抓取（备用方案）
        console.log('🔄 尝试从隐藏字段抓取问卷定义...');
        const questionsInput = contentWindow.document.querySelector('input[name="questions"]');
        const optionsInput = contentWindow.document.querySelector('input[name="options"]');

        if (questionsInput && optionsInput) {
            const questionsValue = questionsInput.value;
            const optionsValue = optionsInput.value;

            if (questionsValue && optionsValue) {
                // 解析问题和选项（格式：问题用#分隔，选项用#分隔，每个问题的选项用|分隔）
                const questions = questionsValue.split('#');
                const optionsGroups = optionsValue.split('#');

                const extractedQuestions = [];
                questions.forEach((question, index) => {
                    if (question && optionsGroups[index]) {
                        const options = optionsGroups[index].split('|').filter(opt => opt.trim());
                        if (options.length > 0) {
                            extractedQuestions.push({
                                index: index,
                                title: question.trim(),
                                options: options.map(opt => opt.trim())
                            });
                            console.log(\`  问题 \${index}: \${question.trim()}\`);
                            console.log(\`    选项: [\${options.join(', ')}]\`);
                        }
                    }
                });

                if (extractedQuestions.length > 0) {
                    console.log(\`✅ 从隐藏字段成功抓取 \${extractedQuestions.length} 个问题\`);
                    return extractedQuestions;
                }
            }
        }

        console.warn('⚠️ 未能从页面抓取到问卷内容');
        console.log(\`✅ 成功抓取 0 个问题\`);
        return null;
    } catch (error) {
        console.error('❌ 抓取问卷选项失败:', error);
        return null;
    }
}
```

## 数据格式说明

### 隐藏字段格式

**questions 字段**:

```
您的年龄？#您的职业？#您一般购买牛黄解毒丸的渠道是？
```

**options 字段**:

```
20岁以下|20-35岁|35-45岁|45-60岁|60岁以上#学生|企业或公司职工|政府工作人员#网上购买|等级医院|药店
```

### 解析后的数据结构

```javascript
[
  {
    index: 0,
    title: "您的年龄？",
    options: ["20岁以下", "20-35岁", "35-45岁", "45-60岁", "60岁以上"],
  },
  {
    index: 1,
    title: "您的职业？",
    options: ["学生", "企业或公司职工", "政府工作人员"],
  },
  {
    index: 2,
    title: "您一般购买牛黄解毒丸的渠道是？",
    options: ["网上购买", "等级医院", "药店"],
  },
];
```

## 抓取流程

```
extractQuestionOptionsFromPage() 调用
    ↓
尝试方法1：从 DOM 结构抓取
    ├─ 查找 .main 元素
    ├─ 遍历 .layui-form-item
    ├─ 提取问题标题和选项
    └─ 成功？→ 返回结果 ✅
    ↓ 失败
尝试方法2：从隐藏字段抓取
    ├─ 查找 input[name="questions"]
    ├─ 查找 input[name="options"]
    ├─ 解析 # 和 | 分隔的字符串
    └─ 成功？→ 返回结果 ✅
    ↓ 失败
返回 null，使用默认配置 ⚠️
```

## 修复效果

### 修复前

```
🔍 开始从页面抓取问卷选项...
⚠️ 页面结构异常：找不到足够的.main元素
✅ 成功抓取 0 个问题
⚠️ 没有抓取到问卷内容，使用默认配置

// 执行时出现大量错误
第0个问题：未找到选项值为"21~34 岁"的元素
第1个问题：未找到选项值为"价格实惠"的元素
...
```

### 修复后

```
🔍 开始从页面抓取问卷选项...
🔄 尝试从隐藏字段抓取问卷定义...
  问题 0: 您的年龄？
    选项: [20岁以下, 20-35岁, 35-45岁, 45-60岁, 60岁以上]
  问题 1: 您的职业？
    选项: [学生, 企业或公司职工, 政府工作人员, 医药专业人士, 个体户]
  ...
✅ 从隐藏字段成功抓取 10 个问题
✅ 问卷内容已更新为网站最新版本

// 执行成功，无错误
✅ 已提交: 元艳天 (女) - 2025-09-11
```

## 适用场景

### 场景 1: 在问卷填写页面执行

- 使用方法 1（DOM 结构）
- 获取最准确的实时数据
- 包括动态加载的选项

### 场景 2: 在其他页面执行验证遗漏

- 使用方法 2（隐藏字段）
- 即使不在问卷页面也能获取定义
- 确保补充数据使用正确选项

### 场景 3: 页面加载不完整

- 方法 1 失败时自动切换到方法 2
- 提高抓取成功率
- 减少使用默认配置的情况

## 兼容性

### 向后兼容

- ✅ 保持原有 DOM 抓取逻辑
- ✅ 新增备用方案不影响现有功能
- ✅ 返回数据结构保持一致

### 跨页面兼容

- ✅ 问卷填写页面 - 使用 DOM 抓取
- ✅ 列表页面 - 使用隐藏字段抓取
- ✅ iframe 内外 - 自动检测 contentWindow

## 测试建议

### 测试场景 1: DOM 抓取成功

```javascript
// 1. 进入问卷填写页面
// 2. 执行 initializeQuestionnaireContent()
// 预期: 从 DOM 结构成功抓取 N 个问题
```

### 测试场景 2: 隐藏字段抓取

```javascript
// 1. 在列表页面或其他页面
// 2. 执行 updateWithMissing()
// 预期: 从隐藏字段成功抓取问卷定义
```

### 测试场景 3: 两种方法都失败

```javascript
// 1. 在没有问卷相关元素的页面
// 2. 执行抓取函数
// 预期: 返回 null，使用默认配置，记录警告日志
```

## 修改文件清单

### Public 目录

1. ✅ `/public/automation/js/automation/template-manager.js` - DOM 模式抓取函数
2. ✅ `/public/automation/js/automation/template-manager.js` - API 模式抓取函数（同一文件两处）

### HTML 目录（同步）

3. ✅ `/html/js/automation/template-manager.js`

## 相关文档

- `QUESTIONNAIRE_CONTENT_SYNC.md` - 问卷内容同步功能
- `VALIDATION_MISSING_DATA_FIX.md` - 验证遗漏功能修复
- `VALIDATION_API_FIX.md` - 验证 API 修复

## 总结

### 核心改进

1. ✅ **双重抓取策略** - DOM 结构 + 隐藏字段
2. ✅ **提高成功率** - 即使不在问卷页面也能抓取
3. ✅ **减少错误** - 避免使用不匹配的默认选项
4. ✅ **向后兼容** - 保持原有逻辑，新增备用方案

### 解决的问题

- ✅ 验证遗漏功能抓取失败
- ✅ 选项值不匹配错误
- ✅ 跨页面执行问题
- ✅ 页面加载不完整情况

### 覆盖范围

- ✅ DOM 模式问卷内容抓取
- ✅ API 模式问卷内容抓取
- ✅ 验证遗漏功能执行
- ✅ 所有创建任务场景

现在问卷内容抓取更加健壮，能够适应各种执行场景！🎉
