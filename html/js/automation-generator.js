// ==================== 自动化代码生成模块 ====================

/**
 * 自动化代码生成器类
 */
class AutomationCodeGenerator {
    constructor(config) {
        this.config = config;
    }

    /**
     * 生成完整的自动化代码
     */
    generateCode(data, assignee, date, useApiMode = false) {
        // 验证输入参数
        if (!data || !Array.isArray(data)) {
            throw new Error(`数据参数无效: ${typeof data}, 期望数组`);
        }

        if (!assignee || typeof assignee !== 'string') {
            throw new Error(`指派人参数无效: ${typeof assignee}, 期望字符串`);
        }

        if (!date || typeof date !== 'string') {
            throw new Error(`日期参数无效: ${typeof date}, 期望字符串`);
        }

        if (!this.config || typeof this.config !== 'object') {
            throw new Error(`配置参数无效: ${typeof this.config}, 期望对象`);
        }

        console.log('🔍 AutomationCodeGenerator.generateCode 调试信息:');
        console.log('- 输入数据总数:', data.length);
        console.log('- 目标指派人:', assignee);
        console.log('- 目标日期:', date);
        console.log('- 使用API模式:', useApiMode);
        console.log('- 数据示例:', data.slice(0, 2));

        const filteredData = data.filter(item =>
            item.assignee === assignee && item.time === date
        );

        console.log('- 过滤后数据数量:', filteredData.length);
        if (filteredData.length > 0) {
            console.log('- 过滤后数据示例:', filteredData[0]);
        }

        if (filteredData.length === 0) {
            const availableAssignees = [...new Set(data.map(item => item.assignee))];
            const availableDates = [...new Set(data.map(item => item.time))];
            throw new Error(`没有找到匹配的数据。可用指派人: [${availableAssignees.join(', ')}], 可用日期: [${availableDates.join(', ')}]`);
        }

        try {
            const codeTemplate = useApiMode ? this.getApiCodeTemplate() : this.getCodeTemplate();
            const questionLogic = this.getQuestionLogic();
            const executionLogic = useApiMode ? this.getApiExecutionLogic() : this.getExecutionLogic();

            const result = codeTemplate
                .replace('{{DATA}}', JSON.stringify(filteredData, null, 4))
                .replace('{{DATE}}', date)
                .replace('{{QUESTION_LOGIC}}', questionLogic)
                .replace('{{EXECUTION_LOGIC}}', executionLogic)
                .replace('{{CONFIG}}', JSON.stringify(this.config, null, 4));

            console.log('✅ 代码生成成功，长度:', result.length);
            return result;
        } catch (error) {
            console.error('❌ 代码生成过程中出错:', error);
            throw new Error(`代码生成失败: ${error.message}`);
        }
    }

    /**
     * 生成包含所有日期的完整自动化代码
     */
    generateAllDatesCode(data, assignee, dates, useApiMode = false) {
        // 验证输入参数
        if (!data || !Array.isArray(data)) {
            throw new Error(`数据参数无效: ${typeof data}, 期望数组`);
        }

        if (!assignee || typeof assignee !== 'string') {
            throw new Error(`指派人参数无效: ${typeof assignee}, 期望字符串`);
        }

        if (!dates || !Array.isArray(dates)) {
            throw new Error(`日期参数无效: ${typeof dates}, 期望数组`);
        }

        if (!this.config || typeof this.config !== 'object') {
            throw new Error(`配置参数无效: ${typeof this.config}, 期望对象`);
        }

        console.log('🔍 AutomationCodeGenerator.generateAllDatesCode 调试信息:');
        console.log('- 输入数据总数:', data.length);
        console.log('- 目标指派人:', assignee);
        console.log('- 包含日期:', dates);
        console.log('- 数据示例:', data.slice(0, 2));

        if (data.length === 0) {
            throw new Error('没有找到任何数据');
        }

        try {
            const codeTemplate = useApiMode ? this.getAllDatesApiCodeTemplate() : this.getAllDatesCodeTemplate();
            const questionLogic = this.getQuestionLogic();
            const executionLogic = useApiMode ? this.getAllDatesApiExecutionLogic() : this.getAllDatesExecutionLogic();

            const result = codeTemplate
                .replace('{{DATA}}', JSON.stringify(data, null, 4))
                .replace('{{ASSIGNEE}}', assignee)
                .replace('{{DATES}}', JSON.stringify(dates, null, 4))
                .replace('{{QUESTION_LOGIC}}', questionLogic)
                .replace('{{EXECUTION_LOGIC}}', executionLogic)
                .replace('{{CONFIG}}', JSON.stringify(this.config, null, 4));

            console.log('✅ 全日期代码生成成功，长度:', result.length);
            return result;
        } catch (error) {
            console.error('❌ 全日期代码生成过程中出错:', error);
            throw new Error(`全日期代码生成失败: ${error.message}`);
        }
    }

    /**
     * 获取基础代码模板
     */
    getCodeTemplate() {
        return `
// ==================== 自动化执行代码 ====================
// 使用步骤：
// 1. 解析Excel数据，赋值给data
// 2. 进入调查问卷页面，点创建任务，进入创建任务页面
// 3. 指定实时日期 date 
// 4. 执行start()执行脚本

const data = {{DATA}};
const config = {{CONFIG}};

console.log("全部数据", data);

// 实施时间
let date = '{{DATE}}';
let year = (new Date()).getFullYear();

// DOM操作相关变量
const contentWindow = document.querySelector('#ssfwIframe')?.contentWindow ?? window;

// 获取问卷相关数据
const questions = getValueFromIframe('questions');
const options = getValueFromIframe('options');
const types = getValueFromIframe('types');

// DOM查找值
function getValueFromIframe(name) {
    return contentWindow.document.querySelector(\`input[name=\${name}]\`);
}

// 设置输入框值
function setInputValue(name, value) {
    const items = contentWindow.document.querySelectorAll('.main')[0].querySelectorAll('.layui-form-item');
    for (let item of items) {
        const label = item.querySelector('label').innerText.replace('*', '').replaceAll(' ', '');
        if (label !== name) {
            continue;
        }
        const list = item.querySelectorAll('input');
        list[list.length - 1].value = value;
        return;
    }
}

// 设置选项值
function setOptionValue(index, values) {
    const mainElements = contentWindow.document.querySelectorAll('.main');

    if (mainElements.length < 2) {
        console.error('页面结构异常：找不到足够的.main元素，需要至少2个（输入框和问卷内容）');
        console.log('当前找到的.main元素数量:', mainElements.length);
        return;
    }

    // 问卷内容在第二个.main元素中
    const items = mainElements[1].querySelectorAll('.layui-form-item');

    if (index >= items.length) {
        console.error(\`索引\${index}超出范围，总共只有\${items.length}个表单项\`);
        return;
    }

    if (!Array.isArray(values)) {
        values = [values];
    }

    values.forEach(val => {
        const targetItem = items[index];
        const inputElement = targetItem.querySelector(\`input[value="\${val}"]\`);
        if (inputElement && inputElement.nextElementSibling) {
            inputElement.nextElementSibling.click();
            console.log(\`成功点击第\${index}个问题的选项: \${val}\`);
        } else {
            console.error(\`第\${index}个问题：未找到选项值为"\${val}"的元素\`);
            const availableOptions = Array.from(targetItem.querySelectorAll('input')).map(inp => inp.value);
            console.log('可用选项:', availableOptions);
        }
    });
}

// 随机生成数
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// 按比例随机选择答案
function randomAnswerByRate(option1, option2, rate) {
    return Math.random() < rate ? option1[random(0, option1.length - 1)] : option2[random(0, option2.length - 1)];
}

{{QUESTION_LOGIC}}

{{EXECUTION_LOGIC}}

console.log("代码已生成，请在问卷页面执行 start() 或 automatic() 函数");
        `;
    }

    /**
     * 获取问题逻辑代码
     */
    getQuestionLogic() {
        switch (this.config.name) {
            case '西黄消费者问卷':
                return this.getXihuangQuestionLogic();
            case '牛解消费者问卷':
                return this.getNiujieQuestionLogic();
            case '知柏消费者问卷':
                return this.getZhibaiQuestionLogic();
            case '六味患者问卷':
                return this.getLiuweiQuestionLogic();
            case '贴膏患者问卷':
                return this.getTiegaoQuestionLogic();
            default:
                return '// 未定义的问卷类型';
        }
    }

