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
