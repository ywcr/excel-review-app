/**
 * 拜访时长解析功能验证脚本
 * 用于验证新增的 parseDuration 功能是否正确处理各种时长格式
 */

// 模拟 parseDuration 函数（与 TypeScript 实现保持一致）
function parseDuration(value) {
  if (value === null || value === undefined || value === '') return null;

  const str = String(value).trim();
  if (!str) return null;

  // 尝试直接转换为数字（纯数字格式）
  const directNumber = Number(str);
  if (!isNaN(directNumber) && directNumber >= 0) {
    return directNumber;
  }

  // 匹配带中文单位的格式
  // 匹配: "60分钟", "60 分钟", "1.5小时", "90分" 等
  const chineseMinuteMatch = str.match(/^([0-9]+\.?[0-9]*)\s*(?:分钟?|min|mins|minutes?)$/i);
  if (chineseMinuteMatch) {
    const minutes = parseFloat(chineseMinuteMatch[1]);
    return !isNaN(minutes) && minutes >= 0 ? minutes : null;
  }

  const chineseHourMatch = str.match(/^([0-9]+\.?[0-9]*)\s*(?:小时|时|hour|hours?|h)$/i);
  if (chineseHourMatch) {
    const hours = parseFloat(chineseHourMatch[1]);
    return !isNaN(hours) && hours >= 0 ? hours * 60 : null;
  }

  // 匹配复合格式: "1小时30分钟", "1h30m", "1时30分" 等
  const compositeMatch = str.match(/^([0-9]+)\s*(?:小时|时|h)\s*([0-9]+)\s*(?:分钟?|m)$/i);
  if (compositeMatch) {
    const hours = parseInt(compositeMatch[1], 10);
    const minutes = parseInt(compositeMatch[2], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      return hours * 60 + minutes;
    }
  }

  // 如果都不匹配，返回null
  return null;
}

// 测试用例
const testCases = [
  // 纯数字格式
  { input: '60', expected: 60, description: '纯数字' },
  { input: '100', expected: 100, description: '纯数字' },
  { input: 60, expected: 60, description: '数字类型' },
  
  // 带中文单位
  { input: '60分钟', expected: 60, description: '中文"分钟"' },
  { input: '60 分钟', expected: 60, description: '带空格的"分钟"' },
  { input: '90分', expected: 90, description: '中文"分"' },
  { input: '1小时', expected: 60, description: '中文"小时"' },
  { input: '1.5小时', expected: 90, description: '小数"小时"' },
  { input: '2时', expected: 120, description: '中文"时"' },
  
  // 带英文单位
  { input: '60min', expected: 60, description: '英文"min"' },
  { input: '90mins', expected: 90, description: '英文"mins"' },
  { input: '60 minutes', expected: 60, description: '英文"minutes"' },
  { input: '1hour', expected: 60, description: '英文"hour"' },
  { input: '2hours', expected: 120, description: '英文"hours"' },
  { input: '1.5h', expected: 90, description: '英文"h"' },
  
  // 复合格式
  { input: '1小时30分钟', expected: 90, description: '复合格式1' },
  { input: '2小时15分钟', expected: 135, description: '复合格式2' },
  { input: '1时30分', expected: 90, description: '简化复合格式' },
  { input: '1h30m', expected: 90, description: '英文复合格式' },
  { input: '1 小时 30 分钟', expected: 90, description: '带空格的复合格式' },
  
  // 无效格式
  { input: '', expected: null, description: '空字符串' },
  { input: null, expected: null, description: 'null值' },
  { input: undefined, expected: null, description: 'undefined值' },
  { input: 'abc', expected: null, description: '无效文本' },
  { input: '分钟60', expected: null, description: '错误顺序' },
  { input: '-60', expected: null, description: '负数' },
];

// 运行测试
console.log('开始测试拜访时长解析功能...\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = parseDuration(testCase.input);
  const isPass = result === testCase.expected;
  
  if (isPass) {
    passed++;
    console.log(`✓ 测试 ${index + 1} 通过: ${testCase.description}`);
    console.log(`  输入: ${JSON.stringify(testCase.input)}, 输出: ${result}\n`);
  } else {
    failed++;
    console.log(`✗ 测试 ${index + 1} 失败: ${testCase.description}`);
    console.log(`  输入: ${JSON.stringify(testCase.input)}`);
    console.log(`  期望: ${testCase.expected}, 实际: ${result}\n`);
  }
});

// 实际场景测试
console.log('='.repeat(60));
console.log('实际场景验证:');
console.log('='.repeat(60) + '\n');

const scenarios = [
  { 
    task: '药店拜访', 
    minMinutes: 60, 
    inputs: ['60', '60分钟', '70分钟', '1小时', '1.5小时', '59分钟', '30'] 
  },
  { 
    task: '等级医院拜访', 
    minMinutes: 100, 
    inputs: ['100', '100分钟', '120分钟', '2小时', '99分钟', '1.5小时'] 
  }
];

scenarios.forEach(scenario => {
  console.log(`${scenario.task} (要求 >= ${scenario.minMinutes}分钟):`);
  scenario.inputs.forEach(input => {
    const duration = parseDuration(input);
    if (duration === null) {
      console.log(`  "${input}" -> 无效格式`);
    } else {
      const isValid = duration >= scenario.minMinutes;
      const status = isValid ? '✓ 通过' : '✗ 不通过';
      console.log(`  "${input}" -> ${duration}分钟 ${status}`);
    }
  });
  console.log('');
});

// 总结
console.log('='.repeat(60));
console.log('测试总结:');
console.log(`通过: ${passed}/${testCases.length}`);
console.log(`失败: ${failed}/${testCases.length}`);
console.log(failed === 0 ? '\n🎉 所有测试通过！' : '\n⚠️  有测试失败，请检查！');
console.log('='.repeat(60));
