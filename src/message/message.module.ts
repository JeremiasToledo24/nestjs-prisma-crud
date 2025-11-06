import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.sevice';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [MessageController],
  providers: [MessageService],
  imports: [PrismaModule],
  exports: [MessageService],
})
export class MessageModule {}
