import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('UserService', () => {
  let service: UserService;
  let supabaseService: SupabaseService;

  const mockListUsers = jest.fn();
  const mockCreateUser = jest.fn();
  const mockUpdateUserById = jest.fn();

  const mockSupabaseService = {
    getAuth: jest.fn().mockReturnValue({
      admin: {
        listUsers: mockListUsers,
        createUser: mockCreateUser,
        updateUserById: mockUpdateUserById,
      },
    }),
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
        avatar_url: 'https://example.com/avatar.jpg',
      };

      const mockNewUser = {
        id: 'user-123',
        email,
        created_at: new Date().toISOString(),
        user_metadata: profile,
      };

      mockListUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      mockCreateUser.mockResolvedValue({
        data: { user: mockNewUser },
        error: null,
      });

      // Act
      const result = await service.findOrCreateUser(email, profile);

      // Assert
      expect(result.id).toBe('user-123');
      expect(result.email).toBe(email);
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email,
          email_confirm: true,
        }),
      );
    });

    it('應該在再次登入時使用現有使用者', async () => {
      // Arrange
      const email = 'existinguser@example.com';
      const profile = {
        name: 'Existing User',
      };

      const mockExistingUser = {
        id: 'user-456',
        email,
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        user_metadata: { name: 'Existing User' },
      };

      mockListUsers.mockResolvedValue({
        data: { users: [mockExistingUser] },
        error: null,
      });

      mockUpdateUserById.mockResolvedValue({
        data: { user: mockExistingUser },
        error: null,
      });

      // Act
      const result = await service.findOrCreateUser(email, profile);

      // Assert
      expect(result.id).toBe('user-456');
      expect(result.email).toBe(email);
      expect(mockUpdateUserById).toHaveBeenCalled();
    });

    it('應該驗證 email 格式', async () => {
      // Arrange
      const invalidEmail = 'not-an-email';
      const profile = {};

      // Act & Assert
      await expect(service.findOrCreateUser(invalidEmail, profile)).rejects.toThrow(
        'Invalid email format',
      );
    });
  });

  describe('updateLastSignIn', () => {
    it('應該成功更新最後登入時間', async () => {
      // Arrange
      const userId = 'user-789';

      mockUpdateUserById.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      // Act
      await service.updateLastSignIn(userId);

      // Assert
      expect(mockUpdateUserById).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          user_metadata: expect.objectContaining({
            last_sign_in_at: expect.any(String),
          }),
        }),
      );
    });

    it('應該處理更新失敗的情況', async () => {
      // Arrange
      const userId = 'user-101';

      mockUpdateUserById.mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      });

      // Act & Assert
      await expect(service.updateLastSignIn(userId)).rejects.toThrow('Failed to update last sign-in');
    });
  });
});
