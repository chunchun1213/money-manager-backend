import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InvalidTokenError, ExpiredTokenError } from '@/lib/errors';
import { TOKEN_EXPIRY_DAYS, REFRESH_TOKEN_EXPIRY_DAYS } from '@/lib/constants';

export interface TokenPayload {
  sub: string; // userId
  sessionId: string;
  type: 'access' | 'refresh';
  iat: number;
  exp?: number;
}

export interface VerifiedToken {
  userId: string;
  sessionId: string;
}

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * 產生 JWT access token (30 天過期)
   * @param userId 使用者 ID
   * @param sessionId Session ID
   * @returns JWT token 字串
   */
  generateAccessToken(userId: string, sessionId: string): string {
    const payload: Omit<TokenPayload, 'exp'> = {
      sub: userId,
      sessionId,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.sign(payload, {
      expiresIn: TOKEN_EXPIRY_DAYS * 24 * 60 * 60, // 30 days in seconds
    });
  }

  /**
   * 產生 JWT refresh token (90 天過期)
   * @param userId 使用者 ID
   * @param sessionId Session ID
   * @returns JWT refresh token 字串
   */
  generateRefreshToken(userId: string, sessionId: string): string {
    const payload: Omit<TokenPayload, 'exp'> = {
      sub: userId,
      sessionId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.sign(payload, {
      expiresIn: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60, // 90 days in seconds
    });
  }

  /**
   * 驗證 access token
   * @param token JWT token
   * @returns 驗證後的 payload
   * @throws ExpiredTokenError 當 token 過期
   * @throws InvalidTokenError 當 token 無效
   */
  verifyAccessToken(token: string): VerifiedToken {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token);

      // 檢查 token 類型
      if (payload.type !== 'access') {
        throw new InvalidTokenError('Invalid token type');
      }

      return {
        userId: payload.sub,
        sessionId: payload.sessionId,
      };
    } catch (error) {
      if (error.message?.includes('expired')) {
        throw new ExpiredTokenError('Access token has expired');
      }

      if (error.message?.includes('signature') || error.message?.includes('malformed')) {
        throw new InvalidTokenError('Invalid token signature or format');
      }

      throw new InvalidTokenError(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * 驗證 refresh token
   * @param token JWT refresh token
   * @returns 驗證後的 payload
   * @throws ExpiredTokenError 當 token 過期
   * @throws InvalidTokenError 當 token 無效或類型錯誤
   */
  verifyRefreshToken(token: string): VerifiedToken {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token);

      // 檢查 token 類型（不能用 access token 當 refresh token）
      if (payload.type !== 'refresh') {
        throw new InvalidTokenError('Invalid token type - must be refresh token');
      }

      return {
        userId: payload.sub,
        sessionId: payload.sessionId,
      };
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw error;
      }

      if (error.message?.includes('expired')) {
        throw new ExpiredTokenError('Refresh token has expired');
      }

      if (error.message?.includes('signature') || error.message?.includes('malformed')) {
        throw new InvalidTokenError('Invalid token signature or format');
      }

      throw new InvalidTokenError(`Token verification failed: ${error.message}`);
    }
  }
}