    /**
     * 西黄消费者问卷逻辑
     */
    getXihuangQuestionLogic() {
        return `
// ==================== 西黄消费者问卷答题逻辑 ====================

// 1、您的年龄是
function _answer0() {
    const option = ['20 岁以下','21~34 岁', '35~59','60 岁以上'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 2、您选择这家药店购买西黄丸的原因
function _answer1() {
    const option = ['价格实惠', '质量好', '交通便利','药品种类齐全','服务周到'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 3、您希望同仁堂在药店经常开展哪些活动
function _answer2() {
    const option = ['免费测血压', '坐堂医生', '药品促销', '提供更完善的药学服务'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 4、在药店购买西黄丸时，药店的哪种行为对你的购药选择影响最大
function _answer3() {
    const option = ['专业知识', '服务态度', '讲解能力','店员形象'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 5、在您选购西黄丸时，营业人员给您提供服务时的耐心程度如何？
function _answer4() {
    const option = ['很耐心','一般','不耐心'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 6、您在购买西黄丸时，营业人员中医药专业知识如何？
function _answer5() {
    const option = ['很专业', '一般专业','不专业'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 7、在您购买西黄丸时，药师是否详细询问您的疾病情况？
function _answer6() {
    const option = ['每次都是', '多数', '偶尔','从不'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 8、在您购买西黄丸时，药师是否向您说明中成药的使用禁忌和注意事项？
function _answer7() {
    const option = ['每次都是','多数','偶尔','从不'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 9、您是否满意药店推荐给您的西黄丸的药物效果？
function _answer8() {
    return randomAnswerByRate(['是'],['否'],0.18);
}

// 10、您选购西黄丸时一般会考虑的因素?
function _answer9() {
    const option = ['疗效','品牌知名度','价格','味道'];
    const index = random(0, option.length - 1);
    return option[index];
}
        `;
    }

    /**
     * 牛解消费者问卷逻辑
     */
    getNiujieQuestionLogic() {
        return `
// ==================== 牛解消费者问卷答题逻辑 ====================

// 1、您的年龄？
function _answer0() {
    const option = ['20岁以下', '20-35岁', '35-45岁','45-60岁','60岁以上'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 2、您的职业？
function _answer1(answer0) {
    const option = [];
    if (answer0 == "20岁以下") {
        option.push("学生");
    } else if (answer0 == "20-35岁") {
        option.push("企业或公司职工","政府工作人员","医药专业人士","个体户","学生");
    } else {
        option.push("企业或公司职工","政府工作人员","医药专业人士","个体户");
    }
    const index = random(0, option.length - 1);
    return option[index];
}

// 3、您一般购买牛黄解毒丸的渠道是？
function _answer2() {
    const option = ['网上购买', '等级医院', '药店', '社区乡镇医院'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 4、您一般选购牛黄解毒丸的依据是什么？
function _answer3() {
    const option = ['遵医嘱', '电视广告', '网络、杂志介绍','药店服务人员推荐','亲朋好友推荐','个人经验'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 5、影响您选择同仁堂品牌药品的因素有哪些？
function _answer4() {
    const option = ['疗效', '价格', '服务','品牌规模','医生推荐','广告普及度'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 6、对于药品广告您主要通过哪类媒体了解？
function _answer5() {
    const option = ['电视', '网络', '杂志','传单','户外广告'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 7、您对药品广告的信任程度是？
function _answer6() {
    return randomAnswerByRate(['非常信任', '信任'],['不一定','不信任','非常不信任'],0.19);
}

// 8、您选择药店会考虑哪些因素？
function _answer7() {
    const option = ['离家较近', '口碑更好', '药师服务更好', '药店专业形象', '家人朋友推荐'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 9、您在药店购买药品比较在意哪几点？
function _answer8() {
    const option = ['药品价格', '店员是否会乱推荐', '药品不良反应', '无法判断疗效', '副作用','是否医保'];
    const index = random(0, option.length - 1);
    return option[index];
}
        `;
    }

    /**
     * 知柏消费者问卷逻辑
     */
    getZhibaiQuestionLogic() {
        return `
// ==================== 知柏消费者问卷答题逻辑 ====================

// 1、您的年龄？
function _answer0() {
    const option = ['20岁以下', '20-35岁', '35-45岁','45-60岁','60岁以上'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 2、您在什么情况下会去药店买药？
function _answer1() {
    const option = ['身体不适', '自身保健需要', '为亲友购药','咨询用药问题','药店有促销活动'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 3、您选择药店会考虑哪些因素？
function _answer2() {
    const option = ['离家较近', '口碑更好', '药师服务更好', '药店专业形象', '家人朋友推荐'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 4、您买知柏地黄丸时是否会受周围药品广告的影响？
function _answer3() {
    const option = ['会，但是影响不大', '不会', '会，而且影响很大'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 5、您选择这家药店购买知柏地黄丸的原因
function _answer4(answer2) {
    const option = [];
    if (answer2 == '离家较近') {
        option.push('交通便利');
    } else if (answer2 == '口碑更好') {
        option.push('质量好');
    } else if (answer2 == '药师服务更好') {
        option.push('服务周到');
    } else {
        option.push('价格实惠', '质量好', '交通便利','药品种类齐全','服务周到');
    }
    const index = random(0, option.length - 1);
    return option[index];
}

// 6、在药店购买知柏地黄丸时，药店的哪种行为对你的购药选择影响最大
function _answer5() {
    const option = ['专业知识', '服务态度', '讲解能力','店员形象'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 7、您在购买知柏地黄丸时，营业人员中医药专业知识如何？
function _answer6() {
    const option = ['很专业', '一般专业', '不专业'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 8、在您购买知柏地黄丸时，药师是否向您说明中成药的使用禁忌和注意事项？
function _answer7() {
    const option = ['每次都是','多数','偶尔','从不'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 9、您是否满意药店推荐给您的知柏地黄丸的药物效果？
function _answer8() {
    return randomAnswerByRate(['是'],['否'],0.18);
}
        `;
    }

    /**
     * 六味患者问卷逻辑
     */
    getLiuweiQuestionLogic() {
        return `
// ==================== 六味患者问卷答题逻辑 ====================

// 1、您服用六味地黄丸的主要原因是什么？
function _answer0() {
    const option = ['肾阴虚', '腰膝酸软', '头晕耳鸣', '医生建议', '其他'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 2、您对六味地黄丸的疗效满意吗？
function _answer1(answer0) {
    if (answer0 === '医生建议') {
        return randomAnswerByRate(['非常满意', '比较满意'], ['一般', '不满意'], 0.88);
    }
    return randomAnswerByRate(['非常满意', '比较满意'], ['一般', '不满意'], 0.75);
}

// 3、您服用六味地黄丸多长时间了？
function _answer2() {
    const option = ['1个月以内', '1-3个月', '3-6个月', '6个月以上'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 4、您在服用期间是否有不良反应？
function _answer3() {
    return randomAnswerByRate(['没有'], ['有轻微反应', '有明显反应'], 0.92);
}

// 5、您对医生的诊疗服务满意吗？
function _answer4() {
    const option = ['非常满意', '比较满意', '一般', '不满意'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 6、您是否会继续服用六味地黄丸？
function _answer5() {
    return randomAnswerByRate(['会继续'], ['不会继续', '不确定'], 0.82);
}

// 7、您是否会向他人推荐六味地黄丸？
function _answer6() {
    return randomAnswerByRate(['会推荐'], ['不会推荐', '不确定'], 0.80);
}
        `;
    }

    /**
     * 贴膏患者问卷逻辑
     */
    getTiegaoQuestionLogic() {
        return `
// ==================== 贴膏患者问卷答题逻辑 ====================

// 1、您是通过什么渠道了解到羚锐制药通络祛痛膏的？
function _answer0() {
    const option = ['医生推荐', '药店推荐', '朋友介绍','广告宣传'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 2、您使用通络祛痛膏是用于治疗哪种疾病或症状？
function _answer1() {
    const option = ['关节疼痛', '肌肉酸痛', '扭伤', '关节炎'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 3、您使用通络祛痛膏的频率是怎样的？
function _answer2() {
    const option = ['每天使用', '隔天使用', '按需使用'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 4、在使用通络祛痛膏之前，您是否尝试过其他类似的产品？
function _answer3() {
    const option = ['是，尝试过其他品牌的止痛膏', '否，这是第一次使用'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 5、您觉得通络祛痛膏的止痛效果如何？
function _answer4() {
    return randomAnswerByRate(['非常有效', '有效', '一般'], ['不太有效'], 0.10);
}

// 6、您是否会尝试羚锐制药的其他产品？
function _answer5() {
    const option = ['会，对该品牌有好感，愿意尝试其他产品', '可能会，看具体产品', '不会，只关注通络祛痛膏'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 7、您对通络祛痛膏的贴敷感受如何，是否容易引起皮肤过敏等不适？
function _answer6() {
    return randomAnswerByRate(['贴敷舒适', '无过敏反应', '贴敷后有轻微不适，但可忍受'], ['容易引起皮肤过敏'], 0.10);
}

// 8、您认为通络祛痛膏的使用方法是否方便？
function _answer7() {
    return randomAnswerByRate(['方便，易于操作'], ['不太方便，需要他人帮助'], 0.10);
}

// 9、您会推荐通络祛痛膏给其他人使用吗？
function _answer8() {
    const option = ['会，效果好，愿意推荐','看情况，如果别人有需要会推荐','不确定'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 10、您对通络祛痛膏的价格是否满意？
function _answer9() {
    return randomAnswerByRate(['满意，价格合理','可以接受'], ['不满意，价格过高'], 0.10);
}

// 11、您在使用通络祛痛膏的过程中，是否同时使用了其他药物或治疗方法？
function _answer10() {
    const option = ['是，同时使用了其他药物或治疗方法','否，仅使用了通络祛痛膏'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 12、您觉得通络祛痛膏的药效持续时间如何？
function _answer11() {
    const option = ['很长，能持续一段时间','一般，效果维持时间较短','不确定'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 13、您对羚锐制药这个品牌的印象如何？
function _answer12() {
    const option = ['品牌知名度高','信任度高','听说过，但了解不多','一般'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 14、对于通络祛痛膏的产品说明和包装，您有什么建议？
function _answer13() {
    const option = ['产品说明更加详细、易懂','包装更加方便使用、易于保存','增加防伪标识'];
    const index = random(0, option.length - 1);
    return option[index];
}
        `;
    }

