import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { AUTH_CONFIG } from "./auth-config";

// 检测是否在 Vercel 环境中
export const isVercelEnvironment = () => {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
};

// 用户数据文件路径
const USERS_FILE = path.join(process.cwd(), "data", "users.json");

// 活跃会话接口
export interface ActiveSession {
  sessionId: string;
  tokenHash: string; // token的哈希值（安全考虑）
  deviceInfo: string; // 设备信息
  loginTime: string;
  lastActivity: string;
  loginTimestamp?: number; // 添加登录时间戳用于比较
}

// 用户接口定义
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  createdAt: string;
  lastLogin: string | null;
  activeSession?: ActiveSession | null; // 新增：活跃会话信息
}

export interface UserData {
  users: User[];
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  sessionId?: string;
  loginTime?: number;
  iat?: number;
  exp?: number;
}

// 读取用户数据
export function loadUsers(): UserData {
  try {
    // 在 Vercel 环境中，返回默认用户数据
    if (isVercelEnvironment()) {
      console.log("Vercel 环境：使用默认用户数据");
      return getDefaultUsers();
    }

    if (!fs.existsSync(USERS_FILE)) {
      // 如果文件不存在，创建默认结构
      const defaultData: UserData = { users: [] };
      saveUsers(defaultData);
      return defaultData;
    }

    const data = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("读取用户文件失败:", error);
    // 在出错时返回默认用户数据
    return getDefaultUsers();
  }
}

// 全局内存缓存用于Vercel环境
let memoryUserCache: UserData | null = null;
let memoryCacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 获取默认用户数据（用于 Vercel 环境）
function getDefaultUsers(): UserData {
  // 检查内存缓存
  if (memoryUserCache && Date.now() - memoryCacheTimestamp < CACHE_DURATION) {
    return memoryUserCache;
  }
  
  // 在 Vercel 环境中，尝试读取实际的用户文件
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf8");
      const userData = JSON.parse(data);
      // 不再清除活跃会话，保留会话信息用于验证
      console.log(`Vercel 环境：成功读取 ${userData.users.length} 个用户`);
      
      // 更新内存缓存
      memoryUserCache = userData;
      memoryCacheTimestamp = Date.now();
      
      return userData;
    }
  } catch (error) {
    console.error("Vercel 环境：读取用户文件失败，使用备用用户数据", error);
  }

  // 如果无法读取文件，返回备用用户数据
  return {
    users: [
      {
        id: "admin",
        username: "admin",
        passwordHash:
          "$2b$10$/JytYerFSGHWqCZYUV/3sOzamNGd5n9JtpzLNbn07uFW2Wmomf6h6",
        role: "admin",
        createdAt: "2025-09-13T04:06:51.641Z",
        lastLogin: null,
        activeSession: null,
      },
      {
        id: "chenrong",
        username: "chenrong",
        passwordHash:
          "$2b$10$Y3ogbpUBg6u.Ww6uyHldEerHpAD4ouKZKyHO2VQXG4TI/EzJ5fiqC",
        role: "admin",
        createdAt: "2025-09-13T04:37:21.805Z",
        lastLogin: null,
        activeSession: null,
      },
      {
        id: "yaowei",
        username: "yaowei",
        passwordHash:
          "$2b$10$lGQLdVxm159LLZKEnqXQEuPx305P7QHSrtpnL8MMl8y0KMT4GNdmG",
        role: "admin",
        createdAt: "2025-09-18T03:29:25.098Z",
        lastLogin: null,
        activeSession: null,
      },
    ],
  };
}

// 保存用户数据
export function saveUsers(userData: UserData): void {
  try {
    // 在 Vercel 环境中，跳过文件写入
    if (isVercelEnvironment()) {
      console.log("Vercel 环境：跳过用户数据保存");
      return;
    }

    // 确保data目录存在
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(USERS_FILE, JSON.stringify(userData, null, 2));
  } catch (error) {
    console.error("保存用户文件失败:", error);
    // 在 Vercel 环境中不抛出错误
    if (!isVercelEnvironment()) {
      throw new Error("保存用户数据失败");
    }
  }
}

// 根据用户名查找用户
export function findUserByUsername(username: string): User | null {
  const userData = loadUsers();
  return userData.users.find((user) => user.username === username) || null;
}

