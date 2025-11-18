import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { SupabaseService } from '../supabase/supabase.service';
import { RedisService } from '@/config/redis.config';
import { DatabaseError } from '@/lib/errors';

describe('SessionService', () => {
  let service: SessionService;
  let supabaseService: SupabaseService;
  let redisService: RedisService;

  const mockSupabaseService = {
    getClient: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
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

    service = module.get<SessionService>(SessionService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('應該建立新 session (30 天過期)', async () => {
      // Arrange
      const userId = 'user-123';
      const token = 'jwt.access.token';
      const deviceInfo = {
        user_agent: 'Mozilla/5.0',
        ip: '192.168.1.1',
      };

      const mockSession = {
        id: 'session-456',
        user_id: userId,
        token,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        revoked: false,
        device_info: deviceInfo,
      };

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await service.createSession(userId, token, deviceInfo);

      // Assert
      expect(result.user_id).toBe(userId);
      expect(result.token).toBe(token);
      expect(result.revoked).toBe(false);
      expect(result.device_info).toEqual(deviceInfo);
    });

    it('應該記錄裝置資訊 (選填)', async () => {
      // Arrange
      const userId = 'user-123';
      const token = 'jwt.token';
      const deviceInfo = {
        user_agent: 'iPhone iOS 17.0',
        ip: '10.0.0.1',
        platform: 'mobile',
      };

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { device_info: deviceInfo },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await service.createSession(userId, token, deviceInfo);

      // Assert
      expect(result.device_info).toEqual(deviceInfo);
    });
  });

  describe('validateSession', () => {
    it('應該驗證有效 session 返回 true', async () => {
      // Arrange
      const token = 'valid.token';
      const mockSession = {
        id: 'session-123',
        revoked: false,
        expires_at: new Date(Date.now() + 60000).toISOString(), // 未來 1 分鐘
      };

      // 先檢查 Redis cache
      mockRedisService.get.mockResolvedValue(null);

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await service.validateSession(token);

      // Assert
      expect(result).toBe(true);
    });

    it('應該檢查 revoked session 返回 false', async () => {
      // Arrange
      const token = 'revoked.token';
      const mockSession = {
        id: 'session-123',
        revoked: true,
        expires_at: new Date(Date.now() + 60000).toISOString(),
      };

      mockRedisService.get.mockResolvedValue(null);

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await service.validateSession(token);

      // Assert
      expect(result).toBe(false);
    });

    it('應該檢查過期 session 返回 false', async () => {
      // Arrange
      const token = 'expired.token';
      const mockSession = {
        id: 'session-123',
        revoked: false,
        expires_at: new Date(Date.now() - 60000).toISOString(), // 過去 1 分鐘
      };

      mockRedisService.get.mockResolvedValue(null);

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await service.validateSession(token);

      // Assert
      expect(result).toBe(false);
    });

    it('應該使用 Redis cache 加速驗證', async () => {
      // Arrange
      const token = 'cached.token';

      // Redis cache hit
      mockRedisService.get.mockResolvedValue(
        JSON.stringify({ valid: true, sessionId: 'session-123' }),
      );

      // Act
      const result = await service.validateSession(token);

      // Assert
      expect(result).toBe(true);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled(); // 不應查詢資料庫
    });
  });

  describe('getSessionByToken', () => {
    it('應該根據 token 取得 session', async () => {
      // Arrange
      const token = 'test.token';
      const mockSession = {
        id: 'session-789',
        user_id: 'user-456',
        token,
        revoked: false,
      };

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await service.getSessionByToken(token);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('session-789');
      expect(result?.user_id).toBe('user-456');
    });

    it('應該在找不到 session 時返回 null', async () => {
      // Arrange
      const token = 'non.existent.token';

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await service.getSessionByToken(token);

      // Assert
      expect(result).toBeNull();
    });
  });
});
