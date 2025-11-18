import { Test, TestingModule } from '@nestjs/testing';
import { AccountLinkingService } from './account-linking.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('AccountLinkingService', () => {
  let service: AccountLinkingService;
  let supabaseService: SupabaseService;

  const mockFrom = jest.fn();
  const mockSupabaseService = {
    getDatabase: jest.fn().mockReturnValue({
      from: mockFrom,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountLinkingService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<AccountLinkingService>(AccountLinkingService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('linkSocialAccount', () => {
    it('應該成功連結相同 email 的社群帳號', async () => {
      // Arrange
      const userId = 'user-123';
      const provider = 'google';
      const providerUserId = 'google-456';

      const mockAccount = {
        id: 'social-123',
        user_id: userId,
        provider,
        provider_user_id: providerUserId,
        linked_at: new Date().toISOString(),
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAccount,
              error: null,
            }),
          }),
        }),
      });

      // Act
      const result = await service.linkSocialAccount(userId, provider, providerUserId);

      // Assert
      expect(result.user_id).toBe(userId);
      expect(result.provider).toBe(provider);
      expect(result.provider_user_id).toBe(providerUserId);
    });

    it('應該支援不同 provider 但相同 email 的連結', async () => {
      // Arrange
      const userId = 'user-123';

      // Act - 測試兩次呼叫（分別測試）
      
      // 第一次：連結 Google
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'social-123',
                user_id: userId,
                provider: 'google',
                provider_user_id: 'google-456',
                linked_at: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      });

      const result1 = await service.linkSocialAccount(userId, 'google', 'google-456');

      // 第二次：連結 Facebook
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'social-456',
                user_id: userId,
                provider: 'facebook',
                provider_user_id: 'facebook-789',
                linked_at: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      });

      const result2 = await service.linkSocialAccount(userId, 'facebook', 'facebook-789');

      // Assert
      expect(result1.provider).toBe('google');
      expect(result2.provider).toBe('facebook');
    });

    it('應該驗證 Provider User ID 唯一性', async () => {
      // Arrange
      const userId = 'user-123';
      const provider = 'google';
      const providerUserId = 'google-duplicate-456';

      const existingAccount = {
        id: 'existing-social-123',
        user_id: userId,
        provider,
        provider_user_id: 'old-google-id',
        linked_at: new Date().toISOString(),
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: existingAccount,
            error: null,
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...existingAccount, provider_user_id: providerUserId },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await service.linkSocialAccount(userId, provider, providerUserId);

      // Assert
      expect(result.provider_user_id).toBe(providerUserId);
    });
  });

  describe('findUserByProvider', () => {
    it('應該根據 provider 和 provider_user_id 查找使用者', async () => {
      // Arrange
      const provider = 'google';
      const providerUserId = 'google-user-789';
      const mockUserId = 'user-789';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { user_id: mockUserId },
            error: null,
          }),
        }),
      });

      // Act
      const result = await service.findUserByProvider(provider, providerUserId);

      // Assert
      expect(result).toBe(mockUserId);
    });

    it('應該在找不到使用者時返回 null', async () => {
      // Arrange
      const provider = 'facebook';
      const providerUserId = 'non-existent-user';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
      });

      // Act
      const result = await service.findUserByProvider(provider, providerUserId);

      // Assert
      expect(result).toBeNull();
    });
  });
});