// 验证密码
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error("密码验证失败:", error);
    return false;
  }
}

// 生成密码哈希
export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    console.error("密码哈希生成失败:", error);
    throw new Error("密码处理失败");
  }
}

// 生成JWT令牌（包含会话信息）- 持久化会话配置
export function generateToken(user: User, sessionId?: string): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    // 添加时间戳和会话ID确保每次登录的token都不同
    sessionId: sessionId || generateSessionId(),
    loginTime: Date.now(),
  };

  const secret =
    process.env.JWT_SECRET ||
    "your-super-secret-jwt-key-change-this-in-production";

  // 持久化会话：设置很长的过期时间（1年）或不设置过期时间
  // 实际的会话管理通过服务端会话验证控制
  const expiresIn = process.env.JWT_EXPIRES_IN || "365d"; // 1年过期时间

  return jwt.sign(payload, secret, { expiresIn } as any);
}

// 验证JWT令牌
export function verifyToken(token: string): JWTPayload | null {
  try {
    const secret =
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-this-in-production";
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error("JWT验证失败:", error);
    return null;
  }
}

// 更新用户最后登录时间
export function updateLastLogin(userId: string): void {
  try {
    const userData = loadUsers();
    const user = userData.users.find((u) => u.id === userId);

    if (user) {
      user.lastLogin = new Date().toISOString();
      saveUsers(userData);
    }
  } catch (error) {
    console.error("更新最后登录时间失败:", error);
  }
}

// 验证用户凭据
export async function authenticateUser(
  username: string,
  password: string
): Promise<User | null> {
  try {
    const user = findUserByUsername(username);

    if (!user) {
      return null;
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return null;
    }

    // 更新最后登录时间
    updateLastLogin(user.id);

    return user;
  } catch (error) {
    console.error("用户认证失败:", error);
    return null;
  }
}

// 生成会话ID
export function generateSessionId(): string {
  return crypto.randomUUID();
}

// 生成token哈希
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// 获取设备信息（脱敏处理）
export function getDeviceInfo(request: Request): string {
  const userAgent = request.headers.get("user-agent") || "Unknown";
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "Unknown";

  // 只保留必要信息，避免过度收集
  const browserInfo = userAgent.split(" ")[0] || "Unknown Browser";
  const ipMasked = ip.split(".").slice(0, 3).join(".") + ".xxx"; // IP脱敏

  return `${browserInfo} (${ipMasked})`;
}

// 清除用户的活跃会话
export function clearUserSession(userId: string): void {
  try {
    // 在 Vercel 环境中，更新内存缓存
    if (isVercelEnvironment()) {
      if (memoryUserCache) {
        const user = memoryUserCache.users.find((u) => u.id === userId);
        if (user) {
          user.activeSession = null;
          console.log(`Vercel 环境：清除用户 ${userId} 的内存会话`);
        }
      }
      return;
    }

    const userData = loadUsers();
    const user = userData.users.find((u) => u.id === userId);

    if (user) {
      user.activeSession = null;
      saveUsers(userData);
    }
  } catch (error) {
    console.error("清除用户会话失败:", error);
  }
}

// 设置用户活跃会话
export function setUserSession(userId: string, session: ActiveSession): void {
  try {
    const userData = loadUsers();
    const user = userData.users.find((u) => u.id === userId);

    if (user) {
      // 添加时间戳到会话信息
      session.loginTimestamp = new Date(session.loginTime).getTime();
      user.activeSession = session;
      
      // 在 Vercel 环境中，虽然无法持久化到文件，但更新内存缓存
      if (isVercelEnvironment()) {
        if (!memoryUserCache) {
          memoryUserCache = userData;
        }
        const cachedUser = memoryUserCache.users.find((u) => u.id === userId);
        if (cachedUser) {
          cachedUser.activeSession = session;
        }
        memoryCacheTimestamp = Date.now();
        console.log(`Vercel 环境：设置用户 ${userId} 的会话信息`);
      } else {
        // 非Vercel环境，保存到文件
        saveUsers(userData);
      }
    }
  } catch (error) {
    console.error("设置用户会话失败:", error);
  }
}

