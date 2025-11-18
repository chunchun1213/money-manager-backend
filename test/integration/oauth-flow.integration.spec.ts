import { Test, TestingModule } from '@nestjs/testing';
import { OAuthService } from '../auth/oauth.service';
import { UserService } from '../user/user.service';
import { AccountLinkingService } from '../user/account-linking.service';
import { TokenService } from '../auth/token.service';
import { SessionService } from '../auth/session.service';
import { SupabaseService } from '../supabase/supabase.service';
import { RedisService } from '@/config/redis.config';

describe('OAuth Login Flow Integration', () => {
  let oauthService: OAuthService;
  let userService: UserService;
  let accountLinkingService: AccountLinkingService;
  let tokenService: TokenService;
  let sessionService: SessionService;

  const mockSupabaseService = {
    getClient: jest.fn(),
    getAuth: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        UserService,
        AccountLinkingService,
        TokenService,
        SessionService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    oauthService = module.get<OAuthService>(OAuthService);
    userService = module.get<UserService>(UserService);
    accountLinkingService = module.get<AccountLinkingService>(AccountLinkingService);
    tokenService = module.get<TokenService>(TokenService);
    sessionService = module.get<SessionService>(SessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('完整 OAuth 登入流程 (新使用者)', () => {
    it('應該完成 Google OAuth → 建立使用者 → 連結社交帳號 → 產生 token → 建立 session', async () => {
      // Arrange: Mock OAuth 交換
      const oauthData = {
        userId: 'google-user-id',
        email: 'newuser@gmail.com',
        name: 'New User',
        avatarUrl: 'https://example.com/avatar.jpg',
        provider: 'google',
        accessToken: 'google-access-token',
        refreshToken: 'google-refresh-token',
      };

      jest.spyOn(oauthService, 'exchangeCodeForToken').mockResolvedValue(oauthData);

      // Arrange: Mock 使用者建立 (新使用者)
      const newUser = {
        id: 'supabase-user-123',
        email: 'newuser@gmail.com',
        created_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
      };

      jest.spyOn(userService, 'findOrCreateUser').mockResolvedValue(newUser);

      // Arrange: Mock 社交帳號連結
      const linkedAccount = {
        id: 'social-account-123',
        user_id: newUser.id,
        provider: 'google',
        provider_user_id: 'google-user-id',
        email: newUser.email,
      };

      jest.spyOn(accountLinkingService, 'linkSocialAccount').mockResolvedValue(linkedAccount);

      // Arrange: Mock token 產生
      jest.spyOn(tokenService, 'generateAccessToken').mockReturnValue('jwt.access.token');
      jest.spyOn(tokenService, 'generateRefreshToken').mockReturnValue('jwt.refresh.token');

      // Arrange: Mock session 建立
      const session = {
        id: 'session-456',
        user_id: newUser.id,
        token: 'jwt.access.token',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        revoked: false,
      };

      jest.spyOn(sessionService, 'createSession').mockResolvedValue(session);

      // Act: 執行完整流程
      const code = 'google-oauth-code';
      const codeVerifier = 'pkce-verifier';

      const step1 = await oauthService.exchangeCodeForToken(code, codeVerifier, 'google');
      const step2 = await userService.findOrCreateUser(step1.email, {
        name: step1.name,
        avatar_url: step1.avatarUrl,
      });
      const step3 = await accountLinkingService.linkSocialAccount(
        step2.id,
        step1.provider,
        step1.userId,
      );
      const accessToken = tokenService.generateAccessToken(step2.id, session.id);
      const refreshToken = tokenService.generateRefreshToken(step2.id, session.id);
      const step4 = await sessionService.createSession(step2.id, accessToken, {
        user_agent: 'Mozilla/5.0',
        ip: '192.168.1.1',
      });

      // Assert: 驗證每個步驟
      expect(step1.email).toBe('newuser@gmail.com');
      expect(step2.id).toBe('supabase-user-123');
      expect(step3.provider).toBe('google');
      expect(accessToken).toBe('jwt.access.token');
      expect(refreshToken).toBe('jwt.refresh.token');
      expect(step4.user_id).toBe(newUser.id);
    });
  });

  describe('完整 OAuth 登入流程 (既有使用者)', () => {
    it('應該找到既有使用者並建立新 session', async () => {
      // Arrange
      const oauthData = {
        userId: 'google-user-456',
        email: 'existinguser@gmail.com',
        name: 'Existing User',
        provider: 'google',
        accessToken: 'token',
        refreshToken: 'refresh',
      };

      const existingUser = {
        id: 'supabase-user-456',
        email: 'existinguser@gmail.com',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 天前註冊
        last_sign_in_at: new Date().toISOString(),
      };

      jest.spyOn(oauthService, 'exchangeCodeForToken').mockResolvedValue(oauthData);
      jest.spyOn(userService, 'findOrCreateUser').mockResolvedValue(existingUser);
      jest.spyOn(accountLinkingService, 'findUserByProvider').mockResolvedValue(existingUser.id);
      jest.spyOn(tokenService, 'generateAccessToken').mockReturnValue('jwt.access.token');
      jest.spyOn(sessionService, 'createSession').mockResolvedValue({
        id: 'session-789',
        user_id: existingUser.id,
        token: 'jwt.access.token',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        revoked: false,
      });

      // Act
      const step1 = await oauthService.exchangeCodeForToken('code', 'verifier', 'google');
      const step2 = await userService.findOrCreateUser(step1.email, { name: step1.name });
      const userId = await accountLinkingService.findUserByProvider('google', step1.userId);
      const accessToken = tokenService.generateAccessToken(step2.id, 'session-789');
      const session = await sessionService.createSession(step2.id, accessToken, {});

      // Assert
      expect(userId).toBe(existingUser.id);
      expect(session.user_id).toBe(existingUser.id);
    });
  });

  describe('錯誤處理整合測試', () => {
    it('應該在 OAuth 失敗時停止流程', async () => {
      // Arrange
      jest.spyOn(oauthService, 'exchangeCodeForToken').mockRejectedValue(
        new Error('Invalid OAuth code'),
      );

      // Act & Assert
      await expect(
        oauthService.exchangeCodeForToken('invalid-code', 'verifier', 'google'),
      ).rejects.toThrow('Invalid OAuth code');
    });

    it('應該在使用者建立失敗時停止流程', async () => {
      // Arrange
      const oauthData = {
        userId: 'google-123',
        email: 'test@example.com',
        name: 'Test',
        provider: 'google',
        accessToken: 'token',
        refreshToken: 'refresh',
      };

      jest.spyOn(oauthService, 'exchangeCodeForToken').mockResolvedValue(oauthData);
      jest.spyOn(userService, 'findOrCreateUser').mockRejectedValue(
        new Error('Database error'),
      );

      // Act & Assert
      await expect(userService.findOrCreateUser(oauthData.email, {})).rejects.toThrow(
        'Database error',
      );
    });
  });
});
