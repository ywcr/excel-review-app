# 精灵蜂统一自动化脚本 - 模块化版本

## 项目概述

这是一个用于自动化问卷创建的 Web 应用程序，支持多种问卷类型（六味患者、西黄消费者、牛解消费者、知柏消费者、贴膏患者），具有 Excel 文件上传、数据解析、智能 Sheet 匹配等功能。

## 文件结构

```
├── README.md                           # 项目说明文档
├── style.css                          # 样式文件
├── 统一自动化脚本.html                  # 原始单文件版本
├── 统一自动化脚本_拆分版.html           # 基础拆分版本
├── 统一自动化脚本_模块化版.html         # 模块化版本（推荐使用）
├── script.js                          # 基础拆分的JavaScript文件
└── js/                                # 模块化JavaScript文件目录
    ├── config.js                      # 配置文件
    ├── utils.js                       # 工具函数库
    ├── data-processor.js              # 数据处理模块
    ├── ui-manager.js                  # UI管理模块
    ├── sheet-selector.js              # Sheet选择模块
    ├── automation-generator.js        # 自动化代码生成模块
    └── main.js                        # 主应用程序
```

## 模块说明

### 1. config.js - 配置模块

- **功能**: 存储所有配置信息
- **内容**:
  - 问卷类型配置
  - API 端点配置
  - 产品关键词配置
  - 默认设置

### 2. utils.js - 工具函数库

- **功能**: 提供通用工具类和函数
- **包含类**:
  - `Logger` - 日志管理
  - `Toast` - 通知提示
  - `Storage` - 本地存储
  - `DOMUtils` - DOM 操作
  - `Validator` - 数据验证
  - `ArrayUtils` - 数组工具
  - `StringUtils` - 字符串工具

### 3. data-processor.js - 数据处理模块

- **功能**: 处理 Excel 文件和数据解析
- **包含类**:
  - `ExcelProcessor` - Excel 文件处理
  - `SheetMatcher` - Sheet 智能匹配
  - `DataParser` - 数据解析器

### 4. ui-manager.js - UI 管理模块

- **功能**: 管理用户界面组件
- **包含类**:
  - `QuestionnaireTypeSelector` - 问卷类型选择器
  - `FileUploader` - 文件上传器
  - `DataPreviewer` - 数据预览器
  - `AssigneeManager` - 指派人管理器
  - `DateManager` - 日期管理器
  - `ModalManager` - 模态框管理器

### 5. sheet-selector.js - Sheet 选择模块

- **功能**: 处理 Excel 工作表选择
- **包含类**:
  - `SheetSelector` - Sheet 选择器
  - `SheetPreferenceManager` - Sheet 偏好管理器

### 6. automation-generator.js - 自动化代码生成模块

- **功能**: 生成问卷自动化执行代码
- **包含类**:
  - `AutomationCodeGenerator` - 自动化代码生成器

### 7. main.js - 主应用程序

- **功能**: 应用程序入口和核心逻辑
- **包含类**:
  - `AutomationApp` - 主应用程序类

## 使用方法

### 基本使用流程

1. 打开 `统一自动化脚本_模块化版.html`
2. 选择问卷类型
3. 上传 Excel 文件
4. 选择指派人和日期
5. 点击创建问卷

### 控制台命令

- `showHelp()` - 显示帮助信息
- `clearSheetPreferences()` - 清除 Sheet 选择偏好

### 自动化执行命令（在生成的代码中使用）

- `start()` - 手动执行单个任务
- `automatic()` - 基础自动执行
- `automatic(startIndex, maxNum)` - 从指定索引开始执行
- `automaticByDate('MM.DD')` - 按日期顺序执行
- `automaticByName('姓名')` - 按姓名顺序执行
- `pauseAutomatic()` - 暂停自动执行
- `resumeAutomatic()` - 恢复自动执行
- `getExecutionStatus()` - 查看执行状态

## 功能特性

### ✅ 已实现功能

- 📋 多种问卷类型支持（西黄消费者、牛解消费者、知柏消费者、六味患者、贴膏患者）
- 📁 Excel 文件拖拽上传
- 🔍 智能 Sheet 匹配
- 💾 Sheet 选择偏好记忆
- 👥 指派人管理
- 📅 日期管理
- 📊 数据预览
- 🔧 模块化架构
- 📝 完整的日志系统
- 🎨 响应式 UI 设计
- 🤖 **自动化代码生成** - 根据问卷类型生成完整的自动化执行代码
- 📋 **智能答题逻辑** - 每种问卷类型都有专门的答题策略
- 👥 **联系人自动创建** - 支持患者/消费者的自动创建
- 🏥 **医院管理** - 支持医院信息的自动创建（部分问卷类型）
- 📝 **批量问卷创建** - 支持单日期和全日期的批量创建

### 🚧 开发中功能

- 🚀 API 模式支持
- 🔍 高级数据验证工具
- 📊 更多统计分析功能

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **第三方库**:
  - XLSX.js (Excel 文件处理)
  - jQuery (DOM 操作)
- **架构**: 模块化设计，面向对象编程

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 开发说明

### 添加新功能

1. 在相应的模块文件中添加新的类或方法
2. 在 `main.js` 中集成新功能
3. 更新配置文件（如需要）
4. 测试功能完整性

### 自定义配置

修改 `js/config.js` 文件中的配置项：

- 添加新的问卷类型
- 修改 API 端点
- 调整默认设置

### 样式定制

修改 `style.css` 文件来自定义界面样式。

## 版本历史

- **v3.0** - 模块化重构版本
- **v2.0** - 基础拆分版本
- **v1.0** - 原始单文件版本

## 许可证

本项目仅供内部使用。

## 联系方式

如有问题或建议，请联系开发团队。
