# 代码优化快速参考

## 🎯 优化成果

### 三项优化

1. ✅ **签名工具库提取** - 减少 ~95 行/问卷
2. ✅ **启动提示简化** - 从 23 行减少到 2 行
3. ✅ **控制面板保留** - 按用户要求必须存在

### 总收益

- **单个问卷**: -116 行 (-6.9%)
- **5 个问卷**: -505 行 (-6.0%)
- **控制台**: 启动更简洁，按需查看帮助

---

## 🚀 快速开始

### 在问卷自动化页面使用（推荐）

1. 打开 `/questionnaire-automation` 页面
2. 上传 Excel，选择问卷类型
3. 点击"生成自动化代码"
4. 代码会**自动使用**外部签名工具库

**识别方法**：控制台显示

```
✅ 使用外部签名工具库 (v1.0.0)
```

---

### 在其他页面使用

**方式 1：加载工具库（推荐）**

```javascript
// 1. 加载签名工具库
const script = document.createElement("script");
script.src = "/automation/js/automation-sign-utils.js";
document.head.appendChild(script);

// 2. 等待加载完成
script.onload = function () {
  // 粘贴生成的代码...
};
```

**方式 2：直接使用（向后兼容）**

```javascript
// 直接粘贴代码，会自动降级到内联模式
// 控制台提示：⚠️ 未检测到签名工具库，使用内联定义
```

---

## 📖 新增功能

### help() 命令

代码加载后，输入 `help()` 查看所有命令：

```javascript
help();
```

输出分类展示：

- 📝 问卷执行
- 👥 联系人管理
- ⚙️ 执行配置
- 🎮 执行控制
- 🔍 数据验证

---

## 🔍 检查工具库状态

```javascript
// 检查是否加载
typeof AutomationSignUtils !== "undefined"; // true = 已加载

// 查看版本
AutomationSignUtils.version; // "1.0.0"

// 检查依赖
AutomationSignUtils.checkDependencies(); // true = 依赖正常
```

---

## 📂 文件位置

| 文件       | 路径                                                   | 说明   |
| ---------- | ------------------------------------------------------ | ------ |
| 签名工具库 | `/public/automation/js/automation-sign-utils.js`       | 新增   |
| 模板管理器 | `/public/automation/js/automation/template-manager.js` | 已修改 |
| 页面组件   | `/src/app/questionnaire-automation/page.tsx`           | 已修改 |

---

## 🎨 启动提示对比

### 优化前（23 行）

```
🎉 自动化代码加载成功！
可用命令:
  • startAddContact(起始位置) - 创建联系人...
  • startAddContactFast(...) - 快速创建...
  • startApi(...) - 手动执行...
  ... 共 23 行
```

### 优化后（2 行 + help()）

```
🎉 自动化代码加载成功！
💡 输入 help() 查看所有可用命令
```

输入 `help()` 后显示完整命令列表（分类整理）

---

## ✅ 兼容性

- ✅ 旧代码仍然可用
- ✅ 新旧代码可混用
- ✅ 自动降级机制
- ✅ 零破坏性变更

---

## 📊 优化对比

| 项目     | 优化前           | 优化后          | 改进        |
| -------- | ---------------- | --------------- | ----------- |
| 签名工具 | 每个问卷 ~100 行 | 共享 1 次       | -95 行/问卷 |
| 启动提示 | 23 行            | 2 行            | -21 行      |
| 控制台   | 启动时显示全部   | 按需查看 help() | 更简洁      |

---

## 🔗 详细文档

- [完整优化总结](./CODE_OPTIMIZATION_SUMMARY.md)
- [冗余分析报告](./CODE_REDUNDANCY_ANALYSIS.md)

---

**提示**: 在问卷自动化页面使用可获得最佳体验！
