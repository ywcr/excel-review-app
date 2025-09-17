# API 模式使用说明

## 🚀 概述

API 模式是统一自动化脚本的新功能，通过直接调用后端 API 接口来创建问卷，相比 DOM 模式具有以下优势：

- **速度更快**：无需等待页面加载和 DOM 操作
- **更稳定**：不依赖页面结构变化
- **批量处理**：适合大量数据的自动化处理
- **资源占用少**：减少浏览器资源消耗

## 📋 支持的问卷类型

目前 API 模式支持以下问卷类型：

- 西黄消费者问卷
- 牛解消费者问卷
- 知柏消费者问卷
- 六味患者问卷
- 贴膏患者问卷

## 🔧 使用方法

### 1. 启用 API 模式

在统一自动化脚本界面中：

1. 勾选"🚀 使用 API 模式"复选框
2. 选择问卷类型
3. 上传 Excel 数据文件
4. 选择指派人 and 日期
5. 点击"生成当前日期自动化代码"或"生成所有日期自动化代码"

### 2. 生成的 API 代码功能

API 模式生成的代码包含以下主要函数：

#### 基础执行函数

- `startApi()` - 手动执行单个任务（API 模式）
- `automaticApi()` - 基础自动执行（API 模式）
- `automaticApi(startIndex, maxNum)` - 从指定索引开始，最多执行 maxNum 次

#### 按日期执行函数

- `automaticByDateApi()` - 按日期顺序执行所有日期（API 模式）
- `automaticByDateApi('MM.DD')` - 从指定日期开始按顺序执行

#### 控制函数

- `pauseAutomatic()` - 暂停自动执行
- `resumeAutomatic()` - 恢复自动执行
- `stopAutomatic()` - 停止自动执行
- `getExecutionStatus()` - 查看执行状态

### 3. 执行步骤

1. **复制代码**：点击生成的代码区域中的"📋 复制代码"按钮
2. **打开问卷页面**：进入问卷创建页面
3. **打开控制台**：按 F12 键，切换到 Console 标签
4. **粘贴执行**：粘贴代码（Ctrl+V）并按回车
5. **开始自动化**：根据控制台提示调用相应函数

## 🔍 API 请求流程

API 模式基于您提供的 API 请求结构实现：

### 1. 获取动态盐值

```javascript
GET /lgb/payMerge/createDynamicsSalt?methodName=%2Fxfzwj%2Fadd
```

### 2. 提交问卷数据

```javascript
POST /lgb/xfzwj/add
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
```

### 3. 请求参数

- `projectId`: 项目 ID（从 URL 获取或使用默认值）
- `corpId`: 企业 ID
- `dcdxName`: 调查对象姓名
- `fill`: 性别
- `questions`: 问题列表
- `options`: 选项列表
- `answers`: 答案列表
- `sign`: 签名
- `signkey`: 签名密钥

## ⚠️ 注意事项

### 1. 签名算法

API 模式中的签名算法基于以下流程：

1. **获取动态盐值**：调用 `/lgb/payMerge/createDynamicsSalt` 获取 `signkey`
2. **生成签名**：使用 `signkey` 和请求数据生成 `sign` 签名
3. **提交请求**：在请求头中传递 `sign` 和 `signkey`

```javascript
function generateSign(data, signkey) {
  // 使用MD5哈希算法生成签名
  // 优先使用CryptoJS库，如果不可用则使用备用实现
  const signString = data + signkey;

  if (typeof CryptoJS !== "undefined" && CryptoJS.MD5) {
    return CryptoJS.MD5(signString).toString();
  } else {
    // 备用MD5实现
    return simpleMD5(signString);
  }
}
```

**注意**：如果您的后端使用不同的签名算法，请修改 `generateSign` 函数。

### 2. 项目 ID 获取

代码会自动从 URL 中获取项目 ID，如果获取失败会使用默认值：

```javascript
const PROJECT_ID = getProjectIdFromUrl() || "1756460958725101";
```

### 3. 错误处理

API 模式包含完整的错误处理机制，会在控制台显示详细的错误信息。

## 📊 性能对比

| 特性     | DOM 模式                 | API 模式            |
| -------- | ------------------------ | ------------------- |
| 执行速度 | 较慢（需要等待页面加载） | 快（直接 API 调用） |
| 稳定性   | 依赖页面结构             | 高（不依赖页面）    |
| 资源占用 | 高（需要渲染页面）       | 低（纯 API 调用）   |
| 批量处理 | 适合小批量               | 适合大批量          |
| 调试难度 | 中等                     | 简单                |

## 🛠️ 故障排除

### 1. 签名验证失败

- 检查签名算法是否正确实现
- 确认 signkey 获取是否成功

### 2. 项目 ID 错误

- 确认 URL 中包含正确的 projectId 参数
- 检查默认项目 ID 是否正确

### 3. 网络请求失败

- 检查网络连接
- 确认 API 接口地址是否正确
- 检查请求头信息是否完整

### 4. 数据格式错误

- 确认 Excel 数据格式正确
- 检查姓名和性别字段是否存在
- 验证日期格式是否正确

## 📝 更新日志

- **v1.0.0** - 初始版本，支持西黄消费者问卷 API 模式
- 后续版本将支持更多问卷类型的 API 模式

## 🤝 技术支持

如果您在使用 API 模式时遇到问题，请：

1. 检查浏览器控制台的错误信息
2. 确认 API 接口是否正常工作
3. 验证数据格式是否正确
4. 联系技术支持团队

---

**注意**：API 模式目前处于开发阶段，建议在生产环境中使用前进行充分测试。
