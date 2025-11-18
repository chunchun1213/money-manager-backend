import { Test, TestingModule } from '@nestjs/testing';
import { OAuthService } from './oauth.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('OAuthService', () => {
  let service: OAuthService;
  let supabaseService: SupabaseService;

  const mockExchangeCodeForSession = jest.fn();
  const mockSupabaseService = {
    getAuth: jest.fn().mockReturnValue({
      exchangeCodeForSession: mockExchangeCodeForSession,
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

      mockExchangeCodeForSession.mockResolvedValue({
        data: {
          user: {
            id: 'google-123',
            email: 'testuser@gmail.com',
            user_metadata: {
              full_name: 'Test User',
              avatar_url: 'https://example.com/avatar.jpg',
            },
          },
          session: {
            access_token: 'google-access-token',
            refresh_token: 'google-refresh-token',
          },
        },
        error: null,
      });

      // Act
      const result = await service.exchangeCodeForToken(code, codeVerifier, provider);

      // Assert
      expect(result.userId).toBe('google-123');
      expect(result.email).toBe('testuser@gmail.com');
      expect(result.name).toBe('Test User');
      expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(result.provider).toBe('google');
      expect(result.accessToken).toBe('google-access-token');
      expect(result.refreshToken).toBe('google-refresh-token');
    });

    it('應該成功交換 Facebook authorization code', async () => {
      // Arrange
      const code = 'valid-facebook-code';
      const codeVerifier = 'valid-code-verifier';
      const provider = 'facebook';

      mockExchangeCodeForSession.mockResolvedValue({
        data: {
          user: {
            id: 'facebook-456',
            email: 'testuser@facebook.com',
            user_metadata: {
              name: 'Facebook User',
              picture: 'https://graph.facebook.com/avatar.jpg',
            },
          },
          session: {
            access_token: 'facebook-access-token',
            refresh_token: 'facebook-refresh-token',
          },
        },
        error: null,
      });

      // Act
      const result = await service.exchangeCodeForToken(code, codeVerifier, provider);

      // Assert
      expect(result.userId).toBe('facebook-456');
      expect(result.email).toBe('testuser@facebook.com');
      expect(result.name).toBe('Facebook User');
      expect(result.avatarUrl).toBe('https://graph.facebook.com/avatar.jpg');
      expect(result.provider).toBe('facebook');
      expect(result.accessToken).toBe('facebook-access-token');
      expect(result.refreshToken).toBe('facebook-refresh-token');
    });

    it('應該在無效 code 時拋出錯誤', async () => {
      // Arrange
      const code = 'invalid-code';
      const codeVerifier = 'verifier';
      const provider = 'google';

      mockExchangeCodeForSession.mockResolvedValue({
        data: null,
        error: { message: 'Invalid authorization code' },
      });

      // Act & Assert
      await expect(service.exchangeCodeForToken(code, codeVerifier, provider)).rejects.toThrow(
        'OAuth code exchange failed',
      );
    });

    it('應該處理 OAuth 請求超時', async () => {
      // Arrange
      const code = 'valid-code';
      const codeVerifier = 'verifier';
      const provider = 'google';

      mockExchangeCodeForSession.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      });

      // Act & Assert
      await expect(service.exchangeCodeForToken(code, codeVerifier, provider)).rejects.toThrow(
        'OAuth request timeout',
      );
    });

    it('應該在缺少使用者資料時拋出錯誤', async () => {
      // Arrange
      const code = 'valid-code';
      const codeVerifier = 'verifier';
      const provider = 'google';

      mockExchangeCodeForSession.mockResolvedValue({
        data: {
          user: null, // 缺少 user
          session: {
            access_token: 'token',
          },
        },
        error: null,
      });

      // Act & Assert
      await expect(service.exchangeCodeForToken(code, codeVerifier, provider)).rejects.toThrow(
        'Missing user data in OAuth response',
      );
    });
  });
});
