// 测试医院和联系人创建功能的集成
const AutomationCodeGeneratorEnhanced = require('./js/automation-generator-enhanced.js');

// 测试数据
const testData = [
    { name: "张三", sex: "男", time: "09.01", assignee: "李伟", hospital: "北京医院", address: "北京市朝阳区" },
    { name: "李四", sex: "女", time: "09.01", assignee: "李伟", hospital: "上海医院", address: "上海市浦东新区" }
];

// 测试有医院的配置（六味患者问卷）
const configWithChannel = {
    name: "六味患者问卷",
    hasChannel: true,
    contactType: "患者",
    labelName: "患者姓名"
};

// 测试无医院的配置（西黄消费者问卷）  
const configNoChannel = {
    name: "西黄消费者问卷",
    hasChannel: false,
    contactType: "消费者",
    labelName: "姓名"
};

console.log("=".repeat(60));
console.log("测试1: 有医院的问卷（六味患者问卷）");
console.log("=".repeat(60));

try {
    const generator1 = new AutomationCodeGeneratorEnhanced(configWithChannel);
    const code1 = generator1.generateCode(testData, "李伟", "09.01", false);
    
    // 检查是否包含医院创建功能
    if (code1.includes("startAddChannel")) {
        console.log("✅ 包含医院创建功能 (startAddChannel)");
    } else {
        console.log("❌ 缺少医院创建功能");
    }
    
    // 检查是否包含联系人创建功能
    if (code1.includes("startAddContact")) {
        console.log("✅ 包含联系人创建功能 (startAddContact)");
    } else {
        console.log("❌ 缺少联系人创建功能");
    }
    
    // 检查控制面板是否有创建医院按钮
    if (code1.includes("创建医院")) {
        console.log("✅ 控制面板包含创建医院按钮");
    } else {
        console.log("❌ 控制面板缺少创建医院按钮");
    }
    
} catch(e) {
    console.error("❌ 生成代码失败:", e.message);
}

console.log("\n" + "=".repeat(60));
console.log("测试2: 无医院的问卷（西黄消费者问卷）");
console.log("=".repeat(60));

try {
    const generator2 = new AutomationCodeGeneratorEnhanced(configNoChannel);
    const code2 = generator2.generateCode(testData, "李伟", "09.01", false);
    
    // 检查是否不包含医院创建功能（应该为空或空字符串）
    if (!code2.includes("startAddChannel") && !code2.includes("医院创建逻辑")) {
        console.log("✅ 正确地排除了医院创建功能");
    } else {
        console.log("❌ 错误地包含了医院创建功能");
        // 输出调试信息
        if (code2.includes("startAddChannel")) {
            console.log("  - 找到 startAddChannel");
        }
        if (code2.includes("医院创建逻辑")) {
            console.log("  - 找到 医院创建逻辑");
        }
    }
    
    // 检查是否包含联系人创建功能
    if (code2.includes("startAddContact")) {
        console.log("✅ 包含联系人创建功能 (startAddContact)");
    } else {
        console.log("❌ 缺少联系人创建功能");
    }
    
    // 检查控制面板是否没有创建医院按钮
    if (!code2.includes("创建医院")) {
        console.log("✅ 控制面板正确地没有创建医院按钮");
    } else {
        console.log("❌ 控制面板错误地包含了创建医院按钮");
    }
    
} catch(e) {
    console.error("❌ 生成代码失败:", e.message);
}

console.log("\n" + "=".repeat(60));
console.log("测试3: API模式");  
console.log("=".repeat(60));

try {
    const generator3 = new AutomationCodeGeneratorEnhanced(configWithChannel);
    const code3 = generator3.generateCode(testData, "李伟", "09.01", true);
    
    // 检查API模式是否也包含创建功能
    if (code3.includes("startAddChannel") && code3.includes("startAddContact")) {
        console.log("✅ API模式包含医院和联系人创建功能");
    } else {
        console.log("❌ API模式缺少创建功能");
    }
    
} catch(e) {
    console.error("❌ API模式生成代码失败:", e.message);
}

console.log("\n✅ 测试完成！");