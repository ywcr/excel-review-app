# 快速集成示例 - 高级水印检测

## 最简单的集成方法（推荐）

只需3步即可启用高级检测！

### 步骤1: 在 validation-worker.js 末尾添加一行

找到 `validation-worker.js` 文件的末尾，添加：

```javascript
// 在文件最后一行添加（大约第4777行之后）
importScripts('advanced-watermark-detection.js');
```

### 步骤2: 修改水印检测调用（可选）

如果你想使用高级检测替换原有检测，在 `validation-worker.js` 的第 2359 行附近：

```javascript
// 原代码（第 2359 行）：
const watermarkInfo = await detectWatermark(image.data);

// 改为：
const watermarkInfo = await detectWatermarkAdvanced(image.data);
```

### 步骤3: 验证效果

运行应用，打开浏览器控制台，查看输出：

```
[水印检测] 开始高级检测流程...
[水印检测] 执行像素级分析...
[水印检测] 分析结果: {frequency: 15, gradient: 45, texture: 30, ...}
[水印检测] 完成！耗时: 180ms, 置信度: 42.50
```

---

## 方案对比

### 方案A: 保持双检测系统（推荐测试阶段）

保留原有的基础检测，同时支持高级检测，让用户选择：

```javascript
// 在 validation-worker.js 中修改水印检测部分
if (enableWatermarkDetection) {
  try {
    // 根据配置选择检测方法
    const useAdvanced = data.watermarkDetectionMode === 'advanced'; // 从消息中获取
    
    const watermarkInfo = useAdvanced
      ? await detectWatermarkAdvanced(image.data)
      : await detectWatermark(image.data);
    
    if (watermarkInfo.hasWatermark) {
      result.hasWatermark = watermarkInfo.hasWatermark;
      result.watermarkRegions = watermarkInfo.watermarkRegions;
      result.watermarkConfidence = watermarkInfo.watermarkConfidence;
      
      // 保存检测方法信息
      result.watermarkDetectionMethod = watermarkInfo.detectionMethod || 'basic';
      
      if (watermarkInfo.analysisDetails) {
        result.watermarkAnalysisDetails = watermarkInfo.analysisDetails;
      }
      
      // 生成缩略图
      if (!result.imageData) {
        const thumb = await createThumbnail(
          image.data,
          512,
          result.mimeType || "image/jpeg",
          0.85
        );
        if (thumb) result.imageData = thumb;
      }
    }
  } catch (watermarkError) {
    console.warn(`水印检测失败: ${image.name}`, watermarkError);
  }
}
```

### 方案B: 完全替换为高级检测（推荐生产环境）

直接用高级检测替换基础检测：

```javascript
// 1. 重命名原函数为备份
async function detectWatermarkBasic(imageData) {
  // 原有的检测代码
  // ... (保持不变)
}

// 2. 主函数使用高级检测
async function detectWatermark(imageData) {
  return await detectWatermarkAdvanced(imageData);
}
```

---

## UI 配置选项（可选）

如果你想让用户在界面上选择检测模式：

### 在 `page.tsx` 中添加选择器

```tsx
// 添加状态
const [watermarkDetectionMode, setWatermarkDetectionMode] = useState<'basic' | 'advanced'>('advanced');

// 在 UI 中添加选择器（在水印检测复选框附近）
{enableWatermarkDetection && (
  <div className="ml-6 mt-2">
    <label className="text-sm text-gray-600">
      检测模式：
      <select
        value={watermarkDetectionMode}
        onChange={(e) => setWatermarkDetectionMode(e.target.value as 'basic' | 'advanced')}
        className="ml-2 px-2 py-1 border rounded"
      >
        <option value="basic">基础检测（快速）</option>
        <option value="advanced">高级检测（准确）</option>
      </select>
    </label>
    <p className="text-xs text-gray-500 mt-1">
      {watermarkDetectionMode === 'advanced' 
        ? '使用多维度像素分析，准确率更高，处理时间约增加 2-3 倍'
        : '基于边缘和透明度检测，速度快，适合快速预览'}
    </p>
  </div>
)}
```

