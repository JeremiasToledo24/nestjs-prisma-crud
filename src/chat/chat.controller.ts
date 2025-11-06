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
import { ChatService } from './chat.sevice';
import { Chat } from '@prisma/client';
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
      mkdirSync(UPLOAD_DIR, {
        recursive: true,
      });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    throw new BadRequestException('Formato de imagen no permitido');
  }
};
new BadRequestException('Formato de imagen no permitido');

type CreateChatRequest = {
  title: string;
  message?: string;
  lastMessageAt?: string | Date;
  last

  MessagePreview?: string;
};

@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

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

  @Get('/allChats')
  async getAllChats() {
    return this.chatService.getAllChats();
  }

  @Get('/randomChats')
  async randomChats() {
    try {
      return this.chatService.randomChats();
    } catch (error) {
      throw new BadRequestException('Chat does not exist');
    }
  }

  @Get(':id')
  async getChatById(@Param('id') id: string) {
    const chatFound = await this.chatService.getChatById(id);
    if (!chatFound) throw new BadRequestException('Chat does not exist');
    return chatFound;
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage,
      fileFilter: imageFileFilter,
    }),
  )
  async createChat(
    @Session() session: Record<string, any>,
    @Body() data: CreateChatRequest,
    @UploadedFile()

    image?: Express.Multer.File,
  ) {
    const trimmedMessage = data.message ? data.message.trim() : '';
    if (!trimmedMessage && !image) {
      throw new BadRequestException('Message or image is required');
    }
    if (!data.title || !data.title.trim()) {
      throw new BadRequestException('Title is required');
    }
    if (!session.userId) {
      session.userId = uuidv4();
    }
    const imagePath = image?.filename ? `uploads/${image.filename}` : undefined;
    const lastMessageAt =
      data.lastMessageAt instanceof Date
        ? data.lastMessageAt
        : data.lastMessageAt
          ? new Date(data.lastMessageAt)
          : undefined;
    const chat = await this.chatService.createChat(
      {
        title: data.title.trim(),
        message: trimmedMessage,
        lastMessageAt,
        lastMessagePreview: data.MessagePreview,
      },
      session.userId,
      imagePath,
    );
    return { chatId: chat.id };
  }

  @Put(':id')
  async updateChat(@Param('id') id: string, @Body() data:

    Chat) {
    try {
      return await this.chatService.updateChat(String(id), data);
    } catch (error) {
      throw new BadRequestException('Chat does not exist');
    }
  }

  @Delete(':id')
  async deleteChat(@Param('id') id: string) {
    try {
      return await this.chatService.deleteChat(id);
    } catch (error) {
      throw new BadRequestException('Chat does not exist');
    }
  }

  @Post('/allOldChats')
  async allOldChats() {
    try {
      return await this.chatService.deleteOldChats();
    } catch (error) {
      throw new BadRequestException('Chat does not exist');
    }
  }

}