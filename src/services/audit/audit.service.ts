import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateAuditLogDto } from '@/models/audit_log';
import { encryptIpAddress } from '@/lib/utils';

@Injectable()
export class AuditService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * 記錄登入操作 (異步，不阻塞主流程)
   * @param userId 使用者 ID
   * @param ip IP 位址 (會加密)
   * @param result 'success' | 'failure'
   * @param error 錯誤訊息 (選填)
   */
  async logLogin(
    userId: string,
    ip: string,
    result: 'success' | 'failure',
    error?: string,
  ): Promise<void> {
    // 異步寫入，不等待完成
    setImmediate(() => {
      this.writeAuditLog({
        user_id: userId,
        action: 'login',
        ip_address: encryptIpAddress(ip),
        result,
        error_message: error,
      }).catch((err) => {
        console.error('Failed to log login:', err);
      });
    });
  }

  /**
   * 記錄登出操作
   * @param userId 使用者 ID
   * @param ip IP 位址
   */
  async logLogout(userId: string, ip: string): Promise<void> {
    setImmediate(() => {
      this.writeAuditLog({
        user_id: userId,
        action: 'logout',
        ip_address: encryptIpAddress(ip),
        result: 'success',
      }).catch((err) => {
        console.error('Failed to log logout:', err);
      });
    });
  }

  /**
   * 記錄 token 驗證失敗
   * @param userId 使用者 ID
   * @param ip IP 位址
   * @param error 錯誤訊息
   */
  async logTokenValidationFailed(userId: string, ip: string, error: string): Promise<void> {
    setImmediate(() => {
      this.writeAuditLog({
        user_id: userId,
        action: 'token_validation_failed',
        ip_address: encryptIpAddress(ip),
        result: 'failure',
        error_message: error,
      }).catch((err) => {
        console.error('Failed to log token validation failure:', err);
      });
    });
  }

  /**
   * 寫入稽核記錄到資料庫
   */
  private async writeAuditLog(log: CreateAuditLogDto): Promise<void> {
    try {
      const db = this.supabaseService.getClient();

      const { error } = await db.from('audit_logs').insert(log);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
    } catch (error) {
      // 記錄失敗不應中斷主流程
      console.error('Audit log write failed:', error);
    }
  }
}
