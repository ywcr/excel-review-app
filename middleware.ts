// Next.js 中间件 - 认证保护

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth/jwt';

// 公开路由（不需要认证）
const publicRoutes = [
  '/auth/signin',
  '/api/auth/signin',
  '/api/auth/send-code',
  '/api/auth/check-session',
];

// 静态资源路径
const staticPaths = [
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

/**
 * 检查路径是否为公开路由
 */
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route));
}

/**
 * 检查路径是否为静态资源
 */
function isStaticPath(pathname: string): boolean {
  return staticPaths.some(path => pathname.startsWith(path));
}

/**
 * 中间件主函数
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过静态资源
  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  // 跳过公开路由
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  try {
    // 提取并验证token
    const token = extractTokenFromRequest(request);
    
    if (!token) {
      // 没有token，重定向到登录页
      return redirectToSignIn(request);
    }

    // 验证token
    const payload = await verifyToken(token);
    
    if (!payload) {
      // token无效，重定向到登录页
      return redirectToSignIn(request);
    }

    // token有效，继续处理请求
    return NextResponse.next();
  } catch (error) {
    console.error('中间件认证错误:', error);
    return redirectToSignIn(request);
  }
}

/**
 * 重定向到登录页
 */
function redirectToSignIn(request: NextRequest): NextResponse {
  const signInUrl = new URL('/auth/signin', request.url);
  
  // 保存原始URL，登录后可以重定向回来
  if (request.nextUrl.pathname !== '/') {
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
  }
  
  return NextResponse.redirect(signInUrl);
}

/**
 * 中间件配置
 * 匹配所有路径，除了API路由、静态文件等
 */
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了以下开头的路径:
     * - api/auth (认证API)
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