    /**
     * 获取执行逻辑代码
     */
    getExecutionLogic() {
        const hasChannel = this.config.hasChannel;
        const contactType = this.config.contactType;
        const labelName = this.config.labelName;

        return `
// ==================== 执行逻辑 ====================

${hasChannel ? this.getChannelCreationLogic() : ''}

${this.getContactCreationLogic(contactType)}

// 创建任务函数
function createTask(name, sex) {
    setInputValue('实施日期', year + "-" + date.replace(/\\./g, '-'));
    setInputValue('${labelName}', name);
    setInputValue('性别', sex);
    
    // 设置问卷答案
    ${this.getAnswerSettingLogic()}
    
    // 提交表单
    setTimeout(function() {
        contentWindow.document.querySelector('.btn-over button').click();
    }, 5000);
}

// 过滤当前日期的数据
var exec_data = data.filter(item => {
    return item.time === date;
});
console.log(\`\${date}待执行数据\`, exec_data);

// ==================== 执行控制变量 ====================
var count = 0;
var i = 0;
var isAutomaticRunning = false;
var automaticTimer = null;
var maxExecutions = 100;

// 开始执行任务
async function start(num = 10000) {
    if (i >= exec_data.length) {
        console.log("✅ 当前日期任务完成！");
        return false;
    }

    const {name, sex, time} = exec_data[i];
    console.log(\`🚀 开始填表单[\${i + 1}/\${exec_data.length}]:\`, name, sex, exec_data[i]);
    count++;
    i++;
    createTask(name, sex);
    console.log('✅ 表单填写完成');
    return true;
}

// ==================== 增强的自动执行函数 ====================

// 基础自动执行函数（支持从指定索引开始）
function automatic(startIndex = 0, maxNum = 100) {
    if (isAutomaticRunning) {
        console.log("⚠️ 自动执行已在运行中，请先调用 pauseAutomatic() 停止");
        return;
    }

    i = startIndex;
    count = 0;
    maxExecutions = maxNum;
    isAutomaticRunning = true;

    console.log(\`🚀 开始自动执行，从索引 \${startIndex} 开始，最大执行 \${maxNum} 次\`);

    function executeNext() {
        if (!isAutomaticRunning) {
            console.log("⏸️ 自动执行已暂停");
            return;
        }

        if (count >= maxExecutions) {
            console.log(\`✅ 已达到最大执行次数(\${maxExecutions})，自动停止\`);
            stopAutomatic();
            return;
        }

        if (i >= exec_data.length) {
            console.log("✅ 所有任务执行完成！");
            stopAutomatic();
            return;
        }

        const success = start();
        if (success !== false) {
            automaticTimer = setTimeout(executeNext, 12650);
        } else {
            stopAutomatic();
        }
    }

    executeNext();
}

// 按日期顺序自动执行
function automaticByDate(startDate = null) {
    // 获取所有日期并排序
    const allDates = [...new Set(data.map(item => item.time))].sort();
    console.log("📅 可用日期列表：", allDates);

    let startDateIndex = 0;
    if (startDate) {
        startDateIndex = allDates.findIndex(date => date === startDate);
        if (startDateIndex === -1) {
            console.log(\`❌ 未找到指定日期: \${startDate}\`);
            console.log("📅 可用日期：", allDates.join(", "));
            return;
        }
    }

    console.log(\`🚀 按日期顺序自动执行，从日期 \${allDates[startDateIndex]} 开始\`);

    let currentDateIndex = startDateIndex;

    function executeByDate() {
        if (currentDateIndex >= allDates.length) {
            console.log("✅ 所有日期的任务都已完成！");
            return;
        }

        const currentDate = allDates[currentDateIndex];
        console.log(\`📅 开始执行日期: \${currentDate}\`);

        // 过滤当前日期的数据
        const dateData = data.filter(item => item.time === currentDate);

        if (dateData.length === 0) {
            console.log(\`⚠️ 日期 \${currentDate} 没有数据，跳过\`);
            currentDateIndex++;
            setTimeout(executeByDate, 1000);
            return;
        }

        // 更新exec_data为当前日期的数据
        exec_data = dateData;
        i = 0;
        count = 0;
        // 更新date变量为当前日期
        date = currentDate;

        // 执行当前日期的所有任务
        function executeDateTasks() {
            if (i >= exec_data.length) {
                console.log(\`✅ 日期 \${currentDate} 的任务完成，准备下一个日期\`);
                currentDateIndex++;
                setTimeout(executeByDate, 3000); // 日期间隔3秒
                return;
            }

            start();
            setTimeout(executeDateTasks, 12650);
        }

        executeDateTasks();
    }

    executeByDate();
}

// 按名称顺序自动执行
function automaticByName(startName = null) {
    // 按名称排序数据
    const sortedData = [...exec_data].sort((a, b) => {
        const nameA = a.name;
        const nameB = b.name;
        return nameA.localeCompare(nameB, 'zh-CN');
    });

    let startIndex = 0;
    if (startName) {
        startIndex = sortedData.findIndex(item =>
            item.name === startName
        );
        if (startIndex === -1) {
            console.log(\`❌ 未找到指定姓名: \${startName}\`);
            console.log("👥 可用姓名：", sortedData.map(item => item.name).join(", "));
            return;
        }
    }

    console.log(\`🚀 按姓名顺序自动执行，从 \${sortedData[startIndex].name} 开始\`);

    // 更新exec_data为排序后的数据
    exec_data = sortedData;
    automatic(startIndex);
}

// 暂停自动执行
function pauseAutomatic() {
    if (!isAutomaticRunning) {
        console.log("⚠️ 自动执行未在运行");
        return;
    }

    isAutomaticRunning = false;
    if (automaticTimer) {
        clearTimeout(automaticTimer);
        automaticTimer = null;
    }
    console.log(\`⏸️ 自动执行已暂停，当前进度: \${i}/\${exec_data.length}\`);
}

// 恢复自动执行
function resumeAutomatic() {
    if (isAutomaticRunning) {
        console.log("⚠️ 自动执行已在运行中");
        return;
    }

    console.log(\`▶️ 恢复自动执行，从索引 \${i} 继续\`);
    automatic(i, maxExecutions - count);
}

// 停止自动执行
function stopAutomatic() {
    isAutomaticRunning = false;
    if (automaticTimer) {
        clearTimeout(automaticTimer);
        automaticTimer = null;
    }
    console.log("⏹️ 自动执行已停止");
}

// 获取执行状态
function getExecutionStatus() {
    return {
        isRunning: isAutomaticRunning,
        currentIndex: i,
        totalCount: exec_data.length,
        executedCount: count,
        maxExecutions: maxExecutions,
        progress: exec_data.length > 0 ? ((i / exec_data.length) * 100).toFixed(1) + '%' : '0%'
    };
}

console.log("==================== 执行说明 ====================");
console.log("📋 基础执行：");
console.log("  - start() - 手动执行单个任务");
${hasChannel ? 'console.log("  - startAddChannel() - 创建医院");' : ''}
console.log("  - startAdd${contactType === '患者' ? 'Hz' : 'Hz'}() - 创建${contactType}");

console.log("\\n🤖 自动执行：");
console.log("  - automatic() - 基础自动执行（从头开始）");
console.log("  - automatic(startIndex) - 从指定索引开始自动执行");
console.log("  - automatic(startIndex, maxNum) - 从指定索引开始，最多执行maxNum次");

console.log("\\n📅 按日期执行：");
console.log("  - automaticByDate() - 按日期顺序执行所有日期");
console.log("  - automaticByDate('MM.DD') - 从指定日期开始按顺序执行");

console.log("\\n👥 按姓名执行：");
console.log("  - automaticByName() - 按姓名顺序执行");
console.log("  - automaticByName('姓名') - 从指定姓名开始按顺序执行");

console.log("\\n⏯️ 执行控制：");
console.log("  - pauseAutomatic() - 暂停自动执行");
console.log("  - resumeAutomatic() - 恢复自动执行");
console.log("  - stopAutomatic() - 停止自动执行");
console.log("  - getExecutionStatus() - 查看执行状态");

console.log("\\n💡 使用示例：");
console.log("  automatic(5, 20)  // 从第6个开始，最多执行20次");
console.log("  automaticByDate('11.15')  // 从11月15日开始按日期执行");
console.log("  automaticByName('张三')  // 从张三开始按姓名执行");

console.log("\\n📊 当前数据统计：");
console.log(\`  - 总数据量: \${data.length} 条\`);
console.log(\`  - 当前日期数据量: \${exec_data.length} 条\`);
console.log(\`  - 可用日期: \${[...new Set(data.map(item => item.time))].sort().join(', ')}\`);
        `;
    }

