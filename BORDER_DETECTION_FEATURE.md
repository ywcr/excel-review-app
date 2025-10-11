# 图片边框检测功能

## 🎯 功能概述

新增图片边框检测功能，可以自动识别图片四周是否存在纯色边框（可能是黑边、白边或其他颜色），并在验证结果中显示对应的错误信息。

## ✅ 功能特性

### 1. 检测能力
- ✅ **最小1px边框检测** - 可检测最细的边框
- ✅ **四边独立检测** - 上、下、左、右边框独立检测
- ✅ **不完整边框支持** - 可以只有一条边或多条边
- ✅ **颜色不敏感** - 不区分边框颜色（黑、白、灰等都能检测）
- ✅ **渐变容忍** - 允许轻微的颜色渐变（容差15/255）

### 2. 检测算法

#### 边框扫描机制
```
1. 从图片的四条边向内逐行/列扫描（最多50像素深度）
2. 对每一行/列计算平均颜色
3. 检查该行/列中90%的像素是否在容差范围内（颜色一致）
4. 持续扫描直到遇到非纯色区域
5. 记录边框宽度和位置
```

#### 配置参数
- **颜色容差** (BORDER_COLOR_TOLERANCE): 12 - 允许RGB每个通道±12的差异（减少误报）
- **一致性比例** (BORDER_CONSISTENCY_RATIO): 0.93 - 93%像素需要符合颜色条件（更严格）
- **最小边框宽度** (BORDER_MIN_WIDTH): 2px - 最小检测阈值（过滤1px细线）
- **最大边框宽度** (BORDER_MAX_WIDTH): 30px - 超过此宽度认为是内容而非边框
- **亮度差异阈值** (BORDER_BRIGHTNESS_DIFF): 20 - 边框与内容的最小亮度差异（避免误判内部区域）

## 📦 实现位置

### 1. 前端代码 (src/lib/imageProcessor.ts)
添加了以下方法和接口：

```typescript
interface ImageValidationResult {
  // ... 其他字段
  hasBorder?: boolean;
  borderSides?: string[]; // ['top', 'bottom', 'left', 'right']
  borderWidth?: { top?: number; bottom?: number; left?: number; right?: number };
}

class ImageProcessor {
  // 检测图片纯色边框
  async detectSolidBorder(imageData: Uint8Array): Promise<BorderInfo>
  
  // 检测单条边的边框
  private detectBorderEdge(data, width, height, side): number
  
  // 检查一行/列像素是否为纯色
  private isSolidColorLine(colors, tolerance, consistencyRatio): boolean
}
```

### 2. Web Worker (public/validation-worker.js)
在图片验证流程中集成：

```javascript
// 在 validateImagesInternal 函数中
const borderInfo = await detectSolidBorder(image.data);
if (borderInfo.hasBorder) {
  result.hasBorder = borderInfo.hasBorder;
  result.borderSides = borderInfo.borderSides;
  result.borderWidth = borderInfo.borderWidth;
}
```

### 3. UI组件 (src/components/ValidationResults.tsx)
- 添加"显示存在边框"过滤器
- 在问题类型列显示"存在边框"标签（粉色标签）
- 在问题详细列显示边框位置和宽度，例如：`边框: 上(2px)、下(2px)`

## 🎨 UI 展示

### 过滤器
在图片问题详情的过滤区域新增：
```
☑️ 显示存在边框
```

### 问题类型标签
```
[存在边框] - 粉色标签 (bg-pink-100 text-pink-800)
```

### 问题详细信息
```
边框: 上(2px)、右(1px)
边框: 左(3px)、右(3px)
边框: 上(1px)、下(1px)、左(1px)、右(1px)
```

## 🔧 使用方法

### 自动检测
边框检测已集成到标准的图片验证流程中，无需额外配置。上传Excel文件并启用图片验证后，系统会自动检测所有图片的边框。

### 查看结果
1. 上传包含图片的Excel文件
2. 等待验证完成
3. 在"图片问题详情"部分查看结果
4. 使用"显示存在边框"过滤器快速定位有边框的图片
5. 点击"查看大图"可以直观看到边框情况

## 📊 检测示例

### 示例1：上下黑边
```
原图尺寸: 1080x1920
检测结果:
  hasBorder: true
  borderSides: ['top', 'bottom']
  borderWidth: { top: 2, bottom: 2 }
```

### 示例2：四周白边
```
原图尺寸: 800x600
检测结果:
  hasBorder: true
  borderSides: ['top', 'bottom', 'left', 'right']
  borderWidth: { top: 1, bottom: 1, left: 1, right: 1 }
```

### 示例3：仅左边框
```
原图尺寸: 1200x900
检测结果:
  hasBorder: true
  borderSides: ['left']
  borderWidth: { left: 5 }
```

## ⚙️ 调整参数

如需调整检测灵敏度，可修改以下参数：

### validation-worker.js 中：
```javascript
const BORDER_COLOR_TOLERANCE = 12;      // 降低：更严格（减少误报）
const BORDER_CONSISTENCY_RATIO = 0.93;  // 提高：更严格（要求更纯的颜色）
const BORDER_MIN_WIDTH = 2;             // 提高：过滤1px的细线
const BORDER_MAX_WIDTH = 30;            // 新增：避免将大面积纯色区域误判为边框
```

### imageProcessor.ts 中：
```typescript
export const IMAGE_CONFIG = {
  // ...
  BORDER_MIN_WIDTH: 2,
  BORDER_MAX_WIDTH: 30,
  BORDER_COLOR_TOLERANCE: 12,
  BORDER_CONSISTENCY_RATIO: 0.93,
  BORDER_BRIGHTNESS_DIFF: 20,
};
```

## 🚀 性能优化

1. **限制扫描深度** - 最多扫描50像素，避免全图扫描
2. **并行检测** - 与清晰度、重复性检测同时进行
3. **资源清理** - 及时释放Canvas和Bitmap资源
4. **错误容错** - 检测失败不影响其他功能

## 📝 注意事项

1. **边框宽度限制**：只检测2-30px的边框，过细或过宽的都不会被认为是边框
2. **内部区域过滤**：通过亮度对比度检查，避免将内部的纯色区域（如灯条、白墙）误判为边框
3. **颜色一致性**：要求93%的像素颜色一致，对渐变边框可能无法检测
4. 边框检测会增加图片处理时间（约10-20%）
5. 检测到边框的图片会自动生成缩略图供前端查看

## 🎉 测试建议

建议使用以下类型的图片进行测试：
- ✅ 截图（通常有黑边或白边）
- ✅ 扫描文档（可能有白边）
- ✅ 屏幕拍摄照片（可能有黑边）
- ✅ 裁剪不当的图片
- ✅ 不同宽度的边框（1px、2px、5px等）

## 🔄 后续优化方向

1. **智能阈值** - 根据图片整体亮度自动调整检测阈值
2. **边框颜色识别** - 区分黑边、白边等不同类型
3. **边框修复建议** - 提供裁剪建议
4. **批量处理** - 支持批量移除边框的功能
