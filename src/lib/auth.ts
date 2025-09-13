import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { AUTH_CONFIG } from "./auth-config";

// 用户数据文件路径
const USERS_FILE = path.join(process.cwd(), "data", "users.json");

// 用户接口定义
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  createdAt: string;
  lastLogin: string | null;
}

export interface UserData {
  users: User[];
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

// 读取用户数据
export function loadUsers(): UserData {
  try {
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
    return { users: [] };
  }
}

// 保存用户数据
export function saveUsers(userData: UserData): void {
  try {
    // 确保data目录存在
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(USERS_FILE, JSON.stringify(userData, null, 2));
  } catch (error) {
    console.error("保存用户文件失败:", error);
    throw new Error("保存用户数据失败");
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

// 生成JWT令牌
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  const secret =
    process.env.JWT_SECRET ||
    "your-super-secret-jwt-key-change-this-in-production";
  const expiresIn = process.env.JWT_EXPIRES_IN || "24h";

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