    /**
     * 获取渠道创建逻辑（医院创建）
     */
    getChannelCreationLogic() {
        return `
// ==================== 医院创建逻辑 ====================

// 创建医院
function addChannel(channelName, address) {
    return new Promise((resolve) => {
        let adcode = getCode(address);
        $.ajax({
            url: "/lgb/qdkh/save",
            type: "POST",
            data: {
                recId: "",
                nvcVal: "",
                empRecId: "",
                channelName: channelName,
                channelType: "医院",
                address: address,
                adcode: adcode,
                remark: ""
            },
            traditional: true,
            success: function(res) {
                setTimeout(function() {
                    resolve();
                }, 2000);
            }
        });
    });
}

// 获取地区代码
function getCode(address) {
    // 简化的地区代码获取逻辑
    const codes = {
        '北京': '110000',
        '上海': '310000',
        '广州': '440100',
        '深圳': '440300',
        '杭州': '330100'
    };
    
    for (let city in codes) {
        if (address.includes(city)) {
            return codes[city];
        }
    }
    return '110000'; // 默认北京
}

// 执行创建医院任务
async function startAddChannel() {
    const uniqueAddresses = [...new Set(data.map(item => item.address || '北京市朝阳区'))];
    
    for (let i = 0; i < uniqueAddresses.length; i++) {
        const address = uniqueAddresses[i];
        const channelName = \`医院_\${i + 1}\`;
        await addChannel(channelName, address);
        console.log(i + "医院创建成功！" + channelName);
    }
    console.log("医院创建完毕！");
}
        `;
    }

    /**
     * 获取联系人创建逻辑
     */
    getContactCreationLogic(contactType) {
        return `
// ==================== ${contactType}创建逻辑 ====================

// 查询${contactType}是否存在
function getSame(name, sex) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/lgb/lxrgl/getMessage",
            type: "POST",
            data: {
                recId: "",
                nvcVal: "",
                empRecId: "",
                lxrType: "${contactType}",
                name: name,
                sex: sex,
                remark: ""
            },
            traditional: true,
            success: function(res) {
                setTimeout(function() {
                    resolve(res);
                }, 500);
            }
        });
    });
}

// 创建${contactType}
function addHuanzhe(name, sex) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/lgb/lxrgl/save",
            type: "POST",
            data: {
                recId: "",
                nvcVal: "",
                empRecId: "",
                lxrType: "${contactType}",
                name: name,
                sex: sex,
                remark: ""
            },
            traditional: true,
            success: function(res) {
                setTimeout(function() {
                    resolve();
                }, 2000);
            }
        });
    });
}

// 执行创建${contactType}任务
async function startAddHz() {
    for (let i = 0; i < data.length; i++) {
        let name = data[i].${contactType === '患者' ? 'name' : 'name'};
        let sex = data[i].sex;
        await getSame(name, sex).then(async (res) => {
            if (res.code == 0) {
                await addHuanzhe(name, sex);
                console.log(i + "添加成功！" + name);
            } else {
                console.log(i + "${contactType}已存在！" + name);
            }
        });
    }
    console.log("${contactType}创建完毕！");
}
        `;
    }

    /**
     * 获取答案设置逻辑
     */
    getAnswerSettingLogic() {
        switch (this.config.name) {
            case '西黄消费者问卷':
                return `
    setOptionValue(0, _answer0());
    setOptionValue(1, _answer1());
    setOptionValue(2, _answer2());
    setOptionValue(3, _answer3());
    setOptionValue(4, _answer4());
    setOptionValue(5, _answer5());
    setOptionValue(6, _answer6());
    setOptionValue(7, _answer7());
    setOptionValue(8, _answer8());
    setOptionValue(9, _answer9());
                `;
            case '牛解消费者问卷':
                return `
    let answer0 = _answer0();
    setOptionValue(0, answer0);
    setOptionValue(1, _answer1(answer0));
    setOptionValue(2, _answer2());
    setOptionValue(3, _answer3());
    setOptionValue(4, _answer4());
    setOptionValue(5, _answer5());
    setOptionValue(6, _answer6());
    setOptionValue(7, _answer7());
    setOptionValue(8, _answer8());
                `;
            case '知柏消费者问卷':
                return `
    let answer2 = _answer2();
    setOptionValue(0, _answer0());
    setOptionValue(1, _answer1());
    setOptionValue(2, answer2);
    setOptionValue(3, _answer3());
    setOptionValue(4, _answer4(answer2));
    setOptionValue(5, _answer5());
    setOptionValue(6, _answer6());
    setOptionValue(7, _answer7());
    setOptionValue(8, _answer8());
                `;
            case '六味患者问卷':
                return `
    let answer0 = _answer0();
    setOptionValue(0, answer0);
    setOptionValue(1, _answer1(answer0));
    setOptionValue(2, _answer2());
    setOptionValue(3, _answer3());
    setOptionValue(4, _answer4());
    setOptionValue(5, _answer5());
    setOptionValue(6, _answer6());
                `;
            case '贴膏患者问卷':
                return `
    setOptionValue(0, _answer0());
    setOptionValue(1, _answer1());
    setOptionValue(2, _answer2());
    setOptionValue(3, _answer3());
    setOptionValue(4, _answer4());
    setOptionValue(5, _answer5());
    setOptionValue(6, _answer6());
    setOptionValue(7, _answer7());
    setOptionValue(8, _answer8());
    setOptionValue(9, _answer9());
    setOptionValue(10, _answer10());
    setOptionValue(11, _answer11());
    setOptionValue(12, _answer12());
    setOptionValue(13, _answer13());
                `;
            default:
                return '// 未定义的问卷类型答案设置';
        }
    }

    /**
     * 获取全日期代码模板
     */
    getAllDatesCodeTemplate() {
        return `
// ==================== 全日期自动化执行代码 ====================
// 使用步骤：
// 1. 解析Excel数据，赋值给data
// 2. 进入调查问卷页面，点创建任务，进入创建任务页面
// 3. 执行相应的自动化函数

const data = {{DATA}};
const config = {{CONFIG}};
const targetAssignee = '{{ASSIGNEE}}';
const allDates = {{DATES}};

console.log("全部数据", data);
console.log("目标指派人", targetAssignee);
console.log("包含日期", allDates);

// 实施年份
let year = (new Date()).getFullYear();

// DOM操作相关变量
const contentWindow = document.querySelector('#ssfwIframe')?.contentWindow ?? window;

// 获取问卷相关数据
const questions = getValueFromIframe('questions');
const options = getValueFromIframe('options');
const types = getValueFromIframe('types');

// DOM查找值
function getValueFromIframe(name) {
    return contentWindow.document.querySelector(\`input[name=\${name}]\`);
}

// 设置输入框值
function setInputValue(name, value) {
    const items = contentWindow.document.querySelectorAll('.main')[0].querySelectorAll('.layui-form-item');
    for (let item of items) {
        const label = item.querySelector('label').innerText.replace('*', '').replaceAll(' ', '');
        if (label !== name) {
            continue;
        }
        const list = item.querySelectorAll('input');
        list[list.length - 1].value = value;
        return;
    }
}

// 设置选项值
function setOptionValue(index, values) {
    const mainElements = contentWindow.document.querySelectorAll('.main');

    if (mainElements.length < 2) {
        console.error('页面结构异常：找不到足够的.main元素，需要至少2个（输入框和问卷内容）');
        console.log('当前找到的.main元素数量:', mainElements.length);
        return;
    }

    // 问卷内容在第二个.main元素中
    const items = mainElements[1].querySelectorAll('.layui-form-item');

    if (index >= items.length) {
        console.error(\`索引\${index}超出范围，总共只有\${items.length}个表单项\`);
        return;
    }

    if (!Array.isArray(values)) {
        values = [values];
    }

    values.forEach(val => {
        const targetItem = items[index];
        const inputElement = targetItem.querySelector(\`input[value="\${val}"]\`);
        if (inputElement && inputElement.nextElementSibling) {
            inputElement.nextElementSibling.click();
            console.log(\`成功点击第\${index}个问题的选项: \${val}\`);
        } else {
            console.error(\`第\${index}个问题：未找到选项值为"\${val}"的元素\`);
            const availableOptions = Array.from(targetItem.querySelectorAll('input')).map(inp => inp.value);
            console.log('可用选项:', availableOptions);
        }
    });
}

// 随机生成数
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// 按比例随机选择答案
function randomAnswerByRate(option1, option2, rate) {
    return Math.random() < rate ? option1[random(0, option1.length - 1)] : option2[random(0, option2.length - 1)];
}

{{QUESTION_LOGIC}}

{{EXECUTION_LOGIC}}

console.log("==================== 全日期自动化代码已生成 ====================");
console.log("📋 可用执行函数：");
console.log("  - automaticByDate() - 按日期顺序执行所有日期");
console.log("  - automaticByDate('MM.DD') - 从指定日期开始执行");
console.log("  - automatic() - 执行所有数据");
console.log("  - getExecutionStatus() - 查看执行状态");
console.log("📊 数据统计：");
console.log(\`  - 总数据量: \${data.length} 条\`);
console.log(\`  - 包含日期: \${allDates.length} 个 [\${allDates.join(', ')}]\`);
        `;
    }

