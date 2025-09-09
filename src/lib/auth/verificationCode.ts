// 验证码系统

import { VerificationCode, SendCodeResponse } from './types';
import { VerificationCodeStorage } from './fileStorage';

// 验证码配置
const CODE_LENGTH = 6;
const CODE_EXPIRES_IN = 5 * 60 * 1000; // 5分钟（毫秒）
const SEND_COOLDOWN = 60 * 1000; // 1分钟冷却时间（毫秒）
const MAX_ATTEMPTS = 5; // 最大尝试次数

/**
 * 验证码服务类
 */
export class VerificationCodeService {
  /**
   * 发送验证码
   * @param phone 手机号
   * @returns 发送结果
   */
  static async sendCode(phone: string): Promise<SendCodeResponse> {
    try {
      // 验证手机号格式
      if (!isValidPhoneNumber(phone)) {
        return {
          success: false,
          message: '手机号格式不正确'
        };
      }

      // 检查冷却时间
      const existingCode = await VerificationCodeStorage.get(phone);
      if (existingCode) {
        const timeSinceCreated = Date.now() - new Date(existingCode.createdAt).getTime();
        if (timeSinceCreated < SEND_COOLDOWN) {
          const remainingCooldown = Math.ceil((SEND_COOLDOWN - timeSinceCreated) / 1000);
          return {
            success: false,
            message: `请等待 ${remainingCooldown} 秒后再试`,
            cooldown: remainingCooldown
          };
        }
      }

      // 生成验证码
      const code = generateVerificationCode();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + CODE_EXPIRES_IN);

      const codeData: VerificationCode = {
        phone,
        code,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        attempts: 0
      };

      // 保存验证码
      await VerificationCodeStorage.save(codeData);

      // 发送验证码（这里模拟发送）
      const sent = await sendSMS(phone, code);
      
      if (sent) {
        return {
          success: true,
          message: '验证码已发送'
        };
      } else {
        return {
          success: false,
          message: '验证码发送失败，请稍后重试'
        };
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      return {
        success: false,
        message: '系统错误，请稍后重试'
      };
    }
  }

  /**
   * 验证验证码
   * @param phone 手机号
   * @param code 验证码
   * @returns 验证结果
   */
  static async verifyCode(phone: string, code: string): Promise<boolean> {
    try {
      const codeData = await VerificationCodeStorage.get(phone);
      
      if (!codeData) {
        return false; // 验证码不存在
      }

      // 检查是否过期
      if (new Date() > new Date(codeData.expiresAt)) {
        await VerificationCodeStorage.delete(phone);
        return false; // 验证码已过期
      }

      // 检查尝试次数
      if (codeData.attempts >= MAX_ATTEMPTS) {
        await VerificationCodeStorage.delete(phone);
        return false; // 尝试次数过多
      }

      // 验证码码
      if (codeData.code === code) {
        // 验证成功，删除验证码
        await VerificationCodeStorage.delete(phone);
        return true;
      } else {
        // 验证失败，增加尝试次数
        codeData.attempts += 1;
        await VerificationCodeStorage.save(codeData);
        return false;
      }
    } catch (error) {
      console.error('验证验证码失败:', error);
      return false;
    }
  }

  /**
   * 清理过期验证码
   */
  static async cleanExpiredCodes(): Promise<void> {
    try {
      await VerificationCodeStorage.cleanExpired();
    } catch (error) {
      console.error('清理过期验证码失败:', error);
    }
  }

  /**
   * 获取验证码剩余时间
   * @param phone 手机号
   * @returns 剩余时间（秒），如果不存在返回0
   */
  static async getRemainingTime(phone: string): Promise<number> {
    try {
      const codeData = await VerificationCodeStorage.get(phone);
      
      if (!codeData) {
        return 0;
      }

      const expiresAt = new Date(codeData.expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
      
      return remaining;
    } catch (error) {
      console.error('获取验证码剩余时间失败:', error);
      return 0;
    }
  }

  /**
   * 获取发送冷却剩余时间
   * @param phone 手机号
   * @returns 剩余冷却时间（秒），如果可以发送返回0
   */
  static async getSendCooldown(phone: string): Promise<number> {
    try {
      const codeData = await VerificationCodeStorage.get(phone);
      
      if (!codeData) {
        return 0;
      }

      const createdAt = new Date(codeData.createdAt).getTime();
      const now = Date.now();
      const timeSinceCreated = now - createdAt;
      
      if (timeSinceCreated >= SEND_COOLDOWN) {
        return 0;
      }
      
      return Math.ceil((SEND_COOLDOWN - timeSinceCreated) / 1000);
    } catch (error) {
      console.error('获取发送冷却时间失败:', error);
      return 0;
    }
  }
}

/**
 * 生成验证码
 * @returns 6位数字验证码
 */
function generateVerificationCode(): string {
  const min = Math.pow(10, CODE_LENGTH - 1);
  const max = Math.pow(10, CODE_LENGTH) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

/**
 * 验证手机号格式
 * @param phone 手机号
 * @returns 是否有效
 */
function isValidPhoneNumber(phone: string): boolean {
  // 中国大陆手机号正则表达式
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 发送短信验证码（模拟实现）
 * @param phone 手机号
 * @param code 验证码
 * @returns 是否发送成功
 */
async function sendSMS(phone: string, code: string): Promise<boolean> {
  // 这里应该集成真实的短信服务提供商
  // 例如：阿里云短信、腾讯云短信等
  
  console.log(`[模拟短信] 发送验证码到 ${phone}: ${code}`);
  
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 模拟发送成功率（95%）
  return Math.random() > 0.05;
}

/**
 * 格式化手机号（隐藏中间4位）
 * @param phone 手机号
 * @returns 格式化后的手机号
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone || phone.length !== 11) {
    return phone;
  }
  
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 验证码配置常量（用于前端显示）
 */
export const VERIFICATION_CONFIG = {
  CODE_LENGTH,
  CODE_EXPIRES_IN: CODE_EXPIRES_IN / 1000, // 转换为秒
  SEND_COOLDOWN: SEND_COOLDOWN / 1000, // 转换为秒
  MAX_ATTEMPTS
} as const;
