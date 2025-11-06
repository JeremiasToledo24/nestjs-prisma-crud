import { Message } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async getAllMessages(): Promise<Message[]> {
    return this.prisma.message.findMany();
  }

  async getMessageById(id: string): Promise<Message> {
    return this.prisma.message.findUnique({
      where: { id },
    });
  }

  async createMessage(
    chatId: string,
    content: string,


    senderId: string,
    imagePath?: string,
  ): Promise<Message> {
    const trimmedContent = content?.trim?.() ?? '';
    const previewBase = trimmedContent.length > 0 ? trimmedContent : imagePath ? 'Imagen' : '';
    const [createdMessage] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          chatId,
          content: trimmedContent,
          senderId,
          imagePath: imagePath ?? null,
        },
      }),
      this.prisma.chat.update({
        where: { id: chatId },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: previewBase || null,
        },
      }),
    ]);
    return createdMessage;
  }

  async updateMessage(id: string, data: Message): Promise<Message> {
    return this.prisma.message.update({
      where: { id },
      data,
    });
  }

  async deleteMessage(id: string): Promise<Message> {
    return this.prisma.message.delete({
      where: { id },
    });
  }
}