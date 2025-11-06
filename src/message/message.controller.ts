import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { MessageService } from './message.sevice';
import { Message } from '@prisma/client';
import { Session } from '../session.decorator';
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor } from '@nestjs/platform-express';
  import { diskStorage, FileFilterCallback } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Request } from 'express';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

const storage = diskStorage({
  destination: (req, file, cb) => {
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

const imageFileFilter = (req: Request, file: any, cb

: FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Formato de imagen no permitido'));
  }
};

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('session-id')
  getSessionId(@Session() session: Record<string, any>) {
    if (!session.userId) {
      session.userId = uuidv4();
    }
    return { sessionId: session.userId };
  }

  @Post('logout')
  logout(@Session() session: Record<string, any>) {
    session.destroy();
    return { message: 'Sesión cerrada' };
  }

  @Get()
  async getAllMessages() {
    return this.messageService.getAllMessages();
  }

  @Get(':id')
  async getMessageById(@Param('id') id: string) {
    const messageFound = await this.messageService.getMessageById(id);
    if (!messageFound) throw new BadRequestException('Message does not exist');
    return

 messageFound;
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage,
      fileFilter: imageFileFilter,
    }),
  )
  async createMessage(
    @Session() session: Record<string, any>,
    @Body()
    data: {
      chatId: string;
      content?: string;
    },
    @UploadedFile() image?: any,) {
    if (!data.chatId || !data.chatId.trim()) {
      throw new BadRequestException('chatId is required');
    }
    const trimmedContent = data.content ? data.content.trim() : '';
    if (!trimmedContent && !image) {
      throw new BadRequestException('Content or image is required');
    }
    if (!session.userId) {
      session.userId = uuidv4();
    }
    //console.log(image)
    const imagePath = image?.filename ? `uploads/${image.filename}` : undefined;
    
    return this.messageService.createMessage(
      data.chatId.trim(),
      trimmedContent,
      session.userId,
      imagePath,
    );
  }

  @Put(':id')
  async updateMessage(@Param('id') id: string, @Body() data: Message) {
    try {
      return await this.messageService.updateMessage(id, data);
    } catch (error) {
      throw new BadRequestException('Message does not exist');
    }
  }

  @Delete(':id')
  async deleteMessage(@Param('id') id: string) {
    try {
      return await this.messageService.deleteMessage(id);
    } catch (error) {
      throw new BadRequestException('Message does not exist');
    }
  }
}