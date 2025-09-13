#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, '../data/users.json');

async function createAdmin() {
  try {
    // 确保data目录存在
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 生成密码哈希
    const passwordHash = await bcrypt.hash('admin123', 10);

    // 创建管理员用户
    const adminUser = {
      id: 'admin',
      username: 'admin',
      passwordHash: passwordHash,
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    // 创建用户数据
    const userData = {
      users: [adminUser]
    };

    // 保存到文件
    fs.writeFileSync(USERS_FILE, JSON.stringify(userData, null, 2));

    console.log('管理员用户创建成功！');
    console.log('用户名: admin');
    console.log('密码: admin123');
    console.log('角色: admin');
    console.log('');
    console.log('请在生产环境中修改默认密码！');

  } catch (error) {
    console.error('创建管理员用户失败:', error.message);
    process.exit(1);
  }
}

createAdmin();
