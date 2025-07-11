/**
 * 🔌 WEBSOCKET MODULE - Generic Enterprise Architecture
 * 
 * Simple, scalable WebSocket module for enterprise SaaS applications
 * Supports platform/tenant isolation and any real-time operation
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { WebSocketService } from './websocket.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '24h' },
      }),
    }),
  ],
  providers: [WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}

// Export the service directly for easier importing
export { WebSocketService }; 