# 水印检测功能设计文档

## 📋 目录
1. [背景与目标](#背景与目标)
2. [技术方案](#技术方案)
3. [检测算法](#检测算法)
4. [评分规则](#评分规则)
5. [性能优化](#性能优化)
6. [实现计划](#实现计划)
7. [局限性与未来改进](#局限性与未来改进)

---

## 🎯 背景与目标

### 为什么需要水印检测？
在图片审核场景中，水印是识别**网络图片**的重要特征：
- ❌ **版权水印**：图片来自图库网站（如Getty、视觉中国）
- ❌ **平台Logo**：来自社交媒体（微博、抖音、小红书）
- ❌ **商业水印**：来自电商平台（淘宝、京东产品图）
- ✅ **合法照片**：用户原创拍摄，无水印

### 目标
- 自动检测图片中的水印/Logo，提高"疑似网图"判断准确率
- 降低误判率（避免误报用户合法照片）
- 集成到现有的可疑度评分系统（0-100分制）

---

## 🧠 技术方案

### 整体架构
```
图片输入
    ↓
Canvas处理
    ↓
三种检测方法（并行）
    ├── 1. 边缘文字检测（检测四角/边缘的文字水印）
    ├── 2. 重复图案检测（检测平铺水印）
    └── 3. 透明度/亮度异常检测（检测半透明水印）
    ↓
结果融合
    ↓
可疑度评分（0-15分）
```

### 核心优势
- ✅ **无需外部AI**：纯前端Canvas实现，无需后端API
- ✅ **高性能**：复用现有Canvas基础设施，增量成本低
- ✅ **可解释性**：输出具体检测位置和类型
- ✅ **低误报**：多重验证机制，避免误判

---

## 🔍 检测算法

### 算法1：边缘区域文字检测
**原理**：水印通常位于图片四角或边缘，具有高对比度特征

**步骤**：
1. **定义边缘区域**（各占图片的15%）
   ```javascript
   const edgeRegions = {
     topLeft: { x: 0, y: 0, width: w * 0.15, height: h * 0.15 },
     topRight: { x: w * 0.85, y: 0, width: w * 0.15, height: h * 0.15 },
     bottomLeft: { x: 0, y: h * 0.85, width: w * 0.15, height: h * 0.15 },
     bottomRight: { x: w * 0.85, y: h * 0.85, width: w * 0.15, height: h * 0.15 },
     centerBottom: { x: w * 0.35, y: h * 0.85, width: w * 0.3, height: h * 0.15 }
   };
   ```

2. **提取边缘高对比度特征**
   - 计算每个区域的边缘强度（Sobel算子）
   - 检测是否有水平/垂直线条（文字笔画特征）
   - 计算对比度和锐度

3. **判断是否为水印**
   ```javascript
   const isWatermark = (region) => {
     return (
       region.edgeStrength > WATERMARK_EDGE_THRESHOLD &&      // 边缘强度高
       region.contrast > WATERMARK_CONTRAST_THRESHOLD &&      // 对比度高
       region.textureComplexity > MIN_TEXT_COMPLEXITY &&      // 纹理复杂（有文字）
       region.averageBrightness > MIN_WATERMARK_BRIGHTNESS    // 非纯黑背景
     );
   };
   ```

**优点**：
- ✅ 检测常见的角落水印（准确率高）
- ✅ 计算量小，性能好

**缺点**：
- ❌ 无法识别具体文字内容（仅检测特征）
- ❌ 可能误判复杂背景（如树叶、建筑细节）

---

### 算法2：重复图案检测
**原理**：某些水印是半透明的重复平铺图案（如"样图"、"禁止商用"）

**步骤**：
1. **图像分块**：将图片分为8x8的网格
2. **特征提取**：计算每个块的哈希特征
3. **相似度匹配**：
   ```javascript
   const repeatedBlocks = [];
   for (let i = 0; i < blocks.length; i++) {
     for (let j = i + 1; j < blocks.length; j++) {
       if (hammingDistance(blocks[i].hash, blocks[j].hash) < 3) {
         repeatedBlocks.push([i, j]);
       }
     }
   }
   ```
4. **判断平铺水印**：
   - 如果有超过30%的块相似 → 可能是平铺水印
   - 相似块呈规律分布（非聚集）→ 水印概率更高

**优点**：
- ✅ 检测平铺水印（常见于正版图库）
- ✅ 鲁棒性强（不受水印位置影响）

**缺点**：
- ❌ 计算量较大
- ❌ 可能误判有规律纹理的图片（如地砖、窗户）

---

### 算法3：透明度/亮度异常检测
**原理**：半透明水印会在局部区域造成亮度/饱和度异常

**步骤**：
1. **计算全局亮度基准**
   ```javascript
   const globalBrightness = calculateAverageBrightness(imageData);
   ```

2. **检测局部异常**
   ```javascript
   const anomalyRegions = [];
   for (const region of dividedRegions) {
     const localBrightness = calculateAverageBrightness(region);
     const deviation = Math.abs(localBrightness - globalBrightness);
     
     if (deviation > BRIGHTNESS_ANOMALY_THRESHOLD) {
       anomalyRegions.push(region);
     }
   }
   ```

3. **验证是否为水印**
   - 异常区域形状规则（矩形/圆形）→ 水印
   - 异常区域在边缘位置 → 水印概率高
   - 异常区域占比小（<20%）→ 水印

**优点**：
- ✅ 检测半透明水印
- ✅ 对水印样式不敏感

**缺点**：
- ❌ 可能误判光照不均的照片
- ❌ 需要合理设置阈值

---

## 📊 评分规则

### 水印检测在可疑度评分中的权重
```javascript
// 总分100分，水印检测占0-15分
function evaluateWatermark(watermarkInfo) {
  let score = 0;
  const factors = [];

  // 1. 边缘文字水印 (0-8分)
  if (watermarkInfo.hasEdgeText) {
    const edgeCount = watermarkInfo.edgeRegions.length;
    if (edgeCount >= 3) {
      score += 8;
      factors.push('多处边缘水印');
    } else if (edgeCount === 2) {
      score += 5;
      factors.push('两处边缘水印');
    } else {
      score += 3;
      factors.push('边缘疑似水印');
    }
  }

  // 2. 重复平铺水印 (0-7分)
  if (watermarkInfo.hasRepeatedPattern) {
    const coverageRatio = watermarkInfo.patternCoverage;
    if (coverageRatio > 0.5) {
      score += 7;
      factors.push('大面积平铺水印');
    } else if (coverageRatio > 0.3) {
      score += 5;
      factors.push('疑似平铺水印');
    } else {
      score += 3;
      factors.push('局部重复图案');
    }
  }

  // 3. 半透明异常 (0-5分)
  if (watermarkInfo.hasTransparentAnomaly) {
    score += 3;
    factors.push('局部透明度异常');
  }

  // 水印检测最高15分（可能同时触发多个条件时取上限）
  score = Math.min(score, 15);

  return { score, factors };
}
```

### 与其他维度的协同
```javascript
// 组合判断示例
if (hasWatermark && hasNonPhoneAspectRatio && noExif) {
  // 水印(+8) + 非手机比例(+10) + 无EXIF(+15) = 33分 → "可疑"级别
}

if (hasWatermark && hasWebPFormat) {
  // 水印(+8) + WebP格式(+5) = 13分 → 仍属"正常"，避免误判
}
```

---

## ⚡ 性能优化

### 优化策略

#### 1. **复用现有Canvas基础设施**
```javascript
// 在 calculateSharpness 中已经创建了Canvas
// 水印检测可以直接复用这个Canvas和ImageData
async detectWatermark(imageData: Uint8Array): Promise<WatermarkInfo> {
  // 复用现有Canvas上下文，避免重复创建
  const { canvas, ctx, imageData: canvasImageData } = 
    await this.getOrCreateCanvasContext(imageData);
  
  // 水印检测逻辑...
}
```

#### 2. **渐进式检测**
```javascript
// 按成本从低到高逐步检测
const watermarkInfo = {
  detected: false,
  confidence: 0,
  regions: []
};

// Step 1: 快速检测（10ms）- 只检查四角
const quickCheck = checkCornerWatermarks(canvas);
if (!quickCheck.suspicious) {
  return { detected: false }; // 提前退出
}

// Step 2: 中等成本检测（50ms）- 边缘检测
const edgeCheck = checkEdgeWatermarks(canvas);
if (edgeCheck.confidence > 0.8) {
  return { detected: true, ...edgeCheck }; // 足够可信，提前退出
}

// Step 3: 深度检测（200ms）- 平铺图案检测
const deepCheck = checkRepeatedPatterns(canvas);
return { detected: true, ...deepCheck };
```

#### 3. **降采样处理**
```javascript
// 对于大图，先缩放到合理尺寸
const MAX_DETECTION_SIZE = 800; // 最大检测尺寸
const scale = Math.min(1, MAX_DETECTION_SIZE / Math.max(width, height));
const detectionWidth = Math.floor(width * scale);
const detectionHeight = Math.floor(height * scale);

// 在缩放后的图上做检测，速度提升4-10倍
```

#### 4. **并行检测**
```javascript
// 三种算法可以并行执行
const [edgeResult, patternResult, anomalyResult] = await Promise.all([
  detectEdgeWatermarks(canvas),
  detectRepeatedPatterns(canvas),
  detectTransparencyAnomalies(canvas)
]);
```

#### 5. **缓存优化**
```javascript
// 对于重复验证的图片，缓存检测结果
const watermarkCache = new Map<string, WatermarkInfo>();

if (watermarkCache.has(imageHash)) {
  return watermarkCache.get(imageHash);
}
```

### 性能目标
| 图片大小 | 检测时间 | 内存增量 |
|---------|---------|---------|
| 1920x1080 | <100ms | <10MB |
| 4000x3000 | <200ms | <20MB |
| 8000x6000 | <400ms | <30MB |

---

## 🛠️ 实现计划

### Phase 1: 核心功能（本次实现）
- ✅ 算法1：边缘文字检测（重点）
- ✅ 集成到评分系统（0-15分）
- ✅ UI展示（徽章+详情）
- ⏸️ 暂缓算法2和3（后续根据效果决定）

### Phase 2: 性能优化（可选）
- 缓存机制
- Web Worker并行处理
- 渐进式检测

### Phase 3: 增强检测（可选）
- 算法2：重复图案检测
- 算法3：透明度异常检测
- OCR文字识别（需引入Tesseract.js）

---

## 🚧 局限性与未来改进

### 当前局限性
1. **无法识别文字内容**
   - 只能检测"有文字状特征"，不能识别具体是什么文字
   - 解决方案：集成OCR库（Tesseract.js），但会显著增加体积和耗时

2. **可能误判复杂背景**
   - 树叶、建筑细节可能被误判为水印
   - 解决方案：增加语义检测（需要深度学习模型）

3. **无法检测嵌入式隐形水印**
   - 某些专业水印嵌入在频域，肉眼不可见
   - 解决方案：FFT频域分析（复杂度高，不推荐）

4. **对样式变化敏感**
   - 如果水印样式多变（颜色、字体、位置），检测效果会下降
   - 解决方案：机器学习分类器（需要大量标注数据）

### 未来改进方向
| 功能 | 优先级 | 复杂度 | 收益 |
|-----|-------|-------|-----|
| OCR文字识别 | 中 | 高 | 高（可读取水印文字） |
| 平铺图案检测 | 低 | 中 | 中（覆盖更多水印类型） |
| 机器学习分类器 | 低 | 极高 | 高（准确率提升） |
| Logo模板匹配 | 中 | 中 | 中（识别常见平台Logo） |

---

## 📚 参考资料

### 技术参考
- [Canvas API文档](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [图像边缘检测算法](https://en.wikipedia.org/wiki/Edge_detection)
- [感知哈希算法](http://www.hackerfactor.com/blog/index.php?/archives/432-Looks-Like-It.html)

### 相关项目
- [watermark-detector](https://github.com/opencv/opencv/wiki/Watermark-Detection) - OpenCV水印检测
- [Tesseract.js](https://tesseract.projectnaptha.com/) - JavaScript OCR库

---

## 🎯 总结

### 推荐方案
**优先实现算法1（边缘文字检测）**，理由：
- ✅ 覆盖最常见的水印类型（80%+）
- ✅ 实现简单，性能优秀
- ✅ 误报率低（通过多重验证）
- ✅ 与现有架构无缝集成

### 评估指标
实现后，通过以下指标评估效果：
1. **召回率**：能检测出多少真实水印图片
2. **精确率**：检测为水印的图片中，真实水印占比
3. **性能**：平均检测耗时
4. **用户反馈**：实际使用中的误报情况

根据初期数据，再决定是否需要实现算法2和3。