### 传递模式到 Worker

```typescript
// 在 handleValidate 和 handleSheetSelect 中
await validateExcel(
  file, 
  selectedSheet, 
  enableWatermarkDetection,
  watermarkDetectionMode  // 新增参数
);
```

### 修改 useFrontendValidation.ts

```typescript
const validateExcel = useCallback(
  async (
    file: File, 
    selectedSheet: string | null, 
    enableWatermarkDetection: boolean = false,
    watermarkDetectionMode: 'basic' | 'advanced' = 'advanced'  // 新增参数
  ) => {
    // ...
    worker.postMessage({
      type: 'VALIDATE_EXCEL',
      fileBuffer,
      selectedSheet,
      enableWatermarkDetection,
      watermarkDetectionMode,  // 传递模式
    });
    // ...
  },
  [processCellsInWorker]
);
```

### 在 Worker 中接收模式

```javascript
case "VALIDATE_EXCEL": {
  const { 
    fileBuffer, 
    selectedSheet, 
    enableWatermarkDetection,
    watermarkDetectionMode = 'advanced'  // 默认高级模式
  } = data;
  
  // 传递给验证函数
  await validateImagesInternal(
    fileBuffer, 
    selectedSheet, 
    enableWatermarkDetection,
    watermarkDetectionMode
  );
}
```

---

## 性能优化配置

### 配置1: 快速模式（适合预览）

```javascript
// 在 detectWatermarkAdvanced 函数开头
const maxSize = 600;  // 降低到 600px
const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));

// 在频域分析中
for (let y = 0; y < height; y += 8) {  // 增加采样间隔
  for (let x = 0; x < width - step; x += 8) {
    // ...
  }
}
```

### 配置2: 平衡模式（推荐）

```javascript
const maxSize = 800;  // 默认配置
// 采样间隔保持 5
```

### 配置3: 精确模式（重要文件）

```javascript
const maxSize = 1200;  // 提高分辨率
// 采样间隔减少到 3
for (let y = 0; y < height; y += 3) {
  // ...
}
```

---

## 测试验证

### 1. 准备测试图片

创建一个测试文件夹 `test-images/` 包含：

```
test-images/
├── watermark-corner-logo.jpg       # 角落 Logo 水印
├── watermark-bottom-text.jpg       # 底部文字水印
├── watermark-repeated.jpg          # 重复平铺水印
├── no-watermark-photo.jpg          # 无水印照片
├── no-watermark-screenshot.jpg     # 无水印截图
└── edge-case-with-text.jpg         # 含文字但非水印
```

### 2. 运行检测测试

```javascript
// 创建测试脚本 test-watermark-detection.js
async function testWatermarkDetection() {
  const testCases = [
    { file: 'watermark-corner-logo.jpg', expected: true },
    { file: 'watermark-bottom-text.jpg', expected: true },
    { file: 'watermark-repeated.jpg', expected: true },
    { file: 'no-watermark-photo.jpg', expected: false },
    { file: 'no-watermark-screenshot.jpg', expected: false },
    { file: 'edge-case-with-text.jpg', expected: false }
  ];
  
  for (const testCase of testCases) {
    const imageData = await loadImage(testCase.file);
    const result = await detectWatermarkAdvanced(imageData);
    
    const passed = result.hasWatermark === testCase.expected;
    console.log(`[${passed ? '✓' : '✗'}] ${testCase.file}`);
    console.log(`  Expected: ${testCase.expected}, Got: ${result.hasWatermark}`);
    console.log(`  Confidence: ${result.watermarkConfidence.toFixed(2)}`);
    console.log(`  Regions: ${result.watermarkRegions.join(', ')}`);
    console.log(`  Dominant Features: ${result.analysisDetails.dominantFeatures.join(', ')}`);
    console.log('');
  }
}
```

### 3. 对比基础和高级检测

```javascript
async function compareDetectionMethods(imageData) {
  console.time('Basic Detection');
  const basicResult = await detectWatermark(imageData);
  console.timeEnd('Basic Detection');
  
  console.time('Advanced Detection');
  const advancedResult = await detectWatermarkAdvanced(imageData);
  console.timeEnd('Advanced Detection');
  
  console.table({
    'Basic': {
      hasWatermark: basicResult.hasWatermark,
      confidence: basicResult.watermarkConfidence.toFixed(2),
      regions: basicResult.watermarkRegions.length
    },
    'Advanced': {
      hasWatermark: advancedResult.hasWatermark,
      confidence: advancedResult.watermarkConfidence.toFixed(2),
      regions: advancedResult.watermarkRegions.length
    }
  });
}
```

---

## 故障排除

### 问题1: 提示 `detectWatermarkAdvanced is not defined`

**解决方案**：
1. 确认 `advanced-watermark-detection.js` 文件存在于 `public/` 目录
2. 确认在 `validation-worker.js` 中添加了 `importScripts('advanced-watermark-detection.js')`
3. 检查浏览器控制台是否有加载错误

### 问题2: 检测速度非常慢

**解决方案**：
1. 降低 `maxSize` 参数（从 1000 降到 600-800）
2. 增加采样间隔（从 5 增加到 8 或 10）
3. 考虑禁用某些分析（如纹理分析）

### 问题3: 误报率很高

**解决方案**：
1. 提高检测阈值（从 45 提高到 55-60）
2. 调整权重配置，降低误报来源的权重
3. 检查测试图片是否确实有水印

### 问题4: 漏检水印

**解决方案**：
1. 降低检测阈值（从 45 降低到 35-40）
2. 检查水印位置是否在检测区域内
3. 调整区域大小配置

---

## 生产环境清单

部署前检查：

- [ ] 已测试至少 20 张有水印和无水印的图片
- [ ] 准确率达到预期（建议 >85%）
- [ ] 平均处理时间可接受（建议 <500ms）
- [ ] 控制台日志已设置为仅在开发环境输出
- [ ] 错误处理机制完善
- [ ] UI 提示用户检测可能需要时间
- [ ] 有降级方案（如果高级检测失败，回退到基础检测）

---

## 总结

### 推荐配置（开箱即用）

```javascript
// validation-worker.js 中

// 1. 在文件末尾添加
importScripts('advanced-watermark-detection.js');

// 2. 在水印检测调用处（第 2359 行）
if (enableWatermarkDetection) {
  try {
    // 使用高级检测
    const watermarkInfo = await detectWatermarkAdvanced(image.data);
    
    if (watermarkInfo.hasWatermark) {
      result.hasWatermark = watermarkInfo.hasWatermark;
      result.watermarkRegions = watermarkInfo.watermarkRegions;
      result.watermarkConfidence = watermarkInfo.watermarkConfidence;
      
      // 为有水印的图片生成缩略图
      if (!result.imageData) {
        const thumb = await createThumbnail(
          image.data,
          512,
          result.mimeType || "image/jpeg",
          0.85
        );
        if (thumb) result.imageData = thumb;
      }
    }
  } catch (watermarkError) {
    console.warn(`水印检测失败: ${image.name}`, watermarkError);
    
    // 可选：降级到基础检测
    try {
      const watermarkInfo = await detectWatermark(image.data);
      // ... 处理基础检测结果
    } catch (fallbackError) {
      console.error('基础检测也失败:', fallbackError);
    }
  }
}
```

就这么简单！🎉

---

## 下一步

1. 按照上述步骤集成
2. 使用测试图片验证效果
3. 根据实际情况调优参数
4. 部署到生产环境

如有问题，参考：
- `ADVANCED_WATERMARK_DETECTION_GUIDE.md` - 完整集成指南
- `advanced-watermark-detection.js` - 源码及注释
- `WATERMARK_TOGGLE_IMPLEMENTATION.md` - 功能实现文档
