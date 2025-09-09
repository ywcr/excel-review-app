// 认证系统主入口

export * from './types';
export * from './jwt';
export * from './fileStorage';
export * from './verificationCode';
export * from './fileLock';

import { User, JWTPayload } from './types';
import { UserStorage } from './fileStorage';
import { verifyToken, extractTokenFromRequest } from './jwt';

/**
 * 从请求中获取当前用户
 * @param request Request对象
 * @returns 用户信息或null
 */
export async function getCurrentUser(request: Request): Promise<User | null> {
  try {
    // 提取token
    const token = extractTokenFromRequest(request);
    if (!token) {
      return null;
    }

    // 验证token
    const payload = await verifyToken(token);
    if (!payload) {
      return null;
    }

    // 获取用户信息
    const user = await UserStorage.findById(payload.userId);
    if (!user) {
      return null;
    }

    // 检查token版本（SSO支持）
    if (user.tokenVersion !== payload.tokenVersion) {
      return null; // token已失效
    }

    return user;
  } catch (error) {
    console.error('获取当前用户失败:', error);
    return null;
  }
}

/**
 * 验证用户是否已认证
 * @param request Request对象
 * @returns 是否已认证
 */
export async function isAuthenticated(request: Request): Promise<boolean> {
  const user = await getCurrentUser(request);
  return user !== null;
}

/**
 * 创建认证响应
 * @param success 是否成功
 * @param message 消息
 * @param user 用户信息
 * @param forcedLogout 是否强制退出其他设备
 * @returns 认证响应
 */
export function createAuthResponse(
  success: boolean,
  message?: string,
  user?: User,
  forcedLogout?: boolean
) {
  return {
    success,
    message,
    user: user ? {
      id: user.id,
      phone: user.phone,
      name: user.name,
      avatar: user.avatar
    } : undefined,
    forcedLogout
  };
}

/**
 * 验证请求权限
 * @param request Request对象
 * @param requiredRole 需要的角色（可选）
 * @returns 权限验证结果
 */
export async function checkPermission(
  request: Request,
  requiredRole?: string
): Promise<{ authorized: boolean; user?: User; message?: string }> {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return {
      authorized: false,
      message: '未登录或登录已过期'
    };
  }

  // 这里可以扩展角色权限检查
  if (requiredRole) {
    // 暂时所有用户都有相同权限
    // 后续可以在User接口中添加role字段
  }

  return {
    authorized: true,
    user
  };
}

/**
 * 生成管理员账号（开发用）
 */
export async function createAdminAccount(): Promise<User> {
  const adminPhone = '13800138000';
  
  // 检查是否已存在
  let admin = await UserStorage.findByPhone(adminPhone);
  
  if (!admin) {
    admin = await UserStorage.create({
      phone: adminPhone,
      name: '管理员',
      provider: 'phone'
    });
    console.log('管理员账号已创建:', adminPhone);
  }
  
  return admin;
}

/**
 * 管理员直接登录（开发用）
 * @returns 管理员用户信息
 */
export async function adminDirectLogin(): Promise<User> {
  const admin = await createAdminAccount();
  await UserStorage.updateLastLogin(admin.id);
  return admin;
}
