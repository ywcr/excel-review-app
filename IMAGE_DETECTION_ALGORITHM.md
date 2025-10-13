# 图片检测算法说明

本文档详细说明当前项目中"疑似非手机拍摄"和"疑似网图"的检测逻辑。

## 目录
- [检测位置](#检测位置)
- [1. 疑似非手机拍摄检测](#1-疑似非手机拍摄检测)
- [2. 疑似网图检测](#2-疑似网图检测)
- [配置参数](#配置参数)
- [如何调整](#如何调整)

---

## 检测位置

核心检测逻辑位于：`public/validation-worker.js`

主要在图片质量分析阶段执行（2215-2279行）

---

## 1. 疑似非手机拍摄检测

### 算法原理

通过**启发式规则**判断图片的尺寸和比例是否符合典型手机拍摄特征。

### 检测逻辑（代码行：2216-2252）

```javascript
// 1. 获取图片尺寸
const longSide = Math.max(width, height);
const shortSide = Math.min(width, height);
const megapixels = (width * height) / 1_000_000;
const aspect = longSide / shortSide;

// 2. 比例检测
const aspectOk = MOBILE_DIMENSION_CONFIG.ALLOWED_ASPECTS.some(({ ratio, tolerance }) => {
  return Math.abs(aspect - ratio) <= tolerance * ratio;
});

// 3. 尺寸检测
const isLowPixel = megapixels < MOBILE_DIMENSION_CONFIG.MIN_MEGAPIXELS;
const sizeOk = 
  shortSide >= MOBILE_DIMENSION_CONFIG.MIN_SHORT_SIDE &&
  longSide >= MOBILE_DIMENSION_CONFIG.MIN_LONG_SIDE &&
  !isLowPixel;

// 4. 最终判定
result.dimensionOK = !!(aspectOk && sizeOk);
```

### 判定条件

图片必须**同时满足**以下条件才被认为是手机拍摄：

#### ✅ 比例要求（aspectOk）
图片长宽比需符合常见手机比例（带容差）：
- 4:3 (横屏) ± 8%
- 3:4 (竖屏) ± 8%
- 16:9 (横屏) ± 8%
- 9:16 (竖屏) ± 8%

**示例：**
- 图片尺寸 3000x4000，比例 = 4000/3000 = 1.33 ≈ 4/3，符合 ✅
- 图片尺寸 1920x1080，比例 = 1920/1080 = 1.78 ≈ 16/9，符合 ✅
- 图片尺寸 800x600，比例 = 800/600 = 1.33，但分辨率过低 ❌

#### ✅ 分辨率要求（sizeOk）
- 短边 ≥ 720px
- 长边 ≥ 1280px
- 像素总量 ≥ 2MP (200万像素)

**示例：**
- 3024x4032 (12MP) ✅
- 1080x1920 (2MP) ✅
- 640x480 (0.3MP) ❌ 像素不足

### 不符合条件时的标记

如果 `dimensionOK = false`，会记录具体问题：

```javascript
const problems = [];
if (!aspectOk) 
  problems.push(`非典型手机比例(≈${aspect.toFixed(2)}:1)`);
if (shortSide < MIN_SHORT_SIDE || longSide < MIN_LONG_SIDE)
  problems.push(`分辨率过低(${width}x${height})`);
if (isLowPixel)
  problems.push(`像素不足(${megapixels}MP)`);

result.dimensionIssue = problems.join("; ");
```

### 前端展示

- 位置：`src/components/ValidationResults.tsx`
- 展示逻辑（565-593行）：

```tsx
{!img.dimensionOK && (
  <div className="flex items-start gap-1.5 text-yellow-600">
    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
    <div>
      <span className="font-medium">疑似非手机拍摄</span>
      {img.dimensionIssue && (
        <span className="text-xs block text-gray-600">
          {img.dimensionIssue}
        </span>
      )}
    </div>
  </div>
)}
```

---

## 2. 疑似网图检测

### 算法原理

通过**多维度评分机制**计算图片来自网络的可能性（0-1分）。

### 检测逻辑（代码行：2265-2279，2889-2926）

#### 评分规则

```javascript
function scoreWebLikelihood({ mimeType, width, height, megapixels, exif, sizeBytes, hashFrequency }) {
  let score = 0;
  const reasons = [];

  // 1. EXIF信息检测 (权重：-2 到 +2)
  if (exif?.hasExif && (exif.make || exif.model) && exif.dateTimeOriginal) {
    score -= 2; 
    reasons.push('有EXIF(品牌/机型/拍摄时间)');
  } else if (!exif?.hasExif) {
    score += 2; 
    reasons.push('无EXIF');
  }
  
  if (exif?.software && /photoshop|illustrator|adobe|meitu|美图|wechat|微信|qq/i.test(exif.software)) {
    score += 1; 
    reasons.push(`处理软件:${exif.software.slice(0,20)}`);
  }

  // 2. 格式检测 (权重：+1 到 +2)
  if (/webp|gif/i.test(mimeType || '')) { 
    score += 2; 
    reasons.push(`格式:${mimeType}`); 
  }
  if (/png/i.test(mimeType || '') && (megapixels || 0) < 1) { 
    score += 1; 
    reasons.push('小像素PNG'); 
  }

  // 3. 尺寸/比例检测 (权重：-1 到 +2)
  const longSide = Math.max(width||0, height||0);
  const shortSide = Math.min(width||0, height||0);
  const aspect = shortSide > 0 ? longSide/shortSide : 0;
  
  const isPhoneAspect = 
    approx(aspect, 4/3, 0.08) || 
    approx(aspect, 16/9, 0.08) || 
    approx(aspect, 9/16, 0.08) || 
    approx(aspect, 3/4, 0.08);
  
  if (!isPhoneAspect && (megapixels || 0) < 1.0) { 
    score += 2; 
    reasons.push(`非常见手机比例(${aspect.toFixed(2)}:1)+低像素`); 
  } else if ((megapixels || 0) >= 2.0 && isPhoneAspect) { 
    score -= 1; 
    reasons.push('像素/比例似手机'); 
  }

  // 4. 压缩强度检测 (权重：+1)
  if (megapixels && megapixels > 0) {
    const kbPerMP = (sizeBytes/1024) / megapixels;
    if (megapixels < 1.0 && kbPerMP < 120) { 
      score += 1; 
      reasons.push(`强压缩(${kbPerMP.toFixed(0)}KB/MP)`); 
    }
  }

  // 5. 最终评分归一化到 0-1
  const webLikelihood = Math.max(0, Math.min(1, (score + 3) / 8));
  return { webLikelihood, reasons };
}
```

### 评分因素详解

| 检测维度 | 指标 | 网图倾向 | 手机拍摄倾向 | 权重 |
|---------|------|---------|------------|------|
| **EXIF信息** | 包含完整EXIF（品牌/机型/拍摄时间） | - | ✅ | -2 |
| | 无EXIF信息 | ✅ | - | +2 |
| | 包含编辑软件标签（PS/美图/微信等） | ✅ | - | +1 |
| **文件格式** | WebP/GIF格式 | ✅ | - | +2 |
| | 小像素PNG (<1MP) | ✅ | - | +1 |
| **尺寸比例** | 非手机比例 + 低像素 (<1MP) | ✅ | - | +2 |
| | 高像素 (≥2MP) + 手机比例 | - | ✅ | -1 |
| **压缩率** | 低像素 + 强压缩 (<120KB/MP) | ✅ | - | +1 |

### EXIF快速扫描（代码行：2868-2887）

为减少开销，仅扫描前256KB数据，检测关键字：

```javascript
function exifQuickScan(imageData, mimeType) {
  const head = imageData.subarray(0, Math.min(imageData.length, 256 * 1024));
  const txt = new TextDecoder('latin1').decode(head);
  
  return {
    hasExif: txt.includes('Exif\x00\x00'),
    make: /Make\x00|Make\u0000|Make/.test(txt),
    model: /Model\x00|Model\u0000|Model/.test(txt),
    software: txt.match(/Software[^\0]{0,40}/)?.[0],
    dateTimeOriginal: /DateTimeOriginal/.test(txt)
  };
}
```

### 评分计算示例

#### 示例 1：典型手机拍摄
- 有完整EXIF (-2)
- JPEG格式 (0)
- 3024x4032, 12MP，比例4:3 (-1)
- **最终分数：** (−2 + 0 − 1 + 3) / 8 = 0 → **0% 网图可能性** ✅

#### 示例 2：疑似网图
- 无EXIF (+2)
- WebP格式 (+2)
- 800x600, 0.48MP，比例4:3但像素低 (+2)
- 强压缩 40KB/MP (+1)
- **最终分数：** (2 + 2 + 2 + 1 + 3) / 8 = 1.25 → **100% 网图可能性** ⚠️

#### 示例 3：普通图片
- 无EXIF (+2)
- PNG格式，2MP (0)
- 1920x1080, 16:9比例 (-1)
- **最终分数：** (2 + 0 − 1 + 3) / 8 = 0.5 → **50% 网图可能性** ⚠️

### 前端展示

位置：`src/components/ValidationResults.tsx` (611-629行)

```tsx
{typeof img.webLikelihood === 'number' && img.webLikelihood > 0.4 && (
  <div className="flex items-start gap-1.5 text-purple-600">
    <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" />
    <div>
      <span className="font-medium">
        疑似网图 ({(img.webLikelihood * 100).toFixed(0)}%)
      </span>
      {img.webReasons && img.webReasons.length > 0 && (
        <span className="text-xs block text-gray-600">
          {img.webReasons.join(' | ')}
        </span>
      )}
    </div>
  </div>
)}
```

**显示条件：** webLikelihood > 0.4 (40%)

---

## 配置参数

### 手机拍摄检测配置（代码行：71-84）

```javascript
const MOBILE_DIMENSION_CONFIG = {
  ENABLED: true,              // 是否启用检测
  MIN_SHORT_SIDE: 720,        // 短边最小像素
  MIN_LONG_SIDE: 1280,        // 长边最小像素
  MIN_MEGAPIXELS: 2,          // 最小总像素（MP）
  ALLOWED_ASPECTS: [
    { ratio: 4/3, tolerance: 0.08 },   // 容差8%
    { ratio: 3/4, tolerance: 0.08 },
    { ratio: 16/9, tolerance: 0.08 },
    { ratio: 9/16, tolerance: 0.08 },
    // { ratio: 1, tolerance: 0.02 },  // 正方形（可选）
  ],
};
```

### 网图检测配置

网图检测无独立配置文件，评分权重硬编码在 `scoreWebLikelihood` 函数中。

---

## 如何调整

### 调整手机拍摄检测阈值

编辑 `public/validation-worker.js` 的 `MOBILE_DIMENSION_CONFIG` 对象：

```javascript
// 示例1：放宽分辨率要求（适用于较老手机）
MIN_SHORT_SIDE: 640,   // 从720降到640
MIN_LONG_SIDE: 1080,   // 从1280降到1080
MIN_MEGAPIXELS: 1.5,   // 从2降到1.5

// 示例2：增加正方形比例支持（Instagram风格）
ALLOWED_ASPECTS: [
  { ratio: 4/3, tolerance: 0.08 },
  { ratio: 3/4, tolerance: 0.08 },
  { ratio: 16/9, tolerance: 0.08 },
  { ratio: 9/16, tolerance: 0.08 },
  { ratio: 1, tolerance: 0.05 },  // 新增1:1正方形
],

// 示例3：完全禁用检测
ENABLED: false,
```

### 调整网图检测权重

编辑 `scoreWebLikelihood` 函数中的评分逻辑：

```javascript
// 示例1：提高EXIF权重（更严格）
if (exif?.hasExif && (exif.make || exif.model) && exif.dateTimeOriginal) {
  score -= 3;  // 从-2改为-3
}

// 示例2：降低格式影响（WebP逐渐普及）
if (/webp|gif/i.test(mimeType || '')) { 
  score += 1;  // 从+2改为+1
}

// 示例3：调整显示阈值
// 在 ValidationResults.tsx 中修改
{typeof img.webLikelihood === 'number' && img.webLikelihood > 0.5 && (
  // 从0.4改为0.5，减少误报
)}
```

### 调整后测试

修改后需要：
1. 重启开发服务器 `npm run dev`
2. 强制刷新浏览器 (Ctrl+Shift+R / Cmd+Shift+R)
3. 重新上传测试文件验证

---

## 技术细节

### 为什么使用启发式而非AI？

1. **性能考虑：** Worker中运行，需要快速处理数百张图片
2. **隐私保护：** 纯本地计算，不上传到服务器
3. **可解释性：** 用户能清楚看到判定依据
4. **可调整性：** 规则透明，便于根据实际需求调整

### 局限性

1. **误报可能：**
   - 专业相机拍摄的方形构图可能被误判
   - 裁剪过的手机照片可能失去EXIF

2. **漏报可能：**
   - 高质量网图如果保留了EXIF可能逃过检测
   - 图片编辑软件可以伪造EXIF信息

3. **边界情况：**
   - 截图、扫描件等特殊图片类型
   - 多平台转发后被重新压缩的图片

### 优化建议

如需更准确的检测，可以考虑：

1. **增加深度特征：**
   - EXIF完整性校验（检测篡改）
   - 文件创建/修改时间对比
   - JPEG量化表分析

2. **引入机器学习：**
   - 使用TensorFlow.js进行图片来源分类
   - 训练一个轻量级CNN模型
   - 在Worker中加载ONNX模型推理

3. **用户反馈循环：**
   - 记录用户标记的误判案例
   - 定期调整权重和阈值

---

## 相关文件

- **核心算法：** `public/validation-worker.js`
  - 尺寸检测：2216-2252行
  - 网图评分：2265-2279, 2889-2926行
  - EXIF扫描：2868-2887行

- **前端展示：** `src/components/ValidationResults.tsx`
  - 疑似非手机拍摄：565-593行
  - 疑似网图：611-629行

- **类型定义：** `src/hooks/useFrontendValidation.ts`
  - 结果接口：48-58行

---

## 总结

| 检测类型 | 判定依据 | 阈值 | 前端显示条件 |
|---------|---------|------|------------|
| **疑似非手机拍摄** | 尺寸比例启发式 | 固定规则 | `dimensionOK === false` |
| **疑似网图** | 多维度评分 | 0-1连续值 | `webLikelihood > 0.4` |

两个检测**相互独立**，一张图片可能同时触发两个警告，也可能都不触发。

**最佳实践：** 
- 结合人工审核，不要完全依赖自动检测
- 根据实际业务场景调整阈值
- 定期收集误报案例优化规则
