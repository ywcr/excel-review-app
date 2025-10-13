# 文档索引

本目录包含 Excel 审核应用的各类文档。

## 📁 文档分类

### 拜访时长验证相关文档

#### 用户文档
- **[拜访时长格式快速参考](./DURATION_QUICK_REFERENCE.md)** ⭐ 推荐
  - 一页纸快速参考卡
  - 包含所有支持的格式示例
  - 适合快速查阅

- **[拜访时长填写格式指南](./DURATION_FORMAT_GUIDE.md)**
  - 详细的用户使用指南
  - 包含常见问题解答
  - 适合完整了解功能

#### 技术文档（位于根目录）
- **[拜访时长验证增强功能说明](../DURATION_VALIDATION_ENHANCEMENT.md)**
  - 技术实现细节
  - 测试验证结果
  - 适合开发人员参考

- **[拜访时长验证问题修复总结](../DURATION_FIX_SUMMARY.md)**
  - 问题描述和解决方案
  - 修改文件清单
  - 部署说明和回滚计划
  - 适合项目管理和运维人员

## 🧪 测试和验证

### 测试文件
- **单元测试**: `src/lib/__tests__/durationParser.test.ts`
- **验证脚本**: `scripts/testDurationParser.js`

### 运行测试
```bash
# 运行功能验证脚本
node scripts/testDurationParser.js

# 运行类型检查
npm run type-check
```

## 📝 快速开始

### 我是用户
👉 直接查看 [拜访时长格式快速参考](./DURATION_QUICK_REFERENCE.md)

### 我是开发者
👉 查看 [拜访时长验证增强功能说明](../DURATION_VALIDATION_ENHANCEMENT.md)

### 我是项目管理/运维人员
👉 查看 [拜访时长验证问题修复总结](../DURATION_FIX_SUMMARY.md)

## 🔗 相关代码

### 核心文件
- `src/lib/frontendValidator.ts` - 前端验证逻辑
- `public/validation-worker.js` - Worker 线程验证逻辑
- `src/lib/validationRules.ts` - 验证规则定义

### 关键函数
- `parseDuration()` - 时长解析函数
- `isValidDuration()` - 时长验证函数

## 📊 功能特性

✅ 支持纯数字格式（如：`60`）  
✅ 支持中文单位（如：`60分钟`、`1小时`）  
✅ 支持英文单位（如：`60min`、`1hour`）  
✅ 支持复合格式（如：`1小时30分钟`、`1h30m`）  
✅ 自动单位转换（小时 → 分钟）  
✅ 空格容错  
✅ 大小写不敏感  
✅ 完全向后兼容  

## 💡 其他文档

更多文档正在建设中...

---

**最后更新**: 2025-10-13  
**版本**: 1.0  
**维护者**: 开发团队
