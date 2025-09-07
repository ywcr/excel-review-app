const XLSX = require('xlsx');
const fs = require('fs');

// 创建一个测试用的Excel文件，包含非标准的sheet名称
function createTestExcel() {
    const workbook = XLSX.utils.book_new();
    
    // 创建第一个工作表 - 使用非标准名称
    const data1 = [
        ['姓名', '年龄', '部门'],
        ['张三', 25, '销售部'],
        ['李四', 30, '技术部'],
        ['王五', 28, '市场部']
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(data1);
    XLSX.utils.book_append_sheet(workbook, ws1, 'Sheet1');
    
    // 创建第二个工作表 - 也是非标准名称
    const data2 = [
        ['产品名称', '价格', '库存'],
        ['产品A', 100, 50],
        ['产品B', 200, 30],
        ['产品C', 150, 20]
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(data2);
    XLSX.utils.book_append_sheet(workbook, ws2, '数据表');
    
    // 创建第三个工作表 - 空表
    const ws3 = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, ws3, '空表');
    
    // 保存文件
    XLSX.writeFile(workbook, 'test-no-matching-sheets.xlsx');
    console.log('测试文件已创建: test-no-matching-sheets.xlsx');
    console.log('包含的工作表:');
    console.log('- Sheet1 (有数据)');
    console.log('- 数据表 (有数据)');
    console.log('- 空表 (无数据)');
    console.log('');
    console.log('这些工作表名称都不匹配预设的模板名称 ["医院拜访数据", "拜访记录", "医院数据"]');
    console.log('因此应该触发sheet选择对话框');
}

// 创建一个包含匹配sheet名称的Excel文件
function createMatchingExcel() {
    const workbook = XLSX.utils.book_new();
    
    // 创建匹配的工作表
    const data1 = [
        ['实施人', '拜访开始时间', '渠道名称', '渠道地址'],
        ['张三', '2024-01-01 09:00', '人民医院', '北京市朝阳区'],
        ['李四', '2024-01-01 10:00', '协和医院', '北京市东城区'],
        ['王五', '2024-01-01 11:00', '同仁医院', '北京市西城区']
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(data1);
    XLSX.utils.book_append_sheet(workbook, ws1, '医院拜访数据');
    
    // 创建其他工作表
    const ws2 = XLSX.utils.aoa_to_sheet([['备注'], ['这是备注表']]);
    XLSX.utils.book_append_sheet(workbook, ws2, '备注');
    
    // 保存文件
    XLSX.writeFile(workbook, 'test-matching-sheets.xlsx');
    console.log('匹配测试文件已创建: test-matching-sheets.xlsx');
    console.log('包含的工作表:');
    console.log('- 医院拜访数据 (匹配模板，有数据)');
    console.log('- 备注 (不匹配模板，有数据)');
    console.log('');
    console.log('应该自动选择"医院拜访数据"工作表，不触发选择对话框');
}

if (require.main === module) {
    createTestExcel();
    createMatchingExcel();
}

module.exports = { createTestExcel, createMatchingExcel };
