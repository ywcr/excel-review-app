// 测试hasChannel条件生成
const AutomationCodeGeneratorEnhanced = require('./js/automation-generator-enhanced.js');

// 测试无医院的配置
const configNoChannel = {
    name: "西黄消费者问卷",
    hasChannel: false,
    contactType: "消费者",
    labelName: "姓名"
};

const generator = new AutomationCodeGeneratorEnhanced(configNoChannel);

// 查看getExecutionLogic的输出
const executionLogic = generator.getExecutionLogic();

// 检查是否包含医院创建逻辑
if (executionLogic.includes('医院创建逻辑')) {
    console.log("❌ getExecutionLogic 包含医院创建逻辑");
    const lines = executionLogic.split('\n');
    lines.forEach((line, index) => {
        if (line.includes('医院创建逻辑') || line.includes('startAddChannel')) {
            console.log(`Line ${index}: ${line}`);
        }
    });
} else {
    console.log("✅ getExecutionLogic 不包含医院创建逻辑");
}

// 检查生成的控制面板代码
const controlPanelCode = generator.getControlPanelCode(false);
if (controlPanelCode.includes('创建医院')) {
    console.log("❌ 控制面板包含创建医院按钮");
    
    // 查找具体问题
    const lines = controlPanelCode.split('\n');
    lines.forEach((line, index) => {
        if (line.includes('创建医院') || line.includes('btnAddChannel')) {
            console.log(`Line ${index}: ${line.trim()}`);
        }
    });
} else {
    console.log("✅ 控制面板不包含创建医院按钮");
}

console.log("\nhasChannel值:", configNoChannel.hasChannel);
console.log("Generator config hasChannel值:", generator.config.hasChannel);