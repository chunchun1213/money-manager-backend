import { Test, TestingModule } from '@nestjs/testing';
import { OAuthService } from './oauth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { OAuthError } from '@/lib/errors';

describe('OAuthService', () => {
  let service: OAuthService;
  let supabaseService: SupabaseService;

  const mockSupabaseService = {
    getAuth: jest.fn().mockReturnValue({
      exchangeCodeForSession: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exchangeCodeForToken', () => {
    it('應該成功交換 Google authorization code', async () => {
      // Arrange
      const code = 'valid-google-code';
      const codeVerifier = 'valid-code-verifier';
      const provider = 'google';

      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {
            name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg',
            provider: 'google',
          },
        },
      };

      mockSupabaseService.getAuth.mockReturnValue({
        exchangeCodeForSession: jest.fn().mockResolvedValue({
          data: { session: mockSession },
          error: null,
        }),
      });

      // Act
      const result = await service.exchangeCodeForToken(code, codeVerifier, provider);

      // Assert
      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        provider: 'google',
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('應該成功交換 Facebook authorization code', async () => {
      // Arrange
      const code = 'valid-facebook-code';
      const codeVerifier = 'valid-code-verifier';
      const provider = 'facebook';

      const mockSession = {
        access_token: 'mock-fb-token',
        refresh_token: 'mock-fb-refresh',
        user: {
          id: 'fb-user-456',
          email: 'fbuser@example.com',
          user_metadata: {
            name: 'FB User',
            avatar_url: 'https://facebook.com/avatar.jpg',
            provider: 'facebook',
          },
        },
      };

      mockSupabaseService.getAuth.mockReturnValue({
        exchangeCodeForSession: jest.fn().mockResolvedValue({
          data: { session: mockSession },
          error: null,
        }),
      });

      // Act
      const result = await service.exchangeCodeForToken(code, codeVerifier, provider);

      // Assert
      expect(result.provider).toBe('facebook');
      expect(result.userId).toBe('fb-user-456');
      expect(result.email).toBe('fbuser@example.com');
    });

    it('應該在無效 OAuth code 時拋出 OAuthError', async () => {
      // Arrange
      const code = 'invalid-code';
      const codeVerifier = 'valid-code-verifier';
      const provider = 'google';

      mockSupabaseService.getAuth.mockReturnValue({
        exchangeCodeForSession: jest.fn().mockResolvedValue({
          data: { session: null },
          error: { message: 'Invalid authorization code' },
        }),
      });

      // Act & Assert
      await expect(
        service.exchangeCodeForToken(code, codeVerifier, provider),
      ).rejects.toThrow(OAuthError);
    });

    it('應該處理 OAuth 提供者 timeout', async () => {
      // Arrange
      const code = 'timeout-code';
      const codeVerifier = 'valid-code-verifier';
      const provider = 'google';

      mockSupabaseService.getAuth.mockReturnValue({
        exchangeCodeForSession: jest.fn().mockRejectedValue(new Error('Request timeout')),
      });

      // Act & Assert
      await expect(
        service.exchangeCodeForToken(code, codeVerifier, provider),
      ).rejects.toThrow(OAuthError);
    });

    it('應該在缺少使用者資料時拋出錯誤', async () => {
      // Arrange
      const code = 'valid-code';
      const codeVerifier = 'valid-code-verifier';
      const provider = 'google';

      mockSupabaseService.getAuth.mockReturnValue({
        exchangeCodeForSession: jest.fn().mockResolvedValue({
          data: { session: { user: null } },
          error: null,
        }),
      });

      // Act & Assert
      await expect(
        service.exchangeCodeForToken(code, codeVerifier, provider),
      ).rejects.toThrow(OAuthError);
    });
  });
});
