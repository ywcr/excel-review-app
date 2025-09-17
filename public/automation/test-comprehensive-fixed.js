const AutomationCodeGeneratorEnhanced = require('./js/automation-generator-enhanced.js');

// 测试用的数据
const testData = [{
    assignee: '测试员',
    hospital: '测试医院',  // 修改为 hospital 字段
    address: '北京市朝阳区',
    name: '张三',
    sex: '男',
    mainName: '张三',
    mainPhone: '13800138000',
    mainPhone_encrypt: 'xxx',
    time: '12.01'
}];

console.log('=' .repeat(70));
console.log('综合测试: hasChannel 配置对生成代码的影响');
console.log('=' .repeat(70));

// 测试 hasChannel=false 的情况
console.log('\n[测试 1] hasChannel = false');
console.log('-'.repeat(40));

const configFalse = {
    type: '消费者满意度',
    hasChannel: false,
    questions: []
};

const generatorFalse = new AutomationCodeGeneratorEnhanced(configFalse);

// 生成 DOM 模式代码
const domCodeFalse = generatorFalse.generateCode(testData, '测试员', '12.01', false);

// 生成 API 模式代码
const apiCodeFalse = generatorFalse.generateCode(testData, '测试员', '12.01', true);

// 获取控制面板代码
const panelCodeFalse = generatorFalse.getControlPanelCode(false);

// 检查各种医院相关关键字（这些是实际生成代码中会出现的）
const hospitalKeywords = [
    '创建医院',
    'btnAddChannel',
    'startAddChannel',
    'addChannel',  // 实际的函数名
    '医院创建逻辑'  // 注释标记
];

let failedFalse = false;
hospitalKeywords.forEach(keyword => {
    const inDom = domCodeFalse.includes(keyword);
    const inApi = apiCodeFalse.includes(keyword);
    const inPanel = panelCodeFalse.includes(keyword);
    
    if (inDom || inApi || inPanel) {
        console.log(`❌ 发现 "${keyword}" 在:`);
        if (inDom) console.log('   - DOM 代码中');
        if (inApi) console.log('   - API 代码中');
        if (inPanel) console.log('   - 控制面板代码中');
        failedFalse = true;
    }
});

if (!failedFalse) {
    console.log('✅ 所有生成的代码都正确排除了医院创建逻辑');
}

// 测试 hasChannel=true 的情况
console.log('\n[测试 2] hasChannel = true');
console.log('-'.repeat(40));

const configTrue = {
    type: '医生满意度',
    hasChannel: true,
    questions: []
};

const generatorTrue = new AutomationCodeGeneratorEnhanced(configTrue);

// 生成 DOM 模式代码
const domCodeTrue = generatorTrue.generateCode(testData, '测试员', '12.01', false);

// 生成 API 模式代码
const apiCodeTrue = generatorTrue.generateCode(testData, '测试员', '12.01', true);

// 获取控制面板代码
const panelCodeTrue = generatorTrue.getControlPanelCode(false);

// 检查必需的医院关键字（实际生成的关键字）
const requiredKeywords = [
    'startAddChannel',  // 启动函数
    'addChannel',       // 核心创建函数
    '医院创建逻辑'      // 标识注释
];

let failedTrue = false;
requiredKeywords.forEach(keyword => {
    const inDom = domCodeTrue.includes(keyword);
    const inApi = apiCodeTrue.includes(keyword);
    
    if (!inDom && !inApi) {  // 两个都不包含时才报错
        console.log(`❌ DOM和API代码都缺少 "${keyword}"`);
        failedTrue = true;
    } else if (!inDom) {
        console.log(`⚠️ 仅DOM代码缺少 "${keyword}" (这可能是正常的)`);
    } else if (!inApi) {
        console.log(`⚠️ 仅API代码缺少 "${keyword}" (这可能是正常的)`);
    }
});

// 检查控制面板
if (!panelCodeTrue.includes('创建医院')) {
    console.log('❌ 控制面板缺少 "创建医院" 按钮');
    failedTrue = true;
} else {
    console.log('✅ 控制面板包含 "创建医院" 按钮');
}

if (!failedTrue) {
    console.log('✅ 所有生成的代码都正确包含了医院创建逻辑');
}

// 统计关键元素
console.log('\n[统计分析]');
console.log('-'.repeat(40));

const countOccurrences = (str, keyword) => {
    const matches = str.match(new RegExp(keyword, 'g'));
    return matches ? matches.length : 0;
};

console.log('hasChannel=false 时的代码:');
console.log(`  DOM代码长度: ${domCodeFalse.length} 字符`);
console.log(`  API代码长度: ${apiCodeFalse.length} 字符`);
console.log(`  医院相关关键字总数: ${hospitalKeywords.reduce((sum, kw) => sum + countOccurrences(domCodeFalse + apiCodeFalse + panelCodeFalse, kw), 0)}`);

console.log('\nhasChannel=true 时的代码:');
console.log(`  DOM代码长度: ${domCodeTrue.length} 字符`);
console.log(`  API代码长度: ${apiCodeTrue.length} 字符`);
console.log(`  医院相关关键字总数: ${requiredKeywords.reduce((sum, kw) => sum + countOccurrences(domCodeTrue + apiCodeTrue + panelCodeTrue, kw), 0)}`);

// 总结
console.log('\n' + '=' .repeat(70));
if (!failedFalse && !failedTrue) {
    console.log('✅ 所有测试通过！hasChannel 配置正常工作');
} else if (!failedFalse) {
    console.log('⚠️ 部分测试通过：hasChannel=false 正常，hasChannel=true 有问题');
} else if (!failedTrue) {
    console.log('⚠️ 部分测试通过：hasChannel=true 正常，hasChannel=false 有问题');
} else {
    console.log('❌ 测试失败！两种配置都有问题');
}
console.log('=' .repeat(70));