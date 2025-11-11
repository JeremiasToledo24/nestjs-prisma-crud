import { Chat, Message } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

interface CreateChatInput {
  title: string;
  message?: string;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
}

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) { }

  async getAllChats(): Promise<Chat[]> {
    return this.prisma.chat.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
  }
  async getRecentChats(
    page: number,
    limit: number,
  ): Promise<{ items: Chat[]; total: number; currentPage: number; totalPages: number }> {
    const requestedPage = Math.max(page, 1);
    const take = Math.max(limit, 1);
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
    const whereClause = {
      lastMessageAt: {
        gt: twelveHoursAgo,
      },
    };
    const total = await this.prisma.chat.count({ where: whereClause });
    const totalPages = Math.max(Math.ceil(total / take), 1);
    const currentPage = Math.min(requestedPage, totalPages);
    const skip = (currentPage - 1) * take;
    const items = total
      ? await this.prisma.chat.findMany({
          where: whereClause,
          orderBy: [
            { lastMessageAt: 'desc' },
            { createdAt: 'desc' },
          ],
          skip,
          take,
        })
      : [];
    return { items, total, currentPage, totalPages };
  }
  /* async getRecentChats(
    page: number,
    limit: number,
  ): Promise<{ items: Chat[]; total: number }> {
    const sanitizedPage = Math.max(page, 1);
    const take = Math.max(limit, 1);
    const skip = (sanitizedPage - 1) * take;
    console.log('Skip:', skip, 'Sanitized Page:', sanitizedPage, 'Take:', take);

    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

    const whereClause = {
      lastMessageAt: {
        gt: twelveHoursAgo
      }
    };
    
    const [items, total] = await this.prisma.$transaction([
      this.prisma.chat.findMany({
        where: whereClause,
        orderBy: [
          { lastMessageAt: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take,
      }),
      this.prisma.chat.count({where: whereClause}),
    ]);
    return { items, total };


  } */

  async getChatWithMessages(
    id: string,
  ): Promise<(Chat & { messages: Message[] }) | null> {
    return this.prisma.chat.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getChatById(id: string): Promise<Chat> {
    return this.prisma.chat.findUnique({
      where: { id },
    });
  }

  async createChat(
    data: CreateChatInput,
    senderId: string,
    imagePath?: string,
  ): Promise<Chat> {
    const trimmedContent = data.message?.trim?.() ?? '';
    const previewBase =
      trimmedContent.length > 0 ? trimmedContent : imagePath ? 'Imagen' : '';
    return this.prisma.chat.create({
      data: {
        title: data.title,
        message: trimmedContent,
        senderId,
        lastMessageAt: data.lastMessageAt ?? new Date(),
        lastMessagePreview: data.lastMessagePreview ?? (previewBase || null),
        messages: {
          create: {
            content: trimmedContent || (imagePath ? 'Imagen adjunta' : ''),
            senderId,
            imagePath: imagePath ?? null,
          },
        },
      },
    });
  }

  async updateChat(id: string, data: Chat): Promise<Chat> {
    return this.prisma.chat.update({
      where: { id },
      data,
    });
  }

  async deleteChat(id: string): Promise<Chat> {
    return this.prisma.chat.delete({
      where: { id },
    });
  }

  async deleteOldChats(): Promise<{ count: number }> {

    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

    return this.prisma.chat.deleteMany({
      where: {
        lastMessageAt: {
          lt: twelveHoursAgo
        }
      }
    });
  }

  async randomChats(): Promise<Chat[]> {

    const allChats = await this.prisma.chat.findMany({
      select: { id: true },
      take: 10,
    });

    function getRandomElements(arr, n) {
      const shuffled = arr.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, n);
    }

    const randomIds = getRandomElements(allChats.map(c => c.id), 3);

    const chats = await this.prisma.chat.findMany({
      where: { id: { in: randomIds } },
      orderBy: { lastMessageAt: 'asc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        }
      }
    });

    return chats
  }

  /* AGREGADO COMENTARIO */
}