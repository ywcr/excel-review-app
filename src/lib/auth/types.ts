// 用户认证系统类型定义

export interface User {
  id: string; // 用户唯一ID
  phone?: string; // 手机号
  email?: string; // 邮箱
  name?: string; // 用户昵称
  avatar?: string; // 头像URL
  provider?: "phone" | "wechat" | "alipay"; // 登录方式
  providerAccountId?: string; // 第三方账号ID
  tokenVersion: number; // Token版本号(SSO关键)
  createdAt: string; // 创建时间
  lastLoginAt: string; // 最后登录时间
}

export interface JWTPayload {
  userId: string; // 用户ID
  phone?: string; // 手机号
  name?: string; // 用户名
  tokenVersion: number; // Token版本号
  iat: number; // 签发时间
  exp: number; // 过期时间
}

export interface VerificationCode {
  phone: string; // 手机号
  code: string; // 验证码
  createdAt: string; // 创建时间
  expiresAt: string; // 过期时间
  attempts: number; // 尝试次数
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    phone?: string;
    name?: string;
    avatar?: string;
  };
  forcedLogout?: boolean; // 是否强制退出了其他设备
}

export interface SendCodeResponse {
  success: boolean;
  message: string;
  cooldown?: number; // 剩余冷却时间(秒)
}

export interface SessionInfo {
  userId: string;
  lastActivity: string;
  userAgent?: string;
  ip?: string;
}
