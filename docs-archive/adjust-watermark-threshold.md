# 🎚️ 水印检测阈值调整指南

## 当前阈值：45%

**位置**：`public/validation-worker.js` 第 5124 行

```javascript
const hasWatermark = confidence >= 45;
```

---

## 快速调整步骤

### 1. 找到代码行
打开 `public/validation-worker.js`，跳转到第 **5124** 行

### 2. 修改阈值
```javascript
// 原值
const hasWatermark = confidence >= 45;

// 改为你想要的值（例如 55）
const hasWatermark = confidence >= 55;
```

### 3. 重新构建
```bash
npm run build
```

### 4. 重启服务器
```bash
npm run dev
```

---

## 推荐阈值对照表

| 场景 | 推荐阈值 | 效果 |
|------|---------|------|
| **电商产品审核** | 55-60 | 只检测明显水印，减少误报 |
| **内容平台** | 45-50 | 平衡检测和误报（默认） |
| **版权保护** | 35-40 | 高灵敏度，检测所有可疑水印 |
| **严格审核** | 60-70 | 极少误报，只标记确凿水印 |

---

## 置信度计算公式

```javascript
总置信度 = 
  频域分析 × 0.20 +      // 检测重复模式
  梯度分析 × 0.25 +      // 检测边缘特征
  纹理分析 × 0.15 +      // 检测纹理异常
  颜色通道 × 0.15 +      // 检测颜色差异
  区域分析 × 0.15 +      // 检测特定区域
  透明度   × 0.10        // 检测alpha通道
```

每个分析方法返回 0-100 的分数

---

## 实测数据参考

### 无水印图片（正常）
```
置信度范围: 5-35
平均值: ~20
```

### 淡水印图片
```
置信度范围: 35-55
平均值: ~45
```

### 明显水印图片
```
置信度范围: 55-85
平均值: ~65
```

### 强水印图片
```
置信度范围: 75-100
平均值: ~82
```

---

## 调整建议

### 如果误报率高（正常图片被标记为有水印）
```javascript
// 提高阈值
const hasWatermark = confidence >= 55; // 或 60
```

### 如果漏检率高（有水印没被检测到）
```javascript
// 降低阈值
const hasWatermark = confidence >= 40; // 或 35
```

### 如果想要更精细的分级
```javascript
// 多级判断
if (confidence >= 70) {
  // 高度确信有水印
} else if (confidence >= 50) {
  // 可能有水印
} else if (confidence >= 35) {
  // 疑似有水印
} else {
  // 无水印
}
```

---

## 测试流程

1. **收集测试样本**
   - 10-20 张无水印图片
   - 10-20 张有水印图片

2. **记录检测结果**
   ```
   图片A: 置信度 23.5 → 判断：无水印 ✅
   图片B: 置信度 58.2 → 判断：有水印 ✅
   图片C: 置信度 41.3 → 判断：无水印（实际有淡水印）❌
   ```

3. **分析误报/漏检**
   - 计算准确率
   - 找到最优阈值

4. **调整阈值**
   - 根据测试结果调整
   - 重新测试验证

---

## 监控置信度分布

在 Console 中添加统计：

```javascript
// 记录所有图片的置信度
let confidenceList = [];

// 在检测完成后
confidenceList.push(confidence);

// 查看分布
console.log('置信度统计:', {
  最小值: Math.min(...confidenceList),
  最大值: Math.max(...confidenceList),
  平均值: confidenceList.reduce((a,b)=>a+b,0) / confidenceList.length,
  中位数: confidenceList.sort()[Math.floor(confidenceList.length/2)]
});
```

---

## 总结

✅ **当前默认阈值：45%** - 适合大多数场景
🎯 **调整范围：35-65%** - 根据实际需求
📊 **建议先测试** - 收集数据后再调整
🔄 **可随时调整** - 修改一行代码即可

---

**文档更新时间**: 2025-01-13  
**当前阈值**: 45%  
**代码位置**: `public/validation-worker.js:5124`
