# 归档文件目录

此目录包含已归档的测试文件、遗留代码和测试文档。这些文件已从主代码目录移出，以避免与活跃代码混淆。

## 目录结构

```
_archive/
├── tests/          # 单元测试文件
│   └── __tests__/  # Jest 测试目录
├── legacy/         # 遗留/未使用的代码
│   ├── frontendValidator.ts  # 未被使用的验证器类
│   └── test-types.ts
├── test-files/     # 测试用 Excel 和 HTML 文件
├── scripts/        # 测试脚本
│   ├── test_validation.js
│   ├── createTestExcelFiles.js
│   └── ...
└── docs/           # 测试相关文档
    ├── QUICK_TEST_GUIDE.md
    ├── WATERMARK_TEST_RESULTS_AND_OPTIMIZATIONS.md
    └── ...
```

## 重要说明

### `frontendValidator.ts`

此文件定义了 `FrontendExcelValidator` 类，**但实际验证逻辑由 `public/validation-worker.js` 执行**。
保留此文件是为了将来可能的重用或参考。

### 测试脚本

如需运行测试，请先将相关文件恢复到原位置。

## 归档日期

2025-12-26
