#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const USERS_FILE = path.join(__dirname, '../data/users.json');

// 确保data目录存在
const dataDir = path.dirname(USERS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 读取用户数据
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    return { users: [] };
  }
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取用户文件失败:', error.message);
    return { users: [] };
  }
}

// 保存用户数据
function saveUsers(userData) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(userData, null, 2));
    console.log('用户数据已保存');
  } catch (error) {
    console.error('保存用户文件失败:', error.message);
  }
}

// 创建readline接口
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// 添加用户
async function addUser() {
  const rl = createReadlineInterface();
  
  try {
    const username = await new Promise((resolve) => {
      rl.question('请输入用户名: ', resolve);
    });
    
    if (!username.trim()) {
      console.log('用户名不能为空');
      return;
    }
    
    const userData = loadUsers();
    
    // 检查用户是否已存在
    if (userData.users.find(u => u.username === username)) {
      console.log('用户已存在');
      return;
    }
    
    const password = await new Promise((resolve) => {
      rl.question('请输入密码: ', resolve);
    });
    
    if (!password.trim()) {
      console.log('密码不能为空');
      return;
    }
    
    const role = await new Promise((resolve) => {
      rl.question('请输入角色 (admin/user) [默认: user]: ', (answer) => {
        resolve(answer.trim() || 'user');
      });
    });
    
    // 生成密码哈希
    const passwordHash = await bcrypt.hash(password, 10);
    
    // 添加新用户
    const newUser = {
      id: username,
      username,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };
    
    userData.users.push(newUser);
    saveUsers(userData);
    
    console.log(`用户 ${username} 添加成功！`);
    
  } catch (error) {
    console.error('添加用户失败:', error.message);
  } finally {
    rl.close();
  }
}

// 删除用户
async function deleteUser() {
  const rl = createReadlineInterface();
  
  try {
    const username = await new Promise((resolve) => {
      rl.question('请输入要删除的用户名: ', resolve);
    });
    
    if (!username.trim()) {
      console.log('用户名不能为空');
      return;
    }
    
    const userData = loadUsers();
    const userIndex = userData.users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
      console.log('用户不存在');
      return;
    }
    
    const confirm = await new Promise((resolve) => {
      rl.question(`确认删除用户 ${username}? (y/N): `, resolve);
    });
    
    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      userData.users.splice(userIndex, 1);
      saveUsers(userData);
      console.log(`用户 ${username} 已删除`);
    } else {
      console.log('取消删除');
    }
    
  } catch (error) {
    console.error('删除用户失败:', error.message);
  } finally {
    rl.close();
  }
}

// 列出所有用户
function listUsers() {
  const userData = loadUsers();
  
  if (userData.users.length === 0) {
    console.log('没有用户');
    return;
  }
  
  console.log('\n用户列表:');
  console.log('用户名\t\t角色\t\t创建时间\t\t最后登录');
  console.log('-'.repeat(80));
  
  userData.users.forEach(user => {
    const createdAt = new Date(user.createdAt).toLocaleString('zh-CN');
    const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString('zh-CN') : '从未登录';
    console.log(`${user.username}\t\t${user.role}\t\t${createdAt}\t${lastLogin}`);
  });
  console.log('');
}

// 修改密码
async function changePassword() {
  const rl = createReadlineInterface();
  
  try {
    const username = await new Promise((resolve) => {
      rl.question('请输入用户名: ', resolve);
    });
    
    if (!username.trim()) {
      console.log('用户名不能为空');
      return;
    }
    
    const userData = loadUsers();
    const user = userData.users.find(u => u.username === username);
    
    if (!user) {
      console.log('用户不存在');
      return;
    }
    
    const newPassword = await new Promise((resolve) => {
      rl.question('请输入新密码: ', resolve);
    });
    
    if (!newPassword.trim()) {
      console.log('密码不能为空');
      return;
    }
    
    // 生成新的密码哈希
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    
    saveUsers(userData);
    console.log(`用户 ${username} 的密码已更新`);
    
  } catch (error) {
    console.error('修改密码失败:', error.message);
  } finally {
    rl.close();
  }
}

// 主菜单
async function showMenu() {
  const rl = createReadlineInterface();
  
  console.log('\n=== Excel审核系统 - 用户管理 ===');
  console.log('1. 添加用户');
  console.log('2. 删除用户');
  console.log('3. 列出用户');
  console.log('4. 修改密码');
  console.log('5. 退出');
  
  const choice = await new Promise((resolve) => {
    rl.question('请选择操作 (1-5): ', resolve);
  });
  
  rl.close();
  
  switch (choice) {
    case '1':
      await addUser();
      break;
    case '2':
      await deleteUser();
      break;
    case '3':
      listUsers();
      break;
    case '4':
      await changePassword();
      break;
    case '5':
      console.log('再见！');
      process.exit(0);
      break;
    default:
      console.log('无效选择');
  }
  
  // 继续显示菜单
  setTimeout(showMenu, 1000);
}

// 命令行参数处理
const args = process.argv.slice(2);
if (args.length > 0) {
  switch (args[0]) {
    case 'add':
      addUser();
      break;
    case 'delete':
      deleteUser();
      break;
    case 'list':
      listUsers();
      break;
    case 'change-password':
      changePassword();
      break;
    default:
      console.log('用法: node manage-users.js [add|delete|list|change-password]');
      console.log('或者直接运行 node manage-users.js 进入交互模式');
  }
} else {
  showMenu();
}
