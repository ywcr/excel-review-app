// 用户登录 API

import { NextRequest, NextResponse } from 'next/server';
import { VerificationCodeService } from '@/lib/auth/verificationCode';
import { UserStorage } from '@/lib/auth/fileStorage';
import { signToken, createAuthCookie } from '@/lib/auth/jwt';
import { createAuthResponse, adminDirectLogin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code, forceLogout = false, adminLogin = false } = body;

    // 管理员直接登录（开发用）
    if (adminLogin === true) {
      try {
        const admin = await adminDirectLogin();
        
        // 生成JWT token
        const token = await signToken({
          userId: admin.id,
          phone: admin.phone,
          name: admin.name,
          tokenVersion: admin.tokenVersion
        });

        // 创建响应
        const response = NextResponse.json(
          createAuthResponse(true, '管理员登录成功', admin),
          { status: 200 }
        );

        // 设置认证Cookie
        response.headers.set('Set-Cookie', createAuthCookie(token));

        return response;
      } catch (error) {
        console.error('管理员登录失败:', error);
        return NextResponse.json(
          createAuthResponse(false, '管理员登录失败'),
          { status: 500 }
        );
      }
    }

    // 验证请求参数
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        createAuthResponse(false, '手机号不能为空'),
        { status: 400 }
      );
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        createAuthResponse(false, '验证码不能为空'),
        { status: 400 }
      );
    }

    // 验证验证码
    const isCodeValid = await VerificationCodeService.verifyCode(phone, code);
    if (!isCodeValid) {
      return NextResponse.json(
        createAuthResponse(false, '验证码错误或已过期'),
        { status: 400 }
      );
    }

    // 查找或创建用户
    let user = await UserStorage.findByPhone(phone);
    let isNewUser = false;

    if (!user) {
      // 创建新用户
      user = await UserStorage.create({
        phone,
        name: `用户${phone.slice(-4)}`, // 默认昵称
        provider: 'phone'
      });
      isNewUser = true;
    }

    // 处理单点登录逻辑
    let forcedLogout = false;
    if (forceLogout || isNewUser) {
      // 强制退出其他设备或新用户
      await UserStorage.invalidateAllTokens(user.id);
      // 重新获取用户信息（tokenVersion已更新）
      user = await UserStorage.findById(user.id);
      if (!user) {
        throw new Error('用户信息获取失败');
      }
      forcedLogout = !isNewUser; // 新用户不算强制退出
    }

    // 更新最后登录时间
    await UserStorage.updateLastLogin(user.id);

    // 生成JWT token
    const token = await signToken({
      userId: user.id,
      phone: user.phone,
      name: user.name,
      tokenVersion: user.tokenVersion
    });

    // 创建响应
    const response = NextResponse.json(
      createAuthResponse(
        true,
        isNewUser ? '注册并登录成功' : '登录成功',
        user,
        forcedLogout
      ),
      { status: 200 }
    );

    // 设置认证Cookie
    response.headers.set('Set-Cookie', createAuthCookie(token));

    return response;
  } catch (error) {
    console.error('登录API错误:', error);
    
    return NextResponse.json(
      createAuthResponse(false, '服务器内部错误'),
      { status: 500 }
    );
  }
}

// 处理OPTIONS请求（CORS预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
