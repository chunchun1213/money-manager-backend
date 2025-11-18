import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { SupabaseService } from '../supabase/supabase.service';
import { DatabaseError } from '@/lib/errors';

describe('UserService', () => {
  let service: UserService;
  let supabaseService: SupabaseService;

  const mockSupabaseService = {
    getClient: jest.fn(),
    getAuth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOrCreateUser', () => {
    it('應該在首次登入時建立新使用者', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const profile = {
        name: 'New User',
        avatarUrl: 'https://example.com/avatar.jpg',
        provider: 'google' as const,
        providerId: 'google-123',
      };

      const mockUser = {
        id: 'new-user-id',
        email,
        raw_user_meta_data: {
          name: profile.name,
          avatar_url: profile.avatarUrl,
          provider: profile.provider,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
      };

      mockSupabaseService.getAuth.mockReturnValue({
        admin: {
          getUserByEmail: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
          createUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      });

      // Act
      const result = await service.findOrCreateUser(email, profile);

      // Assert
      expect(result.id).toBe('new-user-id');
      expect(result.email).toBe(email);
      expect(mockSupabaseService.getAuth().admin.createUser).toHaveBeenCalled();
    });

    it('應該在再次登入時使用現有使用者', async () => {
      // Arrange
      const email = 'existing@example.com';
      const profile = {
        name: 'Existing User',
        avatarUrl: 'https://example.com/avatar.jpg',
        provider: 'google' as const,
        providerId: 'google-456',
      };

      const existingUser = {
        id: 'existing-user-id',
        email,
        raw_user_meta_data: {
          name: 'Existing User',
          avatar_url: 'https://example.com/avatar.jpg',
          provider: 'google',
        },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        last_sign_in_at: '2025-01-01T00:00:00Z',
      };

      mockSupabaseService.getAuth.mockReturnValue({
        admin: {
          getUserByEmail: jest.fn().mockResolvedValue({
            data: { user: existingUser },
            error: null,
          }),
        },
      });

      // Act
      const result = await service.findOrCreateUser(email, profile);

      // Assert
      expect(result.id).toBe('existing-user-id');
      expect(result.email).toBe(email);
    });

    it('應該驗證 Email 格式', async () => {
      // Arrange
      const invalidEmail = 'not-an-email';
      const profile = {
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        provider: 'google' as const,
        providerId: 'google-789',
      };

      // Act & Assert
      await expect(service.findOrCreateUser(invalidEmail, profile)).rejects.toThrow();
    });
  });

  describe('updateLastSignIn', () => {
    it('應該更新使用者的 last_sign_in_at', async () => {
      // Arrange
      const userId = 'user-123';

      mockSupabaseService.getAuth.mockReturnValue({
        admin: {
          updateUserById: jest.fn().mockResolvedValue({
            data: { user: { last_sign_in_at: new Date().toISOString() } },
            error: null,
          }),
        },
      });

      // Act
      await service.updateLastSignIn(userId);

      // Assert
      expect(mockSupabaseService.getAuth().admin.updateUserById).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          user_metadata: expect.objectContaining({
            last_sign_in_at: expect.any(String),
          }),
        }),
      );
    });

    it('應該在更新失敗時拋出 DatabaseError', async () => {
      // Arrange
      const userId = 'user-123';

      mockSupabaseService.getAuth.mockReturnValue({
        admin: {
          updateUserById: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Update failed' },
          }),
        },
      });

      // Act & Assert
      await expect(service.updateLastSignIn(userId)).rejects.toThrow(DatabaseError);
    });
  });
});
