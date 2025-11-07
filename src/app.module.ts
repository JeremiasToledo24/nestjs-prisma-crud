import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { MessageModule } from './message/message.module';
import { AppController } from './app.controller';
import { MetricsModule } from './metrics/metrics.module';
// --- NUEVOS IMPORTS ---
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
// --- FIN NUEVOS IMPORTS ---
@Module({
  imports: [ChatModule, MessageModule, MetricsModule],
  controllers: [AppController],
  providers: [{
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    }],
})
export class AppModule {}