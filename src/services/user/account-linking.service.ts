import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SocialAccount, CreateSocialAccountDto } from '@/models/social_account';
import { DatabaseError } from '@/lib/errors';

@Injectable()
export class AccountLinkingService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * 連結社交帳號到使用者
   * @param userId Supabase 使用者 ID
   * @param provider OAuth provider
   * @param providerUserId Provider 的使用者 ID
   * @returns 建立的社交帳號記錄
   */
  async linkSocialAccount(
    userId: string,
    provider: 'google' | 'facebook',
    providerUserId: string,
  ): Promise<SocialAccount> {
    try {
      const db = this.supabaseService.getDatabase();

      // 檢查是否已連結此 provider (防止重複)
      const { data: existing } = await db
        .from('social_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .single();

      if (existing) {
        // 已存在，更新 provider_user_id
        const { data, error } = await db
          .from('social_accounts')
          .update({
            provider_user_id: providerUserId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          throw new DatabaseError(`Failed to update social account: ${error.message}`);
        }

        return data;
      }

      // 建立新連結
      const newAccount: CreateSocialAccountDto = {
        user_id: userId,
        provider,
        provider_user_id: providerUserId,
      };

      const { data, error } = await db
        .from('social_accounts')
        .insert(newAccount)
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Failed to link social account: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(`Link social account failed: ${error.message}`);
    }
  }

  /**
   * 根據 provider 和 provider_user_id 查找使用者
   * @param provider OAuth provider
   * @param providerUserId Provider 的使用者 ID
   * @returns 使用者 ID，找不到返回 null
   */
  async findUserByProvider(provider: 'google' | 'facebook', providerUserId: string): Promise<string | null> {
    try {
      const db = this.supabaseService.getDatabase();

      const { data, error } = await db
        .from('social_accounts')
        .select('user_id')
        .eq('provider', provider)
        .eq('provider_user_id', providerUserId)
        .single();

      if (error) {
        // PGRST116 = 找不到記錄
        if (error.code === 'PGRST116') {
          return null;
        }

        throw new DatabaseError(`Failed to find user by provider: ${error.message}`);
      }

      return data.user_id;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(`Find user by provider failed: ${error.message}`);
    }
  }
}
