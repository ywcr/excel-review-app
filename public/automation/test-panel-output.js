// 输出控制面板代码以调试
const fs = require('fs');
const AutomationCodeGeneratorEnhanced = require('./js/automation-generator-enhanced.js');

// 测试无医院的配置
const configNoChannel = {
    name: "西黄消费者问卷",
    hasChannel: false,
    contactType: "消费者",
    labelName: "姓名"
};

const generator = new AutomationCodeGeneratorEnhanced(configNoChannel);
const controlPanelCode = generator.getControlPanelCode(false);

// 保存到文件
fs.writeFileSync('control-panel-output.txt', controlPanelCode, 'utf8');
console.log("✅ 控制面板代码已保存到 control-panel-output.txt");

// 查找 hasChannel 相关的替换
const lines = controlPanelCode.split('\n');
lines.forEach((line, index) => {
    if (line.includes('false') && (line.includes('btnAddChannel') || line.includes('创建医院'))) {
        console.log(`Line ${index}: ${line.trim()}`);
    }
});