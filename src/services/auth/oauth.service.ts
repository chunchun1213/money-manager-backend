import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OAuthError } from '@/lib/errors';

export interface OAuthUserData {
  userId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  provider: 'google' | 'facebook';
  accessToken: string;
  refreshToken?: string;
}

@Injectable()
export class OAuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * 使用 OAuth PKCE 流程交換 code 取得使用者資訊
   * @param code OAuth authorization code
   * @param codeVerifier PKCE code verifier
   * @param provider OAuth provider (google | facebook)
   * @returns 使用者資訊與 tokens
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    provider: 'google' | 'facebook',
  ): Promise<OAuthUserData> {
    try {
      const auth = this.supabaseService.getAuth();

      // 使用 Supabase Auth 的 PKCE 流程交換 code
      const { data, error } = await auth.exchangeCodeForSession(code);

      if (error) {
        throw new OAuthError(`OAuth code exchange failed: ${error.message}`);
      }

      if (!data.session || !data.user) {
        throw new OAuthError('Missing user data in OAuth response');
      }

      // 提取使用者資訊
      const { user, session } = data;
      const userMetadata = user.user_metadata || {};

      return {
        userId: user.id,
        email: user.email || '',
        name: userMetadata.full_name || userMetadata.name,
        avatarUrl: userMetadata.avatar_url || userMetadata.picture,
        provider,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      };
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }

      // 處理超時或網路錯誤
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new OAuthError('OAuth request timeout');
      }

      throw new OAuthError(`OAuth exchange failed: ${error.message}`);
    }
  }
}
