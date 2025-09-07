# 视觉内容重复检测功能实现

## 🎯 功能概述

将原有的基于文件字节数据的简化哈希重复检测，升级为基于视觉内容的感知哈希重复检测，能够准确识别视觉上相似的图片，即使它们的文件大小、压缩参数或轻微编辑有所不同。

## ✅ 技术实现

### 1. dHash算法（差异哈希）

采用dHash（Difference Hash）算法进行视觉内容哈希：

```javascript
// dHash算法核心步骤：
// 1. 将图片缩放到9x8像素
// 2. 转换为灰度图像
// 3. 比较相邻像素的亮度差异
// 4. 生成64位二进制哈希
// 5. 转换为16位十六进制字符串
```

### 2. 算法优势

- **视觉相似性检测**：基于像素亮度差异，能检测视觉上相似的图片
- **抗干扰能力强**：对轻微的压缩、缩放、亮度调整具有鲁棒性
- **计算效率高**：9x8像素处理，计算量小，适合Web Worker环境
- **误判率低**：64位哈希提供足够的区分度

### 3. 核心代码实现

#### 感知哈希计算
```javascript
async function calculateDHashFromImageData(imageData) {
  // 使用OffscreenCanvas处理图片
  const canvas = new OffscreenCanvas(9, 8);
  const ctx = canvas.getContext('2d');
  
  // 加载并缩放图片
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([imageData]));
  
  await new Promise(resolve => img.onload = resolve);
  ctx.drawImage(img, 0, 0, 9, 8);
  
  // 获取像素数据并转换为灰度
  const pixels = ctx.getImageData(0, 0, 9, 8).data;
  const grayPixels = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
    grayPixels.push(gray);
  }
  
  // 计算相邻像素差异
  const bits = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = grayPixels[y * 9 + x];
      const right = grayPixels[y * 9 + x + 1];
      bits.push(left > right ? 1 : 0);
    }
  }
  
  // 转换为十六进制哈希
  let hash = "";
  for (let i = 0; i < 64; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    hash += nibble.toString(16);
  }
  
  return hash;
}
```

#### 汉明距离计算
```javascript
function calculateHammingDistanceHex(hash1, hash2) {
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const a = parseInt(hash1[i], 16);
    const b = parseInt(hash2[i], 16);
    let xor = a ^ b;
    
    // 计算XOR结果中1的个数
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}
```

### 4. 重复检测阈值

针对dHash算法优化了汉明距离阈值：

- **0-5**: 极相似（几乎完全相同）
- **6-10**: 相似（推荐阈值范围）
- **11-15**: 较相似
- **16+**: 不相似

当前设置阈值为 **8**，在准确性和召回率之间取得平衡。

### 5. 性能优化

- **Web Worker环境**：在独立线程中处理，不阻塞主线程
- **OffscreenCanvas**：高效的图片处理，无需DOM操作
- **批量处理**：支持大量图片的并发处理
- **内存管理**：及时释放临时对象和URL

## 🔧 使用方式

### 在Excel验证中启用图片检测
```javascript
// 在验证配置中启用图片验证
const validationOptions = {
  includeImages: true  // 启用图片验证，包括重复检测
};
```

### 检测结果格式
```javascript
{
  totalImages: 10,
  blurryImages: 2,
  duplicateGroups: 1,
  results: [
    {
      id: "image1.jpg",
      hash: "a1b2c3d4e5f6789a",
      isBlurry: false,
      duplicates: [
        {
          id: "image2.jpg",
          position: "B5",
          row: 5,
          column: "B"
        }
      ],
      position: "A5",
      row: 5,
      column: "A"
    }
  ]
}
```

## 🧪 测试验证

提供了专门的测试脚本验证功能：

```bash
# 运行视觉重复检测测试
node scripts/testVisualDuplicateDetection.js
```

测试内容包括：
- dHash算法正确性验证
- 汉明距离计算准确性
- 重复检测阈值效果
- 性能基准测试

## 📊 与原有实现对比

| 特性 | 原有实现 | 新实现 |
|------|----------|--------|
| 检测方式 | 文件字节采样 | 视觉内容dHash |
| 抗干扰性 | 弱 | 强 |
| 误判率 | 较高 | 低 |
| 计算复杂度 | 低 | 中等 |
| 内存使用 | 低 | 中等 |
| 准确性 | 一般 | 高 |

## 🚀 后续优化方向

1. **多算法支持**：可选择aHash、pHash等其他感知哈希算法
2. **自适应阈值**：根据图片类型自动调整相似度阈值
3. **WASM加速**：使用WebAssembly进一步提升计算性能
4. **增量检测**：支持新增图片与已有图片的增量比较
5. **相似度评分**：提供更详细的相似度评分和置信度

## 📝 注意事项

- 需要浏览器支持OffscreenCanvas（现代浏览器均支持）
- 图片格式需要浏览器能够解码（JPEG、PNG、GIF等）
- 大量图片处理时会消耗较多CPU资源
- 建议在用户空闲时进行批量检测以提升用户体验
