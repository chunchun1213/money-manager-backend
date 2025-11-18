import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SupabaseService } from './services/supabase/supabase.service';
import { RedisService } from './config/redis.config';
import { OAuthService } from './services/auth/oauth.service';
import { TokenService } from './services/auth/token.service';
import { SessionService } from './services/auth/session.service';
import { UserService } from './services/user/user.service';
import { AccountLinkingService } from './services/user/account-linking.service';
import { AuditService } from './services/audit/audit.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'default-secret-key-change-in-production',
      signOptions: {
        algorithm: 'HS256',
      },
    }),
  ],
  providers: [
    SupabaseService,
    RedisService,
    OAuthService,
    TokenService,
    SessionService,
    UserService,
    AccountLinkingService,
    AuditService,
  ],
  exports: [
    SupabaseService,
    RedisService,
    OAuthService,
    TokenService,
    SessionService,
    UserService,
    AccountLinkingService,
    AuditService,
  ],
})
export class AppModule {}
