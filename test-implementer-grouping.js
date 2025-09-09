// 测试实施人分组的重复拜访限制验证
// 这个测试用于验证修复后的逻辑是否正确

const testData = [
  // 测试场景1：同一实施人重复拜访同一对接人（应该报错）
  {
    implementer: "张三",
    contactPerson: "李医生", 
    visitStartTime: "2024-01-01",
    retailChannel: "康美药店",
    channelAddress: "北京市朝阳区"
  },
  {
    implementer: "张三", 
    contactPerson: "李医生",
    visitStartTime: "2024-01-05", // 7日内重复拜访
    retailChannel: "康美药店",
    channelAddress: "北京市朝阳区"
  },
  
  // 测试场景2：不同实施人拜访同一对接人（应该允许）
  {
    implementer: "王五",
    contactPerson: "李医生",
    visitStartTime: "2024-01-03", // 不同实施人，应该允许
    retailChannel: "康美药店", 
    channelAddress: "北京市朝阳区"
  },
  
  // 测试场景3：同一实施人拜访不同对接人（应该允许）
  {
    implementer: "张三",
    contactPerson: "王医生", // 不同对接人
    visitStartTime: "2024-01-02",
    retailChannel: "仁和药店",
    channelAddress: "北京市东城区"
  },
  
  // 测试场景4：同一实施人重复拜访同一医院（应该报错）
  {
    implementer: "赵六",
    hospitalName: "北京医院",
    doctorName: "张医生",
    visitStartTime: "2024-01-01"
  },
  {
    implementer: "赵六",
    hospitalName: "北京医院", // 同一医院
    doctorName: "李医生", // 不同医生，但医院重复
    visitStartTime: "2024-01-01" // 1日内重复拜访
  },
  
  // 测试场景5：不同实施人拜访同一医院（应该允许）
  {
    implementer: "孙七",
    hospitalName: "北京医院", // 同一医院
    doctorName: "王医生",
    visitStartTime: "2024-01-01" // 不同实施人，应该允许
  }
];

// 预期结果：
// 1. 第2行应该报错：张三在7日内重复拜访李医生
// 2. 第3行不应该报错：王五拜访李医生（不同实施人）
// 3. 第4行不应该报错：张三拜访王医生（不同对接人）
// 4. 第6行应该报错：赵六在1日内重复拜访北京医院
// 5. 第7行不应该报错：孙七拜访北京医院（不同实施人）

console.log("测试数据准备完成");
console.log("预期错误数量：2个");
console.log("- 第2行：张三重复拜访李医生（7日内）");
console.log("- 第6行：赵六重复拜访北京医院（1日内）");
