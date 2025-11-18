import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { SupabaseService } from '../supabase/supabase.service';
import { encryptIpAddress } from '@/lib/utils';

// Mock utils
jest.mock('@/lib/utils', () => ({
  encryptIpAddress: jest.fn((ip) => `encrypted:${ip}`),
  formatTimestamp: jest.fn(() => new Date().toISOString()),
}));

describe('AuditService', () => {
  let service: AuditService;
  let supabaseService: SupabaseService;

  const mockSupabaseService = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logLogin', () => {
    it('應該記錄成功登入', async () => {
      // Arrange
      const userId = 'user-123';
      const ip = '192.168.1.1';
      const result = 'success';

      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'audit-log-id' },
        error: null,
      });

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: mockInsert,
        }),
      });

      // Act
      await service.logLogin(userId, ip, result);

      // Assert
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          action: 'login',
          ip_address: expect.stringContaining('encrypted:'),
          result: 'success',
        }),
      );
    });

    it('應該記錄失敗登入與錯誤訊息', async () => {
      // Arrange
      const userId = 'user-456';
      const ip = '10.0.0.1';
      const result = 'failure';
      const error = 'Invalid OAuth code';

      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'audit-log-id' },
        error: null,
      });

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: mockInsert,
        }),
      });

      // Act
      await service.logLogin(userId, ip, result, error);

      // Assert
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          action: 'login',
          result: 'failure',
          error_message: error,
        }),
      );
    });

    it('應該加密 IP 位址儲存', async () => {
      // Arrange
      const userId = 'user-789';
      const ip = '172.16.0.1';
      const result = 'success';

      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'audit-log-id' },
        error: null,
      });

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: mockInsert,
        }),
      });

      // Act
      await service.logLogin(userId, ip, result);

      // Assert
      expect(encryptIpAddress).toHaveBeenCalledWith(ip);
      const callArgs = mockInsert.mock.calls[0][0];
      expect(callArgs.ip_address).toBe('encrypted:172.16.0.1');
    });

    it('應該異步寫入不阻塞主流程', async () => {
      // Arrange
      const userId = 'user-101';
      const ip = '192.168.2.1';
      const result = 'success';

      const mockInsert = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ data: { id: 'log-id' }, error: null }), 100);
        });
      });

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: mockInsert,
        }),
      });

      // Act
      const startTime = Date.now();
      await service.logLogin(userId, ip, result);
      const endTime = Date.now();

      // Assert - 應該很快完成 (因為是異步)
      expect(endTime - startTime).toBeLessThan(50);
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('logLogout', () => {
    it('應該記錄登出操作', async () => {
      // Arrange
      const userId = 'user-123';
      const ip = '192.168.1.1';

      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'audit-log-id' },
        error: null,
      });

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: mockInsert,
        }),
      });

      // Act
      await service.logLogout(userId, ip);

      // Assert
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          action: 'logout',
          result: 'success',
        }),
      );
    });
  });

  describe('logTokenValidationFailed', () => {
    it('應該記錄 token 驗證失敗', async () => {
      // Arrange
      const userId = 'user-456';
      const ip = '10.0.0.1';
      const error = 'Token expired';

      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'audit-log-id' },
        error: null,
      });

      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: mockInsert,
        }),
      });

      // Act
      await service.logTokenValidationFailed(userId, ip, error);

      // Assert
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'token_validation_failed',
          result: 'failure',
          error_message: error,
        }),
      );
    });
  });
});
