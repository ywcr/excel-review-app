// 测试图片问题排序逻辑
console.log('🧪 测试图片问题排序逻辑');

// 模拟图片验证结果数据
const mockImageResults = [
  {
    id: "image1.jpeg",
    row: 10,
    column: "M",
    position: "M10",
    isBlurry: true,
    duplicates: [],
    sharpness: 45
  },
  {
    id: "image2.jpeg", 
    row: 5,
    column: "N",
    position: "N5",
    isBlurry: false,
    duplicates: [
      { id: "image4.jpeg", position: "M8", row: 8, column: "M" }
    ],
    sharpness: 85
  },
  {
    id: "image3.jpeg",
    row: 15,
    column: "M", 
    position: "M15",
    isBlurry: true,
    duplicates: [],
    sharpness: 30
  },
  {
    id: "image4.jpeg",
    row: 8,
    column: "M",
    position: "M8", 
    isBlurry: false,
    duplicates: [
      { id: "image2.jpeg", position: "N5", row: 5, column: "N" }
    ],
    sharpness: 82
  },
  {
    id: "image5.jpeg",
    row: 12,
    column: "N",
    position: "N12",
    isBlurry: false,
    duplicates: [
      { id: "image6.jpeg", position: "M20", row: 20, column: "M" },
      { id: "image7.jpeg", position: "N25", row: 25, column: "N" }
    ],
    sharpness: 90
  },
  {
    id: "image6.jpeg",
    row: 20,
    column: "M",
    position: "M20",
    isBlurry: false,
    duplicates: [
      { id: "image5.jpeg", position: "N12", row: 12, column: "N" }
    ],
    sharpness: 88
  },
  {
    id: "image7.jpeg",
    row: 25,
    column: "N", 
    position: "N25",
    isBlurry: true,
    duplicates: [
      { id: "image5.jpeg", position: "N12", row: 12, column: "N" }
    ],
    sharpness: 40
  }
];

console.log('\n📋 原始数据:');
mockImageResults.forEach(img => {
  const hasDuplicates = (img.duplicates?.length ?? 0) > 0;
  console.log(`${img.id} - ${img.position} - ${hasDuplicates ? '重复' : ''}${img.isBlurry ? '模糊' : ''} - 清晰度:${img.sharpness}`);
});

// 应用排序逻辑（与ValidationResults.tsx中相同）
const sortedResults = mockImageResults
  .filter(result => result.isBlurry || (result.duplicates?.length ?? 0) > 0)
  .sort((a, b) => {
    // 优先级排序：重复图片 > 模糊图片
    const aHasDuplicates = (a.duplicates?.length ?? 0) > 0;
    const bHasDuplicates = (b.duplicates?.length ?? 0) > 0;
    
    // 1. 重复图片优先显示
    if (aHasDuplicates && !bHasDuplicates) return -1;
    if (!aHasDuplicates && bHasDuplicates) return 1;
    
    // 2. 同类型内按位置排序（行号优先，然后列号）
    const aRow = a.row ?? 999999;
    const bRow = b.row ?? 999999;
    if (aRow !== bRow) return aRow - bRow;
    
    const aCol = a.column ?? 'ZZ';
    const bCol = b.column ?? 'ZZ';
    return aCol.localeCompare(bCol);
  });

console.log('\n✅ 排序后结果:');
console.log('📍 重复图片优先，然后按位置排序');
sortedResults.forEach((img, index) => {
  const hasDuplicates = (img.duplicates?.length ?? 0) > 0;
  const problemType = hasDuplicates ? '🔄重复' : '🌫️模糊';
  console.log(`${index + 1}. ${img.id} - ${img.position} - ${problemType} - 清晰度:${img.sharpness}`);
  
  if (hasDuplicates) {
    img.duplicates.forEach(dup => {
      console.log(`   └─ 与 ${dup.id} (${dup.position}) 重复`);
    });
  }
});

console.log('\n🎯 排序验证:');
console.log('✅ 重复图片应该在前面');
console.log('✅ 同类型内按行号排序');
console.log('✅ 相同行号按列号排序');

// 验证排序正确性
let lastWasDuplicate = true;
let lastRow = 0;
let lastCol = '';

for (let i = 0; i < sortedResults.length; i++) {
  const current = sortedResults[i];
  const hasDuplicates = (current.duplicates?.length ?? 0) > 0;
  
  if (lastWasDuplicate && !hasDuplicates) {
    console.log(`✅ 第${i + 1}项开始是模糊图片，重复图片排序正确`);
    lastWasDuplicate = false;
    lastRow = 0;
    lastCol = '';
  }
  
  if (current.row >= lastRow) {
    if (current.row > lastRow || current.column >= lastCol) {
      lastRow = current.row;
      lastCol = current.column;
    } else {
      console.log(`❌ 位置排序错误: ${current.position} 应该在前面`);
    }
  } else {
    console.log(`❌ 行号排序错误: ${current.position} 行号${current.row} < ${lastRow}`);
  }
}

console.log('\n🎉 排序测试完成！');
