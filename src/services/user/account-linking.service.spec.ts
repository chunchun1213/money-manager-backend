import { Test, TestingModule } from '@nestjs/testing';
import { AccountLinkingService } from './account-linking.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailConflictError, DatabaseError } from '@/lib/errors';

describe('AccountLinkingService', () => {
  let service: AccountLinkingService;
  let supabaseService: SupabaseService;

  const mockSupabaseService = {
    getClient: jest.fn(),
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
      const provider = 'facebook';
      const providerUserId = 'fb-789';

      const mockInsert = jest.fn().mockResolvedValue({
        data: {
          id: 'social-account-id',
          user_id: userId,
          provider,
          provider_user_id: providerUserId,
          linked_at: new Date().toISOString(),
        },
        error: null,
      });

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: mockInsert,
          select: jest.fn().mockReturnValue({
            single: jest.fn(),
          }),
        }),
      });

      // Act
      const result = await service.linkSocialAccount(userId, provider, providerUserId);

      // Assert
      expect(result.user_id).toBe(userId);
      expect(result.provider).toBe(provider);
      expect(result.provider_user_id).toBe(providerUserId);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('應該支援不同 provider 但相同 email 的連結', async () => {
      // Arrange
      const userId = 'user-123';
      const googleProviderId = 'google-456';
      const facebookProviderId = 'fb-789';

      const mockInsert = jest.fn()
        .mockResolvedValueOnce({
          data: { id: 'google-link', provider: 'google' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'facebook-link', provider: 'facebook' },
          error: null,
        });

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: mockInsert,
          select: jest.fn().mockReturnValue({
            single: jest.fn(),
          }),
        }),
      });

      // Act
      await service.linkSocialAccount(userId, 'google', googleProviderId);
      await service.linkSocialAccount(userId, 'facebook', facebookProviderId);

      // Assert
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });

    it('應該防止重複連結相同社群帳號', async () => {
      // Arrange
      const userId = 'user-123';
      const provider = 'google';
      const providerUserId = 'google-456';

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'Duplicate key violation' },
          }),
          select: jest.fn().mockReturnValue({
            single: jest.fn(),
          }),
        }),
      });

      // Act & Assert
      await expect(
        service.linkSocialAccount(userId, provider, providerUserId),
      ).rejects.toThrow(DatabaseError);
    });

    it('應該驗證 Provider User ID 唯一性', async () => {
      // Arrange
      const userId = 'user-123';
      const provider = 'google';
      const providerUserId = 'google-456';

      // 檢查是否已存在
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-link', user_id: 'different-user' },
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: mockSelect,
        }),
      });

      // Act & Assert
      await expect(
        service.findUserByProvider(provider, providerUserId),
      ).resolves.not.toBeNull();
    });
  });

  describe('findUserByProvider', () => {
    it('應該根據 provider 和 provider_user_id 查找使用者', async () => {
      // Arrange
      const provider = 'google';
      const providerUserId = 'google-user-789';

      const mockUserId = 'user-789';

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { user_id: mockUserId },
              error: null,
            }),
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
      const provider = 'google';
      const providerUserId = 'non-existent';

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
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