    /**
     * 获取全日期执行逻辑
     */
    getAllDatesExecutionLogic() {
        const hasChannel = this.config.hasChannel;
        const contactType = this.config.contactType;
        const labelName = this.config.labelName;

        return `
// ==================== 全日期执行逻辑 ====================

${hasChannel ? this.getChannelCreationLogic() : ''}

${this.getContactCreationLogic(contactType)}

// 创建任务函数
function createTask(name, sex) {
    setInputValue('实施日期', year + "-" + currentDate.replace(/\\./g, '-'));
    setInputValue('${labelName}', name);
    setInputValue('性别', sex);

    // 设置问卷答案
    ${this.getAnswerSettingLogic()}

    // 提交表单
    setTimeout(function() {
        contentWindow.document.querySelector('.btn-over button').click();
    }, 5000);
}

// ==================== 全日期执行控制变量 ====================
var currentDate = '';
var currentDateData = [];
var currentDateIndex = 0;
var currentItemIndex = 0;
var isAutomaticRunning = false;
var automaticTimer = null;
var maxExecutions = 1000;

// 按日期顺序自动执行所有日期
function automaticByDate(startDate = null) {
    if (isAutomaticRunning) {
        console.log("⚠️ 自动执行已在运行中，请先调用 pauseAutomatic() 停止");
        return;
    }

    let startDateIndex = 0;
    if (startDate) {
        startDateIndex = allDates.findIndex(date => date === startDate);
        if (startDateIndex === -1) {
            console.log(\`❌ 未找到指定日期: \${startDate}\`);
            console.log("📅 可用日期：", allDates.join(", "));
            return;
        }
    }

    console.log(\`🚀 开始按日期顺序自动执行，从日期 \${allDates[startDateIndex]} 开始\`);

    currentDateIndex = startDateIndex;
    currentItemIndex = 0;
    isAutomaticRunning = true;

    executeNextDate();
}

// 执行下一个日期
function executeNextDate() {
    if (!isAutomaticRunning) {
        console.log("⏸️ 自动执行已暂停");
        return;
    }

    if (currentDateIndex >= allDates.length) {
        console.log("✅ 所有日期的任务都已完成！");
        stopAutomatic();
        return;
    }

    currentDate = allDates[currentDateIndex];
    currentDateData = data.filter(item => item.time === currentDate);
    currentItemIndex = 0;

    console.log(\`📅 开始执行日期: \${currentDate}，共 \${currentDateData.length} 条数据\`);

    if (currentDateData.length === 0) {
        console.log(\`⚠️ 日期 \${currentDate} 没有数据，跳过\`);
        currentDateIndex++;
        setTimeout(executeNextDate, 1000);
        return;
    }

    executeNextItem();
}

// 执行下一个项目
function executeNextItem() {
    if (!isAutomaticRunning) {
        console.log("⏸️ 自动执行已暂停");
        return;
    }

    if (currentItemIndex >= currentDateData.length) {
        console.log(\`✅ 日期 \${currentDate} 的任务完成，准备下一个日期\`);
        currentDateIndex++;
        setTimeout(executeNextDate, 3000); // 日期间隔3秒
        return;
    }

    const item = currentDateData[currentItemIndex];
    const name = item.${contactType === '患者' ? 'name' : 'name'};
    const sex = item.sex;

    console.log(\`🚀 执行[\${currentDateIndex + 1}/\${allDates.length}][\${currentItemIndex + 1}/\${currentDateData.length}]: \${name} (\${currentDate})\`);

    createTask(name, sex);
    currentItemIndex++;

    setTimeout(executeNextItem, 12650); // 任务间隔12.65秒
}

// 执行所有数据（不按日期分组）
function automaticAll() {
    if (isAutomaticRunning) {
        console.log("⚠️ 自动执行已在运行中，请先调用 pauseAutomatic() 停止");
        return;
    }

    console.log(\`🚀 开始执行所有数据，共 \${data.length} 条\`);

    let index = 0;
    isAutomaticRunning = true;

    function executeNext() {
        if (!isAutomaticRunning) {
            console.log("⏸️ 自动执行已暂停");
            return;
        }

        if (index >= data.length) {
            console.log("✅ 所有任务执行完成！");
            stopAutomatic();
            return;
        }

        const item = data[index];
        currentDate = item.time;
        const name = item.${contactType === '患者' ? 'name' : 'name'};
        const sex = item.sex;

        console.log(\`🚀 执行[\${index + 1}/\${data.length}]: \${name} (\${currentDate})\`);

        createTask(name, sex);
        index++;

        setTimeout(executeNext, 12650);
    }

    executeNext();
}

// 暂停自动执行
function pauseAutomatic() {
    if (!isAutomaticRunning) {
        console.log("⚠️ 自动执行未在运行");
        return;
    }

    isAutomaticRunning = false;
    if (automaticTimer) {
        clearTimeout(automaticTimer);
        automaticTimer = null;
    }
    console.log(\`⏸️ 自动执行已暂停\`);
}

// 恢复自动执行
function resumeAutomatic() {
    if (isAutomaticRunning) {
        console.log("⚠️ 自动执行已在运行中");
        return;
    }

    console.log(\`▶️ 恢复自动执行\`);
    isAutomaticRunning = true;

    if (currentDate && currentDateData.length > 0) {
        // 恢复日期模式
        executeNextItem();
    } else {
        // 恢复普通模式
        automatic();
    }
}

// 停止自动执行
function stopAutomatic() {
    isAutomaticRunning = false;
    if (automaticTimer) {
        clearTimeout(automaticTimer);
        automaticTimer = null;
    }
    console.log("⏹️ 自动执行已停止");
}

// 获取执行状态
function getExecutionStatus() {
    if (currentDate && currentDateData.length > 0) {
        return {
            isRunning: isAutomaticRunning,
            mode: 'byDate',
            currentDate: currentDate,
            currentDateIndex: currentDateIndex + 1,
            totalDates: allDates.length,
            currentItemIndex: currentItemIndex + 1,
            currentDateTotal: currentDateData.length,
            overallProgress: \`日期进度: \${currentDateIndex + 1}/\${allDates.length}, 当前日期进度: \${currentItemIndex}/\${currentDateData.length}\`
        };
    } else {
        return {
            isRunning: isAutomaticRunning,
            mode: 'all',
            totalItems: data.length,
            overallProgress: '执行所有数据模式'
        };
    }
}

console.log("执行说明：");
console.log("📋 推荐执行方式：");
console.log("  - automaticByDate() - 按日期顺序执行所有日期（推荐）");
console.log("  - automaticByDate('MM.DD') - 从指定日期开始按顺序执行");
console.log("\\n🔧 控制函数：");
console.log("  - pauseAutomatic() - 暂停自动执行");
console.log("  - resumeAutomatic() - 恢复自动执行");
console.log("  - stopAutomatic() - 停止自动执行");
console.log("  - getExecutionStatus() - 查看执行状态");
${hasChannel ? 'console.log("\\n🏥 医院管理：");' : ''}
${hasChannel ? 'console.log("  - startAddChannel() - 创建医院");' : ''}
console.log("\\n👥 联系人管理：");
console.log("  - startAdd${contactType === '患者' ? 'Hz' : 'Hz'}() - 创建${contactType}");
        `;
    }

