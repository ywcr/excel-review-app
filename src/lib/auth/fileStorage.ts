// 文件存储系统 - 用户数据管理

import { promises as fs } from 'fs';
import path from 'path';
import { User, VerificationCode } from './types';
import { withFileLock } from './fileLock';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CODES_FILE = path.join(DATA_DIR, 'verification-codes.json');

// 确保数据目录存在
async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// 安全读取JSON文件
async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // 文件不存在或格式错误，返回默认值
    return defaultValue;
  }
}

// 安全写入JSON文件
async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 用户存储管理类
 */
export class UserStorage {
  /**
   * 创建新用户
   */
  static async create(
    userData: Omit<User, 'id' | 'createdAt' | 'lastLoginAt' | 'tokenVersion'>
  ): Promise<User> {
    return withFileLock(USERS_FILE, async () => {
      const users = await readJsonFile<User[]>(USERS_FILE, []);
      
      // 检查手机号是否已存在
      if (userData.phone && users.some(u => u.phone === userData.phone)) {
        throw new Error('手机号已被注册');
      }

      const now = new Date().toISOString();
      const newUser: User = {
        id: generateUserId(),
        ...userData,
        tokenVersion: 1,
        createdAt: now,
        lastLoginAt: now,
      };

      users.push(newUser);
      await writeJsonFile(USERS_FILE, users);
      
      return newUser;
    });
  }

  /**
   * 根据ID查找用户
   */
  static async findById(id: string): Promise<User | null> {
    return withFileLock(USERS_FILE, async () => {
      const users = await readJsonFile<User[]>(USERS_FILE, []);
      return users.find(u => u.id === id) || null;
    });
  }

  /**
   * 根据手机号查找用户
   */
  static async findByPhone(phone: string): Promise<User | null> {
    return withFileLock(USERS_FILE, async () => {
      const users = await readJsonFile<User[]>(USERS_FILE, []);
      return users.find(u => u.phone === phone) || null;
    });
  }

  /**
   * 更新用户信息
   */
  static async update(id: string, updates: Partial<User>): Promise<User | null> {
    return withFileLock(USERS_FILE, async () => {
      const users = await readJsonFile<User[]>(USERS_FILE, []);
      const userIndex = users.findIndex(u => u.id === id);
      
      if (userIndex === -1) {
        return null;
      }

      // 更新用户信息
      users[userIndex] = { ...users[userIndex], ...updates };
      await writeJsonFile(USERS_FILE, users);
      
      return users[userIndex];
    });
  }

  /**
   * 使所有token失效（用于SSO）
   */
  static async invalidateAllTokens(userId: string): Promise<void> {
    return withFileLock(USERS_FILE, async () => {
      const users = await readJsonFile<User[]>(USERS_FILE, []);
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex !== -1) {
        users[userIndex].tokenVersion += 1;
        await writeJsonFile(USERS_FILE, users);
      }
    });
  }

  /**
   * 更新最后登录时间
   */
  static async updateLastLogin(userId: string): Promise<void> {
    await this.update(userId, { lastLoginAt: new Date().toISOString() });
  }

  /**
   * 获取所有用户（管理员功能）
   */
  static async findAll(): Promise<User[]> {
    return withFileLock(USERS_FILE, async () => {
      return await readJsonFile<User[]>(USERS_FILE, []);
    });
  }

  /**
   * 删除用户
   */
  static async delete(id: string): Promise<boolean> {
    return withFileLock(USERS_FILE, async () => {
      const users = await readJsonFile<User[]>(USERS_FILE, []);
      const initialLength = users.length;
      const filteredUsers = users.filter(u => u.id !== id);
      
      if (filteredUsers.length < initialLength) {
        await writeJsonFile(USERS_FILE, filteredUsers);
        return true;
      }
      
      return false;
    });
  }
}

/**
 * 验证码存储管理类
 */
export class VerificationCodeStorage {
  /**
   * 保存验证码
   */
  static async save(codeData: VerificationCode): Promise<void> {
    return withFileLock(CODES_FILE, async () => {
      const codes = await readJsonFile<VerificationCode[]>(CODES_FILE, []);
      
      // 移除该手机号的旧验证码
      const filteredCodes = codes.filter(c => c.phone !== codeData.phone);
      filteredCodes.push(codeData);
      
      await writeJsonFile(CODES_FILE, filteredCodes);
    });
  }

  /**
   * 获取验证码
   */
  static async get(phone: string): Promise<VerificationCode | null> {
    return withFileLock(CODES_FILE, async () => {
      const codes = await readJsonFile<VerificationCode[]>(CODES_FILE, []);
      return codes.find(c => c.phone === phone) || null;
    });
  }

  /**
   * 删除验证码
   */
  static async delete(phone: string): Promise<void> {
    return withFileLock(CODES_FILE, async () => {
      const codes = await readJsonFile<VerificationCode[]>(CODES_FILE, []);
      const filteredCodes = codes.filter(c => c.phone !== phone);
      await writeJsonFile(CODES_FILE, filteredCodes);
    });
  }

  /**
   * 清理过期验证码
   */
  static async cleanExpired(): Promise<void> {
    return withFileLock(CODES_FILE, async () => {
      const codes = await readJsonFile<VerificationCode[]>(CODES_FILE, []);
      const now = new Date();
      const validCodes = codes.filter(c => new Date(c.expiresAt) > now);
      await writeJsonFile(CODES_FILE, validCodes);
    });
  }
}

/**
 * 生成用户ID
 */
function generateUserId(): string {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
