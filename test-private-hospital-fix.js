// 测试民营医院拜访的日期间隔验证修复
// 注意：由于TypeScript文件无法直接被Node.js执行，
// 这个测试主要用于检查配置文件的修改是否正确
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function testValidation() {
  console.log('📋 检查validationRules.ts配置文件:');
  console.log('=' .repeat(80));
  
  // 读取源文件内容
  const filePath = path.join(__dirname, 'src/lib/validationRules.ts');
  const content = fs.readFileSync(filePath, 'utf-8');

  // 检查民营医院拜访配置
  const privateHospitalSection = content.match(/民营医院拜访:\s*\{[\s\S]*?validationRules:\s*\[([\s\S]*?)\]\s*,?\s*\}/);
  
  if (!privateHospitalSection) {
    console.log('❌ 未找到民营医院拜访配置');
    return;
  }
  
  console.log('✓ 找到民营医院拜访配置\n');
  
  // 查找dateInterval规则（更宽松的匹配）
  const dateIntervalMatches = [...privateHospitalSection[1].matchAll(/field:\s*"([^"]+)"[\s\S]*?type:\s*"dateInterval"[\s\S]*?params:\s*\{([^}]+)\}[\s\S]*?message:\s*"([^"]+)"/g)];
  
  console.log('📝 dateInterval 规则:');
  console.log('-'.repeat(80));
  
  let allCorrect = true;
  dateIntervalMatches.forEach((match, index) => {
    const field = match[1];
    const params = match[2];
    const message = match[3];
    
    console.log(`\n规则 ${index + 1}:`);
    console.log(`  field: "${field}"`);
    console.log(`  params: {${params}}`);
    console.log(`  message: "${message}"`);
    
    if (field === 'visitStartTime') {
      console.log('  ✅ 正确 - field应该是visitStartTime（日期字段）');
    } else {
      console.log(`  ❌ 错误 - field应该是visitStartTime而不是"${field}"`);
      allCorrect = false;
    }
  });
  
  console.log('\n\n📊 检查结果:');
  console.log('=' .repeat(80));
  
  if (allCorrect && dateIntervalMatches.length > 0) {
    console.log('✅ 所有dateInterval规则的field配置正确！');
    console.log('\n修复说明:');
    console.log('  - dateInterval规则的field应该指向日期字段（visitStartTime）');
    console.log('  - groupBy参数用于指定分组依据（hospitalName或doctorName）');
    console.log('  - 这样系统才能从正确的列读取日期值进行间隔计算');
    console.log('\n✨ 修复后，系统将能够正确检测:');
    console.log('  - 同一实施人在2日内重复访问同一医院');
    console.log('  - 同一实施人在7日内重复访问同一医生');
  } else if (dateIntervalMatches.length === 0) {
    console.log('⚠️ 未找到dateInterval规则');
  } else {
    console.log('❌ 仍有配置错误，请检查上述标记为❌的规则');
  }
  
  // 同样检查基层医疗机构拜访
  console.log('\n\n📋 检查基层医疗机构拜访配置:');
  console.log('=' .repeat(80));
  
  const primaryCareSection = content.match(/基层医疗机构拜访:\s*\{[\s\S]*?validationRules:\s*\[([\s\S]*?)\]\s*,?\s*\}/);
  
  if (primaryCareSection) {
    const dateIntervalMatches2 = [...primaryCareSection[1].matchAll(/field:\s*"([^"]+)"[\s\S]*?type:\s*"dateInterval"[\s\S]*?params:\s*\{([^}]+)\}[\s\S]*?message:\s*"([^"]+)"/g)];
    
    let allCorrect2 = true;
    dateIntervalMatches2.forEach((match, index) => {
      const field = match[1];
      const message = match[3];
      
      console.log(`规则 ${index + 1}: field="${field}", message="${message}"`);
      
      if (field !== 'visitStartTime') {
        console.log(`  ❌ 错误`);
        allCorrect2 = false;
      } else {
        console.log(`  ✅ 正确`);
      }
    });
    
    if (allCorrect2 && dateIntervalMatches2.length > 0) {
      console.log('\n✅ 基层医疗机构拜访配置也已修复！');
    }
  }
}

testValidation().catch(error => {
  console.error('❌ 测试失败:', error.message);
  console.error(error.stack);
  process.exit(1);
});
