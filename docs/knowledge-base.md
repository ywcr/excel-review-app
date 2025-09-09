## Excel Review App 知识库

### 1. 项目概览

- **名称**: excel-review-app
- **定位**: 基于 Next.js 的 Excel 文件验证与审查工具，支持任务模板解析、数据验证、图片清晰度/重复检测与错误导出。
- **主要特性**:
  - Excel 文件上传与工作表智能选择
  - 基于任务模板的字段映射与验证规则
  - 跨行规则：唯一性、频次、日期间隔等
  - 图片质量检测与视觉重复识别
  - 认证与会话管理（手机号 + 验证码 + JWT）

### 2. 技术栈与依赖

- **框架**: Next.js 15（App Router）
- **语言**: TypeScript
- **UI**: React 19 + Tailwind CSS 4
- **Excel/处理**: xlsx, exceljs, jszip
- **图像处理**: sharp, jimp, blockhash-core, tesseract.js（如需 OCR）
- **认证**: jose（JWT）

scripts（package.json）:

- dev: 本地开发
- build/start: 构建/启动生产
- lint: 代码检查
- strict-check/type-check: 内部脚本与类型检查

### 3. 目录结构

- `src/app`:
  - `api/validate/route.ts`: 服务器端 Excel 验证入口（POST 文件 + 任务名 + 可选表名；GET 模板与服务项）。
  - `api/tasks/route.ts`: 获取可用任务列表。
  - `api/templates/validate/route.ts`: 模板缓存与校验管理（GET/POST 多动作）。
  - `api/test/*`: 调试接口（模板文件可读性与模板加载）。
  - `api/auth/*`: 认证相关接口（发送验证码、登录、登出、会话检测、获取用户）。
  - 其他页面：`page.tsx`、`server-validation/page.tsx`、`auth/*`。
- `src/components`:
  - `FileUpload.tsx`、`SheetSelector.tsx`、`TaskSelector.tsx`、`ValidationRequirements.tsx`、`ValidationResults.tsx` 等。
- `src/lib`:
  - `validator.ts`: 后端核心验证器（工作表智能匹配、表头映射、逐行/跨行规则、图片验证的桥接）。
  - `frontendValidator.ts`: 前端轻量验证器（表头/行级 + 基础跨行规则）。
  - `imageValidator.ts`、`frontendImageValidator.ts`、`wasmImageProcessor.ts`: 图片处理与质量/重复检测。
  - `templateParser.ts`、`templateManager.ts`、`validationRules.ts`、`embeddedTemplates.ts`: 模板解析、缓存管理、统一规则。
  - `exportErrors.ts`: 错误导出为 Excel。
  - `auth/*`: JWT、验证码、文件存储模拟、用户与会话工具。

### 4. 验证流程（Pipeline）

1. 前端：
   - 选择任务 -> 上传 Excel -> 若匹配失败提示选择工作表。
   - 可使用 `FrontendExcelValidator` 做表头与基础数据预检。
2. 服务端：
   - `POST /api/validate` 接收文件与 `taskName`、`selectedSheet`。
   - 通过 `getTaskTemplate(taskName)` 获取模板，构造 `ExcelValidator`。
   - 核心步骤：
     - 仅解析工作表名，按优先级尝试匹配（任务别名、数据清单变体、模板名、常见回退）。
     - 读取目标表 -> `sheet_to_json` 转二维数组。
     - 识别表头行 -> 构建 `headerMap`（含多模板字段映射与上下文后缀）。
     - 逐行验证：required, enum, timeRange, duration, dateFormat, prohibitedContent 等。
     - 跨行验证：unique, minValue, duration, timeRange, frequency, dateInterval, medicalLevel 等。
     - 图片验证：调用 `ImageValidator.validateImages`（模糊与重复检测）。
   - 返回 `ValidationResult` 汇总：行数、有效行数、错误数、图片验证摘要。

关键类型（后端 `validator.ts`）示例：

```ts
interface ValidationError {
  sheet: string;
  row: number;
  column: string;
  field: string;
  errorType: string;
  message: string;
  value?: any;
}
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  summary: { totalRows: number; validRows: number; errorCount: number };
  imageValidation?: ImageValidationResult;
}
```

### 5. 模板与规则

- 来源：`validationRules.ts` 与 `templateParser.ts`（从 `public/data/模板总汇.xlsx` 或内置模板加载）。
- 任务示例：医院拜访、药店拜访、消费者/患者/店员/药店调研、培训会、科室会等。
- 字段映射：`createHeaderMap` 支持多别名、换行标题、任务上下文后缀（\_hospital/\_pharmacy）。
- 常见规则：
  - required/enum/dateFormat/timeRange/duration/minValue
  - unique/frequency/dateInterval/medicalLevel

### 6. API 一览与请求示例

- `POST /api/validate`
  - form-data: file, taskName, selectedSheet?
  - 200: `{ success, fileName, taskName, validation }`
  - 400: `SHEET_NOT_FOUND` 时返回 `{ error, message, availableSheets, taskName }`
- `GET /api/validate`
  - 200: `{ success, services, templates: [{ name, serviceCategory, serviceItem, requirements, validationRules: [{ field, type, message }] }] }`
- `GET /api/tasks`
  - 200: `{ success, tasks }`
- `GET /api/templates/validate?taskName=...`
  - 200: `{ taskName, validation, cache, timestamp }`
- `POST /api/templates/validate`
  - body: `{ action: 'preload'|'clearCache'|'updateConfig'|'validateAll', ... }`
- 认证相关：
  - `POST /api/auth/send-code` { phone }
  - `POST /api/auth/signin` { phone, code, forceLogout?, adminLogin? }
  - `POST /api/auth/check-session` { phone }
  - `GET /api/auth/me`
  - `POST /api/auth/signout`

### 7. UI 组件与交互

- `FileUpload.tsx`: 文件选择与上传。
- `TaskSelector.tsx`: 任务选择。
- `SheetSelector.tsx`/`FrontendSheetSelector.tsx`: 工作表选择与前端预检。
- `ValidationRequirements.tsx`: 展示任务要求。
- `ValidationResults.tsx`: 展示摘要、分页错误表格、错误筛选、图片问题详情、导出按钮。
- `EnhancedErrorDisplay.tsx`: 更丰富的错误呈现。

### 8. Hooks

- `useAuth.tsx`: 登录状态、用户信息、登出等。
- `useFrontendValidation.ts`: 前端解析与验证（表头/行级 + 简化跨行）。

### 9. 开发与调试

- 本地运行：`npm i && npm run dev`
- 测试/调试脚本：`scripts/*` 与根目录测试 HTML（如 `test-sheet-selection.html`）。
- 关键调试文档：根目录多份 `*_REPORT.md` 与 `*_FIX.md`。

### 10. 常见问题

- SHEET_NOT_FOUND：接口返回可用工作表列表与尝试名称；前端提示选择。
- 大数据量与复杂表：已做异常与行数上限保护（默认 50,000 行）。
- JWT 密钥：生产必须设置强 `JWT_SECRET`，当前默认仅用于开发。

### 11. 重要文件导航

- `src/lib/validator.ts`
- `src/lib/frontendValidator.ts`
- `src/app/api/validate/route.ts`
- `src/components/ValidationResults.tsx`
- `src/lib/templateParser.ts`、`src/lib/templateManager.ts`、`src/lib/validationRules.ts`
- `src/lib/auth/*`
