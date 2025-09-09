// 文件锁机制 - 确保并发操作安全

interface LockInfo {
  promise: Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timeout?: NodeJS.Timeout;
}

class FileLockManager {
  private locks = new Map<string, LockInfo>();
  private readonly DEFAULT_TIMEOUT = 10000; // 10秒超时

  /**
   * 获取文件锁并执行操作
   * @param filePath 文件路径
   * @param operation 要执行的操作
   * @param timeout 超时时间（毫秒）
   */
  async withLock<T>(
    filePath: string,
    operation: () => Promise<T>,
    timeout: number = this.DEFAULT_TIMEOUT
  ): Promise<T> {
    // 如果已有锁，等待前一个操作完成
    if (this.locks.has(filePath)) {
      try {
        await this.locks.get(filePath)!.promise;
      } catch (error) {
        // 忽略前一个操作的错误，继续执行当前操作
      }
    }

    // 创建新的锁
    let resolve: (value: any) => void;
    let reject: (error: any) => void;
    
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const lockInfo: LockInfo = {
      promise,
      resolve: resolve!,
      reject: reject!,
    };

    // 设置超时
    lockInfo.timeout = setTimeout(() => {
      this.locks.delete(filePath);
      reject(new Error(`File lock timeout for ${filePath}`));
    }, timeout);

    this.locks.set(filePath, lockInfo);

    try {
      const result = await operation();
      resolve(result);
      return result;
    } catch (error) {
      reject(error);
      throw error;
    } finally {
      // 清理锁
      if (lockInfo.timeout) {
        clearTimeout(lockInfo.timeout);
      }
      this.locks.delete(filePath);
    }
  }

  /**
   * 检查文件是否被锁定
   * @param filePath 文件路径
   */
  isLocked(filePath: string): boolean {
    return this.locks.has(filePath);
  }

  /**
   * 强制释放文件锁
   * @param filePath 文件路径
   */
  forceRelease(filePath: string): void {
    const lockInfo = this.locks.get(filePath);
    if (lockInfo) {
      if (lockInfo.timeout) {
        clearTimeout(lockInfo.timeout);
      }
      lockInfo.reject(new Error(`Lock forcefully released for ${filePath}`));
      this.locks.delete(filePath);
    }
  }

  /**
   * 获取当前锁的数量
   */
  getLockCount(): number {
    return this.locks.size;
  }

  /**
   * 清理所有锁
   */
  clearAllLocks(): void {
    for (const [filePath, lockInfo] of this.locks.entries()) {
      if (lockInfo.timeout) {
        clearTimeout(lockInfo.timeout);
      }
      lockInfo.reject(new Error(`Lock cleared for ${filePath}`));
    }
    this.locks.clear();
  }
}

// 全局文件锁管理器实例
export const fileLockManager = new FileLockManager();

/**
 * 便捷函数：使用文件锁执行操作
 * @param filePath 文件路径
 * @param operation 要执行的操作
 * @param timeout 超时时间（毫秒）
 */
export async function withFileLock<T>(
  filePath: string,
  operation: () => Promise<T>,
  timeout?: number
): Promise<T> {
  return fileLockManager.withLock(filePath, operation, timeout);
}
