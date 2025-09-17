// 输出生成的代码以便检查
const fs = require('fs');
const AutomationCodeGeneratorEnhanced = require('./js/automation-generator-enhanced.js');

// 测试数据
const testData = [
    { name: "张三", sex: "男", time: "09.01", assignee: "李伟", hospital: "北京医院", address: "北京市朝阳区" }
];

// 无医院的配置
const configNoChannel = {
    name: "西黄消费者问卷",
    hasChannel: false,
    contactType: "消费者",
    labelName: "姓名"
};

try {
    const generator = new AutomationCodeGeneratorEnhanced(configNoChannel);
    const code = generator.generateCode(testData, "李伟", "09.01", false);
    
    // 保存到文件
    fs.writeFileSync('test-output-no-channel.js', code, 'utf8');
    console.log("✅ 代码已保存到 test-output-no-channel.js");
    
    // 检查是否包含医院创建相关内容
    if (code.includes('startAddChannel')) {
        console.log("❌ 发现 startAddChannel");
    }
    if (code.includes('医院创建逻辑')) {
        console.log("❌ 发现 医院创建逻辑");
    }
    if (code.includes('创建医院')) {
        console.log("❌ 发现 创建医院 按钮");
    }
    
} catch(e) {
    console.error("❌ 生成代码失败:", e.message);
}