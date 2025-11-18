import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseService } from './services/supabase/supabase.service';
import { RedisService } from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  providers: [SupabaseService, RedisService],
  exports: [SupabaseService, RedisService],
})
export class AppModule {}
