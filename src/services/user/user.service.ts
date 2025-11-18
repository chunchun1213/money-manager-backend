import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { User, UserProfile } from '@/models/user';
import { DatabaseError } from '@/lib/errors';

@Injectable()
export class UserService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * 查找或建立使用者
   * @param email 使用者 email
   * @param profile 使用者檔案資訊 (選填)
   * @returns Supabase auth.users 的使用者記錄
   */
  async findOrCreateUser(email: string, profile?: Partial<UserProfile>): Promise<User> {
    try {
      const auth = this.supabaseService.getAuth();

      // 驗證 email 格式
      if (!email || !this.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      // 查詢既有使用者
      const { data: existingUsers, error: listError } = await auth.admin.listUsers();

      if (listError) {
        throw new DatabaseError(`Failed to list users: ${listError.message}`);
      }

      const existingUser = existingUsers.users.find((u) => u.email === email);

      if (existingUser) {
        // 更新 last_sign_in_at
        await this.updateLastSignIn(existingUser.id);

        const metadata = existingUser.user_metadata || {};
        
        return {
          id: existingUser.id,
          email: existingUser.email || '',
          created_at: existingUser.created_at,
          last_sign_in_at: new Date().toISOString(),
          raw_user_meta_data: {
            name: metadata.name || metadata.full_name || '',
            avatar_url: metadata.avatar_url || metadata.picture || '',
            provider: (metadata.provider || 'google') as 'google' | 'facebook',
          },
          updated_at: new Date().toISOString(),
        };
      }

      // 建立新使用者
      const { data: newUser, error: createError } = await auth.admin.createUser({
        email,
        email_confirm: true, // 自動確認 email (OAuth 已驗證)
        user_metadata: profile || {},
      });

      if (createError || !newUser.user) {
        throw new DatabaseError(`Failed to create user: ${createError?.message}`);
      }

      const metadata = newUser.user.user_metadata || {};
      
      return {
        id: newUser.user.id,
        email: newUser.user.email || '',
        created_at: newUser.user.created_at,
        last_sign_in_at: newUser.user.created_at,
        raw_user_meta_data: {
          name: profile?.name || metadata.name || metadata.full_name || '',
          avatar_url: profile?.avatar_url || metadata.avatar_url || metadata.picture || '',
          provider: (profile?.provider || metadata.provider || 'google') as 'google' | 'facebook',
        },
        updated_at: newUser.user.created_at,
      };
    } catch (error) {
      if (error instanceof DatabaseError || error.message?.includes('Invalid email')) {
        throw error;
      }

      throw new DatabaseError(`User operation failed: ${error.message}`);
    }
  }

  /**
   * 更新使用者最後登入時間
   * @param userId 使用者 ID
   */
  async updateLastSignIn(userId: string): Promise<void> {
    try {
      const auth = this.supabaseService.getAuth();

      const { error } = await auth.admin.updateUserById(userId, {
        user_metadata: {
          last_sign_in_at: new Date().toISOString(),
        },
      });

      if (error) {
        throw new DatabaseError(`Failed to update last sign-in: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(`Update last sign-in failed: ${error.message}`);
    }
  }

  /**
   * 驗證 email 格式
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
