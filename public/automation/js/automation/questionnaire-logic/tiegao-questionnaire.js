// ==================== 贴膏患者问卷逻辑 ====================

/**
 * 贴膏患者问卷逻辑类
 */
class TiegaoQuestionnaire extends BaseQuestionnaire {
  constructor(config) {
    super(config);
  }

  /**
   * 获取贴膏患者问卷答题逻辑
   */
  getQuestionLogic() {
    return `
// ==================== 贴膏患者问卷答题逻辑 ====================

${this.getRandomAnswerFunctions()}

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
function _answer5(){
    const option=['会，对该品牌有好感，愿意尝试其他产品', '可能会，看具体产品', '不会，只关注通络祛痛膏'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 7、您对通络祛痛膏的贴敷感受如何，是否容易引起皮肤过敏等不适？
function _answer6(){
    return randomAnswerByRate(['贴敷舒适', '无过敏反应', '贴敷后有轻微不适，但可忍受'], ['容易引起皮肤过敏'], 0.10);
}

// 8、您认为通络祛痛膏的使用方法是否方便？
function _answer7(){
    return randomAnswerByRate(['方便，易于操作'], ['不太方便，需要他人帮助'], 0.10);
}

// 9、您会推荐通络祛痛膏给其他人使用吗？
function _answer8(){
    const option=['会，效果好，愿意推荐','看情况，如果别人有需要会推荐','不确定'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 10、您对通络祛痛膏的价格是否满意？
function _answer9(){
    return randomAnswerByRate(['满意，价格合理','可以接受'], ['不满意，价格过高'], 0.10);
}

// 11、您在使用通络祛痛膏的过程中，是否同时使用了其他药物或治疗方法？
function _answer10(){
    const option=['是，同时使用了其他药物或治疗方法','否，仅使用了通络祛痛膏'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 12、您觉得通络祛痛膏的药效持续时间如何？
function _answer11(){
    const option=['很长，能持续一段时间','一般，效果维持时间较短','不确定'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 13、您对羚锐制药这个品牌的印象如何？
function _answer12(){
    const option=['品牌知名度高','信任度高','听说过，但了解不多','一般'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 14、对于通络祛痛膏的产品说明和包装，您有什么建议？
function _answer13(){
    const option=['产品说明更加详细、易懂','包装更加方便使用、易于保存','增加防伪标识'];
    const index = random(0, option.length - 1);
    return option[index];
}
`;
  }
}

// 导出
window.TiegaoQuestionnaire = TiegaoQuestionnaire;