    /**
     * 获取API模式代码模板
     */
    getApiCodeTemplate() {
        return `
// ==================== API模式自动化执行代码 ====================
// 使用步骤：
// 1. 解析Excel数据，赋值给data
// 2. 在问卷页面执行此脚本
// 3. 调用相应的API函数开始自动化

const data = {{DATA}};
const config = {{CONFIG}};

console.log("全部数据", data);

// 实施时间
let date = '{{DATE}}';
let year = (new Date()).getFullYear();

// API相关配置
const API_BASE_URL = window.location.origin;
const PROJECT_ID = getProjectIdFromUrl() || '1756460958725101';
const CORP_ID = '1749721838789101';
const PROJECT_TPL = '1756451075934101';
const SPONSOR_PROJECT_ID = '1756451241652103';

// 从URL获取项目ID
function getProjectIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('projectId');
}

// 获取动态盐值
async function createDynamicsSalt() {
    try {
        const response = await fetch(\`\${API_BASE_URL}/lgb/payMerge/createDynamicsSalt?methodName=%2Fxfzwj%2Fadd\`, {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include'
        });
        
        const result = await response.json();
        if (result.code === 0) {
            console.log('✅ 动态盐值获取成功:', result.data);
            return result.data;
        } else {
            throw new Error(\`获取动态盐值失败: \${result.message}\`);
        }
    } catch (error) {
        console.error('❌ 获取动态盐值失败:', error);
        throw error;
    }
}

// 生成签名
function generateSign(data, signkey) {
    // 根据实际的签名算法实现
    // 这里使用MD5哈希算法，您可能需要根据实际算法调整
    
    // 简单的MD5实现（如果CryptoJS不可用，使用这个备用实现）
    function simpleMD5(str) {
        // 这是一个简化的MD5实现，实际项目中建议使用crypto-js库
        // 或者根据后端实际使用的签名算法进行调整
        let hash = 0;
        if (str.length === 0) return hash.toString();
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }
    
    // 构建签名字符串，根据实际API要求调整
    // 根据您的API文档，签名可能需要特定的数据组合方式
    const signString = data + signkey;
    
    // 优先使用CryptoJS，如果不可用则使用备用实现
    if (typeof CryptoJS !== 'undefined' && CryptoJS.MD5) {
        return CryptoJS.MD5(signString).toString();
    } else {
        return simpleMD5(signString);
    }
}

// 生成问卷数据
function generateQuestionnaireData(name, sex, answers) {
    const questions = getQuestionsFromConfig();
    const options = getOptionsFromConfig();
    const types = getTypesFromConfig();
    
    // 构建答案字符串
    const answerString = answers.join('#');
    const optionString = options.join('#');
    const typeString = types.join('#');
    
    // 构建答案参数
    let answerParams = '';
    answers.forEach((answer, index) => {
        answerParams += \`answer\${index}=\${encodeURIComponent(answer)}&\`;
    });
    
    const encryptedText = \`\${answerParams}answers=\${encodeURIComponent(answerString)}&corpId=\${CORP_ID}&dcdxName=\${encodeURIComponent(name)}&isForward=1&memo=\${encodeURIComponent('为了充分了解客户对于西黄丸产品评价，为更好的做好临床药学服务，促进产品在临床的安全合理的使用，便于下一步市场策略的规划，特进行本次问卷调查。')}&questions=\${encodeURIComponent(questions.join('#'))}&options=\${encodeURIComponent(optionString)}&types=\${encodeURIComponent(typeString)}\`;
    
    return {
        recId: '',
        nvcVal: '',
        latLng: '',
        projectId: PROJECT_ID,
        corpId: CORP_ID,
        projectTpl: PROJECT_TPL,
        sponsorProjectId: SPONSOR_PROJECT_ID,
        isForward: 1,
        title: '致和庆西黄丸消费者问卷',
        way: '实名调查',
        startTime: year + '-' + date.replace(/\\./g, '-'),
        memo: '为了充分了解客户对于西黄丸产品评价，为更好的做好临床药学服务，促进产品在临床的安全合理的使用，便于下一步市场策略的规划，特进行本次问卷调查。',
        dcdxName: name,
        fieldName: '性别',
        fill: sex,
        channelAddress: '',
        questions: questions.join('#'),
        options: optionString,
        types: typeString,
        answers: answerString,
        encryptedText: encryptedText
    };
}

// 从配置获取问题
function getQuestionsFromConfig() {
    return [
        '您的年龄是',
        '您选择这家药店购买西黄丸的原因',
        '您希望同仁堂在药店经常开展哪些活动',
        '在药店购买西黄丸时，药店的哪种行为对你的购药选择影响最大',
        '在您选购西黄丸时，营业人员给您提供服务时的耐心程度如何？',
        '您在购买西黄丸时，营业人员中医药专业知识如何？',
        '在您购买西黄丸时，药师是否详细询问您的疾病情况？',
        '在您购买西黄丸时，药师是否向您说明中成药的使用禁忌和注意事项？',
        '您是否满意药店推荐给您的西黄丸的药物效果？',
        '您选购西黄丸时一般会考虑的因素?'
    ];
}

// 从配置获取选项
function getOptionsFromConfig() {
    return [
        '20 岁以下;21~34 岁;35~59;60 岁以上',
        '价格实惠;质量好;交通便利;药品种类齐全;服务周到',
        '免费测血压;坐堂医生;药品促销;提供更完善的药学服务',
        '专业知识;服务态度;讲解能力;店员形象',
        '很耐心;一般;不耐心',
        '很专业;一般专业;不专业',
        '每次都是;多数;偶尔;从不',
        '每次都是;多数;偶尔;从不',
        '是;否',
        '疗效;品牌知名度;价格;味道'
    ];
}

// 从配置获取类型
function getTypesFromConfig() {
    return [
        '单选项', '单选项', '多选项', '单选项', '单选项', 
        '单选项', '单选项', '单选项', '单选项', '单选项'
    ];
}

// 提交问卷数据
async function submitQuestionnaire(name, sex, answers) {
    try {
        // 1. 获取动态盐值
        const signkey = await createDynamicsSalt();
        
        // 2. 生成签名
        const sign = generateSign('', signkey);
        
        // 3. 生成问卷数据
        const questionnaireData = generateQuestionnaireData(name, sex, answers);
        
        // 4. 提交数据
        const response = await fetch(\`\${API_BASE_URL}/lgb/xfzwj/add\`, {
            method: 'POST',
            headers: {
                'accept': '*/*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'sign': sign,
                'signkey': signkey,
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: new URLSearchParams(questionnaireData)
        });
        
        const result = await response.text();
        console.log('✅ 问卷提交成功:', result);
        return true;
    } catch (error) {
        console.error('❌ 问卷提交失败:', error);
        return false;
    }
}

{{QUESTION_LOGIC}}

{{EXECUTION_LOGIC}}

console.log("API模式代码已生成，请在问卷页面执行 startApi() 或 automaticApi() 函数");
        `;
    }

    /**
     * 获取API模式执行逻辑
     */
    getApiExecutionLogic() {
        return `
// ==================== API模式执行逻辑 ====================

// 创建任务函数（API模式）
async function createTaskApi(name, sex) {
    console.log(\`🚀 开始创建任务: \${name} (\${sex})\`);
    
    // 生成答案
    const answers = [
        _answer0(),
        _answer1(),
        _answer2(),
        _answer3(),
        _answer4(),
        _answer5(),
        _answer6(),
        _answer7(),
        _answer8(),
        _answer9()
    ];
    
    console.log('📝 生成的答案:', answers);
    
    // 提交问卷
    const success = await submitQuestionnaire(name, sex, answers);
    
    if (success) {
        console.log(\`✅ 任务创建成功: \${name}\`);
    } else {
        console.log(\`❌ 任务创建失败: \${name}\`);
    }
    
    return success;
}

// 过滤当前日期的数据
var exec_data = data.filter(item => {
    return item.time === date;
});
console.log(\`\${date}待执行数据\`, exec_data);

// ==================== API模式执行控制变量 ====================
var count = 0;
var i = 0;
var isAutomaticRunning = false;
var automaticTimer = null;
var maxExecutions = 100;

// 开始执行任务（API模式）
async function startApi(num = 10000) {
    if (i >= exec_data.length) {
        console.log("✅ 当前日期任务完成！");
        return false;
    }

    const {name, sex, time} = exec_data[i];
    console.log(\`🚀 开始填表单[\${i + 1}/\${exec_data.length}]:\`, name, sex, exec_data[i]);
    count++;
    i++;
    
    const success = await createTaskApi(name, sex);
    console.log(success ? '✅ 表单填写完成' : '❌ 表单填写失败');
    return success;
}

// ==================== API模式自动执行函数 ====================

// 基础自动执行函数（API模式）
function automaticApi(startIndex = 0, maxNum = 100) {
    if (isAutomaticRunning) {
        console.log("⚠️ 自动执行已在运行中，请先调用 pauseAutomatic() 停止");
        return;
    }

    i = startIndex;
    count = 0;
    maxExecutions = maxNum;
    isAutomaticRunning = true;

    console.log(\`🚀 开始API模式自动执行，从索引 \${startIndex} 开始，最大执行 \${maxNum} 次\`);

    async function executeNext() {
        if (!isAutomaticRunning) {
            console.log("⏸️ 自动执行已暂停");
            return;
        }

        if (count >= maxExecutions) {
            console.log(\`✅ 已达到最大执行次数(\${maxExecutions})，自动停止\`);
            stopAutomatic();
            return;
        }

        if (i >= exec_data.length) {
            console.log("✅ 所有任务执行完成！");
            stopAutomatic();
            return;
        }

        const success = await startApi();
        if (success !== false) {
            automaticTimer = setTimeout(executeNext, 3000); // API模式间隔3秒
        } else {
            stopAutomatic();
        }
    }

    executeNext();
}

// 按日期顺序自动执行（API模式）
function automaticByDateApi(startDate = null) {
    // 获取所有日期并排序
    const allDates = [...new Set(data.map(item => item.time))].sort();
    console.log("📅 可用日期列表：", allDates);

    let startDateIndex = 0;
    if (startDate) {
        startDateIndex = allDates.findIndex(date => date === startDate);
        if (startDateIndex === -1) {
            console.log(\`❌ 未找到指定日期: \${startDate}\`);
            console.log("📅 可用日期：", allDates.join(", "));
            return;
        }
    }

    console.log(\`🚀 按日期顺序API模式自动执行，从日期 \${allDates[startDateIndex]} 开始\`);

    let currentDateIndex = startDateIndex;

    async function executeByDate() {
        if (currentDateIndex >= allDates.length) {
            console.log("✅ 所有日期的任务都已完成！");
            return;
        }

        const currentDate = allDates[currentDateIndex];
        console.log(\`📅 开始执行日期: \${currentDate}\`);

        // 过滤当前日期的数据
        const dateData = data.filter(item => item.time === currentDate);

        if (dateData.length === 0) {
            console.log(\`⚠️ 日期 \${currentDate} 没有数据，跳过\`);
            currentDateIndex++;
            setTimeout(executeByDate, 1000);
            return;
        }

        // 更新exec_data为当前日期的数据
        exec_data = dateData;
        i = 0;
        count = 0;
        // 更新date变量为当前日期
        date = currentDate;

        // 执行当前日期的所有任务
        async function executeDateTasks() {
            if (i >= exec_data.length) {
                console.log(\`✅ 日期 \${currentDate} 的任务完成，准备下一个日期\`);
                currentDateIndex++;
                setTimeout(executeByDate, 3000); // 日期间隔3秒
                return;
            }

            await startApi();
            setTimeout(executeDateTasks, 3000); // API模式间隔3秒
        }

        executeDateTasks();
    }

    executeByDate();
}

// 暂停自动执行
function pauseAutomatic() {
    if (!isAutomaticRunning) {
        console.log("⚠️ 自动执行未在运行");
        return;
    }

    isAutomaticRunning = false;
    if (automaticTimer) {
        clearTimeout(automaticTimer);
        automaticTimer = null;
    }
    console.log(\`⏸️ 自动执行已暂停，当前进度: \${i}/\${exec_data.length}\`);
}

// 恢复自动执行
function resumeAutomatic() {
    if (isAutomaticRunning) {
        console.log("⚠️ 自动执行已在运行中");
        return;
    }

    console.log(\`▶️ 恢复自动执行，从索引 \${i} 继续\`);
    automaticApi(i, maxExecutions - count);
}

// 停止自动执行
function stopAutomatic() {
    isAutomaticRunning = false;
    if (automaticTimer) {
        clearTimeout(automaticTimer);
        automaticTimer = null;
    }
    console.log("⏹️ 自动执行已停止");
}

// 获取执行状态
function getExecutionStatus() {
    return {
        isRunning: isAutomaticRunning,
        currentIndex: i,
        totalCount: exec_data.length,
        executedCount: count,
        maxExecutions: maxExecutions,
        progress: exec_data.length > 0 ? ((i / exec_data.length) * 100).toFixed(1) + '%' : '0%'
    };
}

console.log("==================== API模式执行说明 ====================");
console.log("📋 基础执行：");
console.log("  - startApi() - 手动执行单个任务（API模式）");

console.log("\\n🤖 自动执行：");
console.log("  - automaticApi() - 基础自动执行（API模式，从头开始）");
console.log("  - automaticApi(startIndex) - 从指定索引开始自动执行（API模式）");
console.log("  - automaticApi(startIndex, maxNum) - 从指定索引开始，最多执行maxNum次（API模式）");

console.log("\\n📅 按日期执行：");
console.log("  - automaticByDateApi() - 按日期顺序执行所有日期（API模式）");
console.log("  - automaticByDateApi('MM.DD') - 从指定日期开始按顺序执行（API模式）");

console.log("\\n⏯️ 执行控制：");
console.log("  - pauseAutomatic() - 暂停自动执行");
console.log("  - resumeAutomatic() - 恢复自动执行");
console.log("  - stopAutomatic() - 停止自动执行");
console.log("  - getExecutionStatus() - 查看执行状态");

console.log("\\n💡 使用示例：");
console.log("  automaticApi(5, 20)  // 从第6个开始，最多执行20次（API模式）");
console.log("  automaticByDateApi('11.15')  // 从11月15日开始按日期执行（API模式）");

console.log("\\n📊 当前数据统计：");
console.log(\`  - 总数据量: \${data.length} 条\`);
console.log(\`  - 当前日期数据量: \${exec_data.length} 条\`);
console.log(\`  - 可用日期: \${[...new Set(data.map(item => item.time))].sort().join(', ')}\`);
console.log(\`  - 项目ID: \${PROJECT_ID}\`);
        `;
    }

    /**
     * 获取全日期API模式代码模板
     */
    getAllDatesApiCodeTemplate() {
        return `
// ==================== 全日期API模式自动化执行代码 ====================
// 使用步骤：
// 1. 解析Excel数据，赋值给data
// 2. 在问卷页面执行此脚本
// 3. 调用相应的API函数开始自动化

const data = {{DATA}};
const config = {{CONFIG}};
const targetAssignee = '{{ASSIGNEE}}';
const allDates = {{DATES}};

console.log("全部数据", data);
console.log("目标指派人", targetAssignee);
console.log("包含日期", allDates);

// 实施年份
let year = (new Date()).getFullYear();

// API相关配置
const API_BASE_URL = window.location.origin;
const PROJECT_ID = getProjectIdFromUrl() || '1756460958725101';
const CORP_ID = '1749721838789101';
const PROJECT_TPL = '1756451075934101';
const SPONSOR_PROJECT_ID = '1756451241652103';

// 从URL获取项目ID
function getProjectIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('projectId');
}

// 获取动态盐值
async function createDynamicsSalt() {
    try {
        const response = await fetch(\`\${API_BASE_URL}/lgb/payMerge/createDynamicsSalt?methodName=%2Fxfzwj%2Fadd\`, {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include'
        });
        
        const result = await response.json();
        if (result.code === 0) {
            console.log('✅ 动态盐值获取成功:', result.data);
            return result.data;
        } else {
            throw new Error(\`获取动态盐值失败: \${result.message}\`);
        }
    } catch (error) {
        console.error('❌ 获取动态盐值失败:', error);
        throw error;
    }
}

// 生成签名
function generateSign(data, signkey) {
    // 根据实际的签名算法实现
    // 这里使用MD5哈希算法，您可能需要根据实际算法调整
    
    // 简单的MD5实现（如果CryptoJS不可用，使用这个备用实现）
    function simpleMD5(str) {
        // 这是一个简化的MD5实现，实际项目中建议使用crypto-js库
        // 或者根据后端实际使用的签名算法进行调整
        let hash = 0;
        if (str.length === 0) return hash.toString();
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }
    
    // 构建签名字符串，根据实际API要求调整
    // 根据您的API文档，签名可能需要特定的数据组合方式
    const signString = data + signkey;
    
    // 优先使用CryptoJS，如果不可用则使用备用实现
    if (typeof CryptoJS !== 'undefined' && CryptoJS.MD5) {
        return CryptoJS.MD5(signString).toString();
    } else {
        return simpleMD5(signString);
    }
}

// 生成问卷数据
function generateQuestionnaireData(name, sex, answers) {
    const questions = getQuestionsFromConfig();
    const options = getOptionsFromConfig();
    const types = getTypesFromConfig();
    
    // 构建答案字符串
    const answerString = answers.join('#');
    const optionString = options.join('#');
    const typeString = types.join('#');
    
    // 构建答案参数
    let answerParams = '';
    answers.forEach((answer, index) => {
        answerParams += \`answer\${index}=\${encodeURIComponent(answer)}&\`;
    });
    
    const encryptedText = \`\${answerParams}answers=\${encodeURIComponent(answerString)}&corpId=\${CORP_ID}&dcdxName=\${encodeURIComponent(name)}&isForward=1&memo=\${encodeURIComponent('为了充分了解客户对于西黄丸产品评价，为更好的做好临床药学服务，促进产品在临床的安全合理的使用，便于下一步市场策略的规划，特进行本次问卷调查。')}&questions=\${encodeURIComponent(questions.join('#'))}&options=\${encodeURIComponent(optionString)}&types=\${encodeURIComponent(typeString)}\`;
    
    return {
        recId: '',
        nvcVal: '',
        latLng: '',
        projectId: PROJECT_ID,
        corpId: CORP_ID,
        projectTpl: PROJECT_TPL,
        sponsorProjectId: SPONSOR_PROJECT_ID,
        isForward: 1,
        title: '致和庆西黄丸消费者问卷',
        way: '实名调查',
        startTime: year + '-' + currentDate.replace(/\\./g, '-'),
        memo: '为了充分了解客户对于西黄丸产品评价，为更好的做好临床药学服务，促进产品在临床的安全合理的使用，便于下一步市场策略的规划，特进行本次问卷调查。',
        dcdxName: name,
        fieldName: '性别',
        fill: sex,
        channelAddress: '',
        questions: questions.join('#'),
        options: optionString,
        types: typeString,
        answers: answerString,
        encryptedText: encryptedText
    };
}

// 从配置获取问题
function getQuestionsFromConfig() {
    return [
        '您的年龄是',
        '您选择这家药店购买西黄丸的原因',
        '您希望同仁堂在药店经常开展哪些活动',
        '在药店购买西黄丸时，药店的哪种行为对你的购药选择影响最大',
        '在您选购西黄丸时，营业人员给您提供服务时的耐心程度如何？',
        '您在购买西黄丸时，营业人员中医药专业知识如何？',
        '在您购买西黄丸时，药师是否详细询问您的疾病情况？',
        '在您购买西黄丸时，药师是否向您说明中成药的使用禁忌和注意事项？',
        '您是否满意药店推荐给您的西黄丸的药物效果？',
        '您选购西黄丸时一般会考虑的因素?'
    ];
}

// 从配置获取选项
function getOptionsFromConfig() {
    return [
        '20 岁以下;21~34 岁;35~59;60 岁以上',
        '价格实惠;质量好;交通便利;药品种类齐全;服务周到',
        '免费测血压;坐堂医生;药品促销;提供更完善的药学服务',
        '专业知识;服务态度;讲解能力;店员形象',
        '很耐心;一般;不耐心',
        '很专业;一般专业;不专业',
        '每次都是;多数;偶尔;从不',
        '每次都是;多数;偶尔;从不',
        '是;否',
        '疗效;品牌知名度;价格;味道'
    ];
}

// 从配置获取类型
function getTypesFromConfig() {
    return [
        '单选项', '单选项', '多选项', '单选项', '单选项', 
        '单选项', '单选项', '单选项', '单选项', '单选项'
    ];
}

// 提交问卷数据
async function submitQuestionnaire(name, sex, answers) {
    try {
        // 1. 获取动态盐值
        const signkey = await createDynamicsSalt();
        
        // 2. 生成签名
        const sign = generateSign('', signkey);
        
        // 3. 生成问卷数据
        const questionnaireData = generateQuestionnaireData(name, sex, answers);
        
        // 4. 提交数据
        const response = await fetch(\`\${API_BASE_URL}/lgb/xfzwj/add\`, {
            method: 'POST',
            headers: {
                'accept': '*/*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'sign': sign,
                'signkey': signkey,
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: new URLSearchParams(questionnaireData)
        });
        
        const result = await response.text();
        console.log('✅ 问卷提交成功:', result);
        return true;
    } catch (error) {
        console.error('❌ 问卷提交失败:', error);
        return false;
    }
}

{{QUESTION_LOGIC}}

{{EXECUTION_LOGIC}}

console.log("==================== 全日期API模式自动化代码已生成 ====================");
console.log("📋 可用执行函数：");
console.log("  - automaticByDateApi() - 按日期顺序执行所有日期（API模式）");
console.log("  - automaticByDateApi('MM.DD') - 从指定日期开始执行（API模式）");
console.log("  - automaticAllApi() - 执行所有数据（API模式）");
console.log("  - getExecutionStatus() - 查看执行状态");
console.log("📊 数据统计：");
console.log(\`  - 总数据量: \${data.length} 条\`);
console.log(\`  - 包含日期: \${allDates.length} 个 [\${allDates.join(', ')}]\`);
console.log(\`  - 项目ID: \${PROJECT_ID}\`);
        `;
    }

    /**
     * 获取全日期API模式执行逻辑
     */
    getAllDatesApiExecutionLogic() {
        return `
// ==================== 全日期API模式执行逻辑 ====================

// 创建任务函数（API模式）
async function createTaskApi(name, sex) {
    console.log(\`🚀 开始创建任务: \${name} (\${sex})\`);
    
    // 生成答案
    const answers = [
        _answer0(),
        _answer1(),
        _answer2(),
        _answer3(),
        _answer4(),
        _answer5(),
        _answer6(),
        _answer7(),
        _answer8(),
        _answer9()
    ];
    
    console.log('📝 生成的答案:', answers);
    
    // 提交问卷
    const success = await submitQuestionnaire(name, sex, answers);
    
    if (success) {
        console.log(\`✅ 任务创建成功: \${name}\`);
    } else {
        console.log(\`❌ 任务创建失败: \${name}\`);
    }
    
    return success;
}

// ==================== 全日期API模式执行控制变量 ====================
var currentDate = '';
var currentDateData = [];
var currentDateIndex = 0;
var currentItemIndex = 0;
var isAutomaticRunning = false;
var automaticTimer = null;
var maxExecutions = 1000;

// 按日期顺序自动执行所有日期（API模式）
function automaticByDateApi(startDate = null) {
    if (isAutomaticRunning) {
        console.log("⚠️ 自动执行已在运行中，请先调用 pauseAutomatic() 停止");
        return;
    }

    let startDateIndex = 0;
    if (startDate) {
        startDateIndex = allDates.findIndex(date => date === startDate);
        if (startDateIndex === -1) {
            console.log(\`❌ 未找到指定日期: \${startDate}\`);
            console.log("📅 可用日期：", allDates.join(", "));
            return;
        }
    }

    console.log(\`🚀 开始按日期顺序API模式自动执行，从日期 \${allDates[startDateIndex]} 开始\`);

    currentDateIndex = startDateIndex;
    currentItemIndex = 0;
    isAutomaticRunning = true;

    executeNextDate();
}

// 执行下一个日期
async function executeNextDate() {
    if (!isAutomaticRunning) {
        console.log("⏸️ 自动执行已暂停");
        return;
    }

    if (currentDateIndex >= allDates.length) {
        console.log("✅ 所有日期的任务都已完成！");
        stopAutomatic();
        return;
    }

    currentDate = allDates[currentDateIndex];
    currentDateData = data.filter(item => item.time === currentDate);
    currentItemIndex = 0;

    console.log(\`📅 开始执行日期: \${currentDate}，共 \${currentDateData.length} 条数据\`);

    if (currentDateData.length === 0) {
        console.log(\`⚠️ 日期 \${currentDate} 没有数据，跳过\`);
        currentDateIndex++;
        setTimeout(executeNextDate, 1000);
        return;
    }

    executeNextItem();
}

// 执行下一个项目
async function executeNextItem() {
    if (!isAutomaticRunning) {
        console.log("⏸️ 自动执行已暂停");
        return;
    }

    if (currentItemIndex >= currentDateData.length) {
        console.log(\`✅ 日期 \${currentDate} 的任务完成，准备下一个日期\`);
        currentDateIndex++;
        setTimeout(executeNextDate, 3000); // 日期间隔3秒
        return;
    }

    const item = currentDateData[currentItemIndex];
    const name = item.name;
    const sex = item.sex;

    console.log(\`🚀 执行[\${currentDateIndex + 1}/\${allDates.length}][\${currentItemIndex + 1}/\${currentDateData.length}]: \${name} (\${currentDate})\`);

    await createTaskApi(name, sex);
    currentItemIndex++;

    setTimeout(executeNextItem, 3000); // API模式间隔3秒
}

// 执行所有数据（不按日期分组，API模式）
function automaticAllApi() {
    if (isAutomaticRunning) {
        console.log("⚠️ 自动执行已在运行中，请先调用 pauseAutomatic() 停止");
        return;
    }

    console.log(\`🚀 开始执行所有数据（API模式），共 \${data.length} 条\`);

    let index = 0;
    isAutomaticRunning = true;

    async function executeNext() {
        if (!isAutomaticRunning) {
            console.log("⏸️ 自动执行已暂停");
            return;
        }

        if (index >= data.length) {
            console.log("✅ 所有任务执行完成！");
            stopAutomatic();
            return;
        }

        const item = data[index];
        currentDate = item.time;
        const name = item.name;
        const sex = item.sex;

        console.log(\`🚀 执行[\${index + 1}/\${data.length}]: \${name} (\${currentDate})\`);

        await createTaskApi(name, sex);
        index++;

        setTimeout(executeNext, 3000);
    }

    executeNext();
}

// 暂停自动执行
function pauseAutomatic() {
    if (!isAutomaticRunning) {
        console.log("⚠️ 自动执行未在运行");
        return;
    }

    isAutomaticRunning = false;
    if (automaticTimer) {
        clearTimeout(automaticTimer);
        automaticTimer = null;
    }
    console.log(\`⏸️ 自动执行已暂停\`);
}

// 恢复自动执行
function resumeAutomatic() {
    if (isAutomaticRunning) {
        console.log("⚠️ 自动执行已在运行中");
        return;
    }

    console.log(\`▶️ 恢复自动执行\`);
    isAutomaticRunning = true;

    if (currentDate && currentDateData.length > 0) {
        // 恢复日期模式
        executeNextItem();
    } else {
        // 恢复普通模式
        automaticAllApi();
    }
}

// 停止自动执行
function stopAutomatic() {
    isAutomaticRunning = false;
    if (automaticTimer) {
        clearTimeout(automaticTimer);
        automaticTimer = null;
    }
    console.log("⏹️ 自动执行已停止");
}

// 获取执行状态
function getExecutionStatus() {
    if (currentDate && currentDateData.length > 0) {
        return {
            isRunning: isAutomaticRunning,
            mode: 'byDate',
            currentDate: currentDate,
            currentDateIndex: currentDateIndex + 1,
            totalDates: allDates.length,
            currentItemIndex: currentItemIndex + 1,
            currentDateTotal: currentDateData.length,
            overallProgress: \`日期进度: \${currentDateIndex + 1}/\${allDates.length}, 当前日期进度: \${currentItemIndex}/\${currentDateData.length}\`
        };
    } else {
        return {
            isRunning: isAutomaticRunning,
            mode: 'all',
            totalItems: data.length,
            overallProgress: '执行所有数据模式'
        };
    }
}

console.log("执行说明：");
console.log("📋 推荐执行方式：");
console.log("  - automaticByDateApi() - 按日期顺序执行所有日期（API模式，推荐）");
console.log("  - automaticByDateApi('MM.DD') - 从指定日期开始按顺序执行（API模式）");
console.log("\\n🔧 控制函数：");
console.log("  - pauseAutomatic() - 暂停自动执行");
console.log("  - resumeAutomatic() - 恢复自动执行");
console.log("  - stopAutomatic() - 停止自动执行");
console.log("  - getExecutionStatus() - 查看执行状态");
        `;
    }
}

// 全局导出
window.AutomationCodeGenerator = AutomationCodeGenerator;
