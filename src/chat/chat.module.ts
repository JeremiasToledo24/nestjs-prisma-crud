import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.sevice';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [ChatController],
  providers: [ChatService],
  imports: [PrismaModule],
  exports: [ChatService],
})
export class ChatModule {}