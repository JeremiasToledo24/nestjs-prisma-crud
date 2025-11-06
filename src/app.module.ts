import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { MessageModule } from './message/message.module';
import { AppController } from './app.controller';
@Module({
  imports: [ChatModule, MessageModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}