import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { InvalidTokenError, ExpiredTokenError } from '@/lib/errors';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('應該產生有效的 JWT access token', () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'session-456';
      const expectedToken = 'jwt.access.token';

      mockJwtService.sign.mockReturnValue(expectedToken);

      // Act
      const token = service.generateAccessToken(userId, sessionId);

      // Assert
      expect(token).toBe(expectedToken);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: userId,
          sessionId,
          type: 'access',
        }),
        expect.objectContaining({
          expiresIn: expect.any(Number),
        }),
      );
    });

    it('應該在 token payload 中包含正確的資訊', () => {
      // Arrange
      const userId = 'user-789';
      const sessionId = 'session-101';

      // Act
      service.generateAccessToken(userId, sessionId);

      // Assert
      const callArgs = mockJwtService.sign.mock.calls[0];
      const payload = callArgs[0];

      expect(payload.sub).toBe(userId);
      expect(payload.sessionId).toBe(sessionId);
      expect(payload.type).toBe('access');
      expect(payload.iat).toBeDefined();
    });
  });

  describe('generateRefreshToken', () => {
    it('應該產生有效的 refresh token', () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'session-456';
      const expectedToken = 'jwt.refresh.token';

      mockJwtService.sign.mockReturnValue(expectedToken);

      // Act
      const token = service.generateRefreshToken(userId, sessionId);

      // Assert
      expect(token).toBe(expectedToken);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: userId,
          sessionId,
          type: 'refresh',
        }),
        expect.any(Object),
      );
    });

    it('應該使用更長的過期時間 (90 天)', () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'session-456';

      // Act
      service.generateRefreshToken(userId, sessionId);

      // Assert
      const callArgs = mockJwtService.sign.mock.calls[0];
      const options = callArgs[1];

      expect(options.expiresIn).toBeGreaterThan(30 * 24 * 60 * 60); // > 30 days
    });
  });

  describe('verifyAccessToken', () => {
    it('應該成功驗證有效的 token', () => {
      // Arrange
      const token = 'valid.jwt.token';
      const payload = {
        sub: 'user-123',
        sessionId: 'session-456',
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwtService.verify.mockReturnValue(payload);

      // Act
      const result = service.verifyAccessToken(token);

      // Assert
      expect(result.userId).toBe('user-123');
      expect(result.sessionId).toBe('session-456');
    });

    it('應該在 token 過期時拋出 ExpiredTokenError', () => {
      // Arrange
      const token = 'expired.jwt.token';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      // Act & Assert
      expect(() => service.verifyAccessToken(token)).toThrow(ExpiredTokenError);
    });

    it('應該在無效簽名時拋出 InvalidTokenError', () => {
      // Arrange
      const token = 'invalid.signature.token';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      // Act & Assert
      expect(() => service.verifyAccessToken(token)).toThrow(InvalidTokenError);
    });

    it('應該在 token 格式錯誤時拋出 InvalidTokenError', () => {
      // Arrange
      const token = 'malformed-token';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      // Act & Assert
      expect(() => service.verifyAccessToken(token)).toThrow(InvalidTokenError);
    });
  });

  describe('verifyRefreshToken', () => {
    it('應該成功驗證 refresh token', () => {
      // Arrange
      const token = 'valid.refresh.token';
      const payload = {
        sub: 'user-123',
        sessionId: 'session-456',
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60,
      };

      mockJwtService.verify.mockReturnValue(payload);

      // Act
      const result = service.verifyRefreshToken(token);

      // Assert
      expect(result.userId).toBe('user-123');
      expect(result.sessionId).toBe('session-456');
    });

    it('應該拒絕 access token 作為 refresh token', () => {
      // Arrange
      const token = 'access.token.used.as.refresh';
      const payload = {
        sub: 'user-123',
        sessionId: 'session-456',
        type: 'access', // 錯誤的 type
      };

      mockJwtService.verify.mockReturnValue(payload);

      // Act & Assert
      expect(() => service.verifyRefreshToken(token)).toThrow(InvalidTokenError);
    });
  });
});
