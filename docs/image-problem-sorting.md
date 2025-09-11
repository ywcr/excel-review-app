# 图片问题排序功能说明

## 🎯 功能概述

图片问题详情现在支持智能排序，优先显示重复图片，然后按位置顺序排列其他问题。

## 📋 排序规则

### 1. 优先级排序
- **重复图片** 优先显示在列表顶部
- **模糊图片** 显示在重复图片之后

### 2. 位置排序
在同一类型内，按以下顺序排序：
1. **行号优先**：较小的行号排在前面
2. **列号次之**：相同行号时，按列号字母顺序排序

## 🔄 重复图片显示优化

### 视觉标识
- 红色标签显示 "重复 X处"
- 清晰的重复位置列表
- 可点击定位到其他重复图片

### 重复信息格式
```
重复 2处
与以下图片重复：
• M8 (可点击定位)
• N25 (可点击定位)
```

## 📊 排序示例

### 原始数据
```
image1.jpeg - M10 - 模糊
image2.jpeg - N5 - 重复  
image3.jpeg - M15 - 模糊
image4.jpeg - M8 - 重复
image5.jpeg - N12 - 重复
```

### 排序后结果
```
1. image2.jpeg - N5 - 🔄重复 (行5)
2. image4.jpeg - M8 - 🔄重复 (行8) 
3. image5.jpeg - N12 - 🔄重复 (行12)
4. image1.jpeg - M10 - 🌫️模糊 (行10)
5. image3.jpeg - M15 - 🌫️模糊 (行15)
```

## 🎨 UI 改进

### 表格头部
- 添加排序说明："重复图片优先，按位置排序"
- 红色标签提示重复图片优先级

### 重复图片列
- 紧凑的重复信息显示
- 滚动支持（最多显示20px高度）
- 点击定位功能

### 交互功能
- 点击重复位置可定位到对应图片行
- 悬停提示显示详细信息
- 高亮显示当前定位的图片行

## 🔧 技术实现

### 排序算法
```javascript
.sort((a, b) => {
  // 1. 重复图片优先
  const aHasDuplicates = (a.duplicates?.length ?? 0) > 0;
  const bHasDuplicates = (b.duplicates?.length ?? 0) > 0;
  
  if (aHasDuplicates && !bHasDuplicates) return -1;
  if (!aHasDuplicates && bHasDuplicates) return 1;
  
  // 2. 按位置排序
  const aRow = a.row ?? 999999;
  const bRow = b.row ?? 999999;
  if (aRow !== bRow) return aRow - bRow;
  
  const aCol = a.column ?? 'ZZ';
  const bCol = b.column ?? 'ZZ';
  return aCol.localeCompare(bCol);
})
```

### 重复信息渲染
```javascript
// 优化的重复位置显示
{result.duplicates.map((duplicate, idx) => (
  <div key={idx} className="flex items-center space-x-1">
    <span className="text-gray-400">•</span>
    <button onClick={() => scrollToImageRow(duplicate.id)}>
      {duplicate.position || `${duplicate.column}${duplicate.row}`}
    </button>
  </div>
))}
```

## ✅ 用户体验提升

1. **快速识别**：重复图片一目了然
2. **有序浏览**：按位置顺序查看问题
3. **便捷导航**：点击即可定位相关图片
4. **清晰标识**：不同问题类型有明确的视觉区分

## 🎉 使用建议

1. **优先处理重复图片**：它们通常是最严重的问题
2. **按位置顺序检查**：从上到下系统性地处理问题
3. **利用定位功能**：快速在重复图片间跳转
4. **关注标签提示**：红色标签表示需要重点关注的问题

这个排序功能让图片问题的处理更加高效和有序！