// 验证用户会话 - 持久化会话管理（移除自动过期）
export function validateUserSession(
  userId: string,
  tokenHash: string,
  sessionId?: string,
  loginTime?: number
): boolean {
  try {
    // 如果禁用了单设备登录，直接返回 true
    if (!AUTH_CONFIG.SINGLE_DEVICE_LOGIN) {
      return true;
    }
    
    const userData = loadUsers();
    const user = userData.users.find((u) => u.id === userId);
    
    // 检查用户是否存在
    if (!user) {
      console.log(`用户 ${userId} 不存在`);
      return false;
    }
    
    // 在 Vercel 环境中，基于sessionId和tokenHash的简单验证
    if (isVercelEnvironment()) {
      // 如果没有活跃会话，允许登录
      if (!user.activeSession) {
        return true;
      }
      
      // 检查sessionId和tokenHash是否匹配
      if (user.activeSession.sessionId === sessionId && 
          user.activeSession.tokenHash === tokenHash) {
        return true;
      }
      
      console.log(`Vercel 环境：用户 ${userId} 会话不匹配，可能在其他设备登录`);
      return false;
    }

    // 检查是否有活跃会话
    if (!user.activeSession) {
      console.log(`用户 ${userId} 没有活跃会话`);
      return false;
    }

    // 检查token哈希是否匹配
    if (user.activeSession.tokenHash !== tokenHash) {
      console.log(`用户 ${userId} token哈希不匹配`);
      return false;
    }

    // 移除24小时过期检查 - 实现持久化会话
    // 会话只在以下情况下失效：
    // 1. 用户主动登出
    // 2. 用户账户被删除
    // 3. 用户在其他设备登录（互踢机制）

    return true;
  } catch (error) {
    console.error("验证用户会话失败:", error);
    return false;
  }
}

// 删除用户账户并清理所有相关会话
export function deleteUserAccount(userId: string): boolean {
  try {
    const userData = loadUsers();
    const userIndex = userData.users.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      console.log(`用户 ${userId} 不存在，无需删除`);
      return false;
    }

    // 清除用户会话
    clearUserSession(userId);

    // 从用户列表中删除用户
    userData.users.splice(userIndex, 1);
    saveUsers(userData);

    console.log(`用户 ${userId} 已删除，相关会话已清理`);
    return true;
  } catch (error) {
    console.error("删除用户账户失败:", error);
    return false;
  }
}

// 增强的token验证函数（包含账户删除检测）
export function verifyTokenWithSession(token: string): JWTPayload | null {
  try {
    const secret =
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-this-in-production";
    const decoded = jwt.verify(token, secret) as JWTPayload;

    // 验证会话是否有效（包含账户存在性检查）
    const tokenHash = hashToken(token);
    const isValidSession = validateUserSession(
      decoded.userId, 
      tokenHash, 
      decoded.sessionId,
      decoded.loginTime
    );

    if (!isValidSession) {
      console.log(`用户 ${decoded.userId} 会话验证失败，可能账户已被删除或在其他设备登录`);
      return null;
    }

    return decoded;
  } catch (error) {
    console.error("JWT验证失败:", error);
    return null;
  }
}

// 从请求中获取用户信息
export function getUserFromRequest(request: Request): JWTPayload | null {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀
    return verifyToken(token);
  } catch (error) {
    console.error("从请求获取用户信息失败:", error);
    return null;
  }
}

// 检查用户是否有特定角色
export function hasRole(user: JWTPayload, role: string): boolean {
  return user.role === role || user.role === "admin";
}

// 清理过期会话
export function cleanupExpiredSessions(): void {
  try {
    const userData = loadUsers();
    let hasChanges = false;

    userData.users.forEach((user) => {
      if (user.activeSession) {
        const sessionTime = new Date(user.activeSession.loginTime).getTime();
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24小时

        if (now - sessionTime > maxAge) {
          user.activeSession = null;
          hasChanges = true;
          console.log(`清理用户 ${user.username} 的过期会话`);
        }
      }
    });

    if (hasChanges) {
      saveUsers(userData);
    }
  } catch (error) {
    console.error("清理过期会话失败:", error);
  }
}

// 生成安全的随机密码
export function generateRandomPassword(length: number = 12): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";

  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return password;
}
