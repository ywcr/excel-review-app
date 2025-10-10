// ==================== 西黄消费者问卷逻辑 ====================

/**
 * 西黄消费者问卷逻辑类
 */
class XihuangQuestionnaire extends BaseQuestionnaire {
    constructor(config) {
        super(config);
    }

    /**
     * 获取西黄消费者问卷答题逻辑
     */
    getQuestionLogic() {
        if (this.config.variant === "pingxiao") {
          return `
// ==================== 西黄消费者问卷答题逻辑（平晓规则） ====================

${this.getRandomAnswerFunctions()}

// 1、您使用西黄丸的主要目的是？
function _answer0() {
    const option = ['肿瘤辅助治疗','甲状腺 / 乳腺结节消结散结','淋巴结肿大 / 炎症肿痛缓解','中医辨证热毒壅结证'];
    const index = random(0, option.length - 1);
    const value = option[index];
    try { window.__WJ_ANSWERS = window.__WJ_ANSWERS || {}; window.__WJ_ANSWERS[0] = value; } catch (e) {}
    return value;
}

// 2、医生 / 药师是否告知您西黄丸含麝香，孕妇禁用？
function _answer1() {
    const option = ['明确提醒过', '提到过但未强调', '未告知'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 3、服用西黄丸时，您是否同时接受以下治疗？（多选）
function _answer2() {
    const option = ['手术治疗', '放疗 / 化疗', '靶向治疗 / 免疫治疗', '中药汤剂', '未接受其他治疗'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 4、您选择西黄丸时，最关注的疗效是？（受第1题影响）
function _answer3() {
    const a0 = (window.__WJ_ANSWERS && window.__WJ_ANSWERS[0]) || '';
    let option = [];
    if (a0 === '肿瘤辅助治疗') {
        option = ['肿瘤标志物指标稳定'];
    } else if (a0 === '甲状腺 / 乳腺结节消结散结') {
        option = ['肿块 / 结节触痛减轻'];
    } else if (a0 === '淋巴结肿大 / 炎症肿痛缓解') {
        option = ['肿胀范围缩小','红肿热痛消退速度'];
    } else {
        option = ['体力 / 食欲改善'];
    }
    // 仅从页面实际可选项中选择，避免选到不存在的值
    function isOptionPresent(val) {
        try {
            const cw = (typeof contentWindow !== 'undefined' && contentWindow) ? contentWindow : (document.querySelector('#ssfwIframe')?.contentWindow ?? window);
            const mainElements = cw.document.querySelectorAll('.main');
            if (mainElements.length >= 2) {
                return !!mainElements[1].querySelector(\`input[value="\${val}"]\`);
            }
        } catch (e) {}
        return true; // 回退：若无法检测，默认认为可用
    }
    const available = option.filter(isOptionPresent);
    const pool = available.length > 0 ? available : option;
    const index = random(0, pool.length - 1);
    return pool[index];
}

// 5、药师是否结合您的病情解释西黄丸“清热解毒、消肿散结”的适用症状？
function _answer4(){
    const option=['详细说明','简单提及','未解释，直接推荐'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 6、您是否注意过西黄丸说明书中“密封”的储存要求？
function _answer5() {
    const option = ['严格按照储存要求存放','知道有储存要求但未特别注意','未留意过储存相关说明'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 7、您是否关注过西黄丸与其他药物的相互作用？
function _answer6(){
    const option = ['药师主动告知过注意事项', '看过说明书但未重视', '未关注'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 8、您在服用西黄丸期间，是否出现过以下困扰？
function _answer7(){
    const option=['不清楚疗程时长','担心长期服用安全性','服药后胃部轻微不适','无明显困扰'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 9、您选择同仁堂西黄丸的核心原因是？
function _answer8(){
    const option=['临床指南推荐的肿瘤辅助用药','老字号品牌，药材质量有保障','医生 / 肿瘤药师直接处方','对比后性价比更高','习惯购买该品牌中成药'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 10、您认为西黄丸的价格与疗效匹配度如何？
function _answer9(){
    const option=['略高于预期','价格偏高','更关注疗效，对价格不敏感'];
    const index = random(0, option.length - 1);
    return option[index];
}
`;
        }

        return `
// ==================== 西黄消费者问卷答题逻辑 ====================

${this.getRandomAnswerFunctions()}

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
}

// 导出
window.XihuangQuestionnaire = XihuangQuestionnaire;
