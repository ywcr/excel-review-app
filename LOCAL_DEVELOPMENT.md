# 本地开发环境配置

## 🚨 为什么本地发现不了部署时的错误？

### 主要原因

1. **TypeScript 检查级别**
   - `next dev`: 增量检查，较宽松
   - `next build`: 完整严格检查

2. **ESLint 运行时机**
   - 本地: 通常只在保存时运行
   - 部署: 完整项目检查

3. **依赖解析**
   - 本地: 可能使用缓存
   - 部署: 全新安装

## 🛠️ 本地严格检查方案

### 1. 运行严格检查脚本
```bash
# 模拟生产环境的完整检查
npm run strict-check

# 仅 TypeScript 类型检查
npm run type-check

# 仅 ESLint 检查
npm run lint
```

### 2. IDE 配置建议

#### VS Code 设置
在 `.vscode/settings.json` 中添加：
```json
{
  "typescript.preferences.strictFunctionTypes": true,
  "typescript.preferences.strictNullChecks": true,
  "eslint.run": "onSave",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

#### TypeScript 严格模式
确保 `tsconfig.json` 包含：
```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 3. 预提交检查

建议在提交前运行：
```bash
# 完整检查
npm run strict-check

# 或分步检查
npm run type-check
npm run lint
npm run build
```

## 🔧 常见问题修复

### TypeScript 错误
- 使用严格的类型定义
- 避免 `any` 类型
- 正确处理 `null` 和 `undefined`

### ESLint 错误
- 移除未使用的导入
- 使用正确的 React 语法
- 遵循代码风格规范

## 📋 检查清单

部署前确保：
- [ ] `npm run type-check` 通过
- [ ] `npm run lint` 通过  
- [ ] `npm run build` 成功
- [ ] 所有测试通过
- [ ] 依赖警告已处理

## 🎯 最佳实践

1. **定期运行严格检查**: 每天至少一次
2. **提交前检查**: 避免部署时发现问题
3. **IDE 配置**: 启用实时类型检查
4. **团队规范**: 统一开发环境配置
