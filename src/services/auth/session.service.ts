import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RedisService } from '@/config/redis.config';
import { Session, CreateSessionDto } from '@/models/session';
import { DatabaseError } from '@/lib/errors';
import { TOKEN_EXPIRY_DAYS } from '@/lib/constants';

@Injectable()
export class SessionService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 建立新 session (30 天過期)
   * @param userId 使用者 ID
   * @param token Access token
   * @param deviceInfo 裝置資訊 (選填)
   * @returns 建立的 session 記錄
   */
  async createSession(
    userId: string,
    token: string,
    deviceInfo?: Record<string, any>,
  ): Promise<Session> {
    try {
      const db = this.supabaseService.getClient();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS); // 30 days

      const newSession: CreateSessionDto = {
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
        device_info: deviceInfo,
      };

      const { data, error } = await db
        .from('sessions')
        .insert(newSession)
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Failed to create session: ${error.message}`);
      }

      // 快取到 Redis (加速驗證)
      await this.cacheSession(token, data.id, TOKEN_EXPIRY_DAYS * 24 * 60 * 60);

      return data;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(`Create session failed: ${error.message}`);
    }
  }

  /**
   * 驗證 session 是否有效
   * @param token Access token
   * @returns true if valid, false otherwise
   */
  async validateSession(token: string): Promise<boolean> {
    try {
      // 先檢查 Redis cache
      const cached = await this.getCachedSession(token);
      if (cached) {
        return cached.valid;
      }

      // Cache miss，查詢資料庫
      const session = await this.getSessionByToken(token);

      if (!session) {
        await this.cacheSession(token, null, 60); // 快取 "不存在" 1 分鐘
        return false;
      }

      // 檢查 revoked
      if (session.revoked) {
        await this.cacheSession(token, null, 60);
        return false;
      }

      // 檢查過期
      const now = new Date();
      const expiresAt = new Date(session.expires_at);

      if (now > expiresAt) {
        await this.cacheSession(token, null, 60);
        return false;
      }

      // 有效，快取到 Redis
      const ttl = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
      await this.cacheSession(token, session.id, ttl);

      return true;
    } catch (error) {
      // 驗證失敗視為無效
      return false;
    }
  }

  /**
   * 根據 token 取得 session
   * @param token Access token
   * @returns Session 或 null
   */
  async getSessionByToken(token: string): Promise<Session | null> {
    try {
      const db = this.supabaseService.getClient();

      const { data, error } = await db
        .from('sessions')
        .select('*')
        .eq('token', token)
        .single();

      if (error) {
        // PGRST116 = 找不到記錄
        if (error.code === 'PGRST116') {
          return null;
        }

        throw new DatabaseError(`Failed to get session: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(`Get session failed: ${error.message}`);
    }
  }

  /**
   * 快取 session 到 Redis
   */
  private async cacheSession(token: string, sessionId: string | null, ttl: number): Promise<void> {
    try {
      const cacheKey = `session:${token}`;
      const cacheValue = JSON.stringify({
        valid: sessionId !== null,
        sessionId,
      });

      await this.redisService.set(cacheKey, cacheValue, ttl);
    } catch (error) {
      // Redis 錯誤不阻塞主流程
      console.error('Failed to cache session:', error);
    }
  }

  /**
   * 從 Redis 取得快取的 session
   */
  private async getCachedSession(token: string): Promise<{ valid: boolean; sessionId?: string } | null> {
    try {
      const cacheKey = `session:${token}`;
      const cached = await this.redisService.get(cacheKey);

      if (!cached) {
        return null;
      }

      return JSON.parse(cached);
    } catch (error) {
      // Redis 錯誤返回 null (fallback 到資料庫)
      return null;
    }
  }
}
