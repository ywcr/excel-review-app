// JWT 认证系统

import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload } from './types';

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';
const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRES_IN = '7d'; // 7天过期

// 将密钥转换为 Uint8Array
const secret = new TextEncoder().encode(JWT_SECRET);

/**
 * 生成 JWT Token
 * @param payload JWT载荷（不包含iat和exp）
 * @returns JWT token字符串
 */
export async function signToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>
): Promise<string> {
  try {
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRES_IN)
      .sign(secret);

    return jwt;
  } catch (error) {
    console.error('JWT签名失败:', error);
    throw new Error('Token生成失败');
  }
}

/**
 * 验证 JWT Token
 * @param token JWT token字符串
 * @returns 解析后的载荷或null（如果无效）
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    
    // 验证载荷结构
    if (
      typeof payload.userId === 'string' &&
      typeof payload.tokenVersion === 'number' &&
      typeof payload.iat === 'number' &&
      typeof payload.exp === 'number'
    ) {
      return payload as JWTPayload;
    }
    
    return null;
  } catch (error) {
    // Token无效、过期或格式错误
    console.error('JWT验证失败:', error);
    return null;
  }
}

/**
 * 从请求中提取JWT Token
 * @param request Request对象
 * @returns token字符串或null
 */
export function extractTokenFromRequest(request: Request): string | null {
  // 从Authorization header中提取
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 从Cookie中提取
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    return cookies.auth_token || null;
  }

  return null;
}

/**
 * 解析Cookie字符串
 * @param cookieHeader Cookie header字符串
 * @returns Cookie对象
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}

/**
 * 创建认证Cookie
 * @param token JWT token
 * @returns Cookie字符串
 */
export function createAuthCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60; // 7天（秒）
  
  return [
    `auth_token=${encodeURIComponent(token)}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    // 生产环境应该启用 Secure
    // process.env.NODE_ENV === 'production' ? 'Secure' : ''
  ].filter(Boolean).join('; ');
}

/**
 * 创建清除认证Cookie的字符串
 * @returns Cookie清除字符串
 */
export function clearAuthCookie(): string {
  return [
    'auth_token=',
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ].join('; ');
}

/**
 * 验证JWT密钥强度
 * @returns 是否为强密钥
 */
export function validateJWTSecret(): boolean {
  if (!JWT_SECRET || JWT_SECRET === 'your-super-secret-jwt-key-here') {
    console.warn('警告: 使用默认JWT密钥，生产环境请设置强密钥');
    return false;
  }
  
  if (JWT_SECRET.length < 32) {
    console.warn('警告: JWT密钥长度不足，建议至少32个字符');
    return false;
  }
  
  return true;
}

/**
 * 生成随机JWT密钥
 * @param length 密钥长度
 * @returns 随机密钥字符串
 */
export function generateJWTSecret(length: number = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

// 启动时验证JWT密钥
if (typeof window === 'undefined') {
  // 仅在服务端执行
  validateJWTSecret();
}
