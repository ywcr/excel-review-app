// Edge Runtime兼容的认证工具函数
// 用于中间件等Edge Runtime环境

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

// 简单的JWT解码（不验证签名，仅用于中间件）
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    
    // 检查是否过期
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return null;
    }

    return decoded as JWTPayload;
  } catch (error) {
    console.error('JWT解码失败:', error);
    return null;
  }
}

// 检查用户是否有特定角色
export function hasRole(user: JWTPayload, role: string): boolean {
  return user.role === role || user.role === 'admin';
}
