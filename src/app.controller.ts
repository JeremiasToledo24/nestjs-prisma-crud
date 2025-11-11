import {
    BadRequestException,
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Query,
    Render,
    Res,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { ChatService } from './chat/chat.sevice';
import { MessageService } from './message/message.sevice';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, FileFilterCallback } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { Request, Response } from 'express';
import { Session } from './session.decorator';
import { v4 as uuidv4 } from 'uuid';
import { Chat, Message } from '@prisma/client';

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

@Controller()
export class AppController {
    private readonly pageSize = 6;

    constructor(
        private readonly chatService: ChatService,
        private readonly messageService: MessageService,
    ) { }

    @Get()
    @Render('home')
        async home(@Query('page') page = '1') {
        const pageSize = this.pageSize;
        const requestedPage = Math.max(parseInt(page, 10) || 1, 1);
        const {
            items,
            total,
            currentPage,
            totalPages,
        } = await this.chatService.getRecentChats(requestedPage, pageSize);
        const chats = items.map((chat) => {
            const lastActivity = chat.lastMessageAt ?? chat.createdAt;
            const previewBase =
                (chat.lastMessagePreview ?? chat.message ?? '').trim() || 'Sin mensajes';
            const preview =
                previewBase.length > 120 ? `${previewBase.slice(0, 117)}...` : previewBase;
            return {
                id: chat.id,
                title: chat.title,
                lastActivityLabel: this.formatDate(lastActivity),
                messagePreview: preview,
                link: `/chat/ui/chats/${chat.id}`,
            };
        });
        return {
            pageTitle: 'Chats activos',
            createChatUrl: '/chat/ui/chats/new',
            chats,
            pagination: {
                currentPage,
                totalPages,
                hasPrev: currentPage > 1,
                hasNext: currentPage < totalPages,
                prevPage: currentPage > 1 ? currentPage - 1 : 1,
                nextPage: currentPage < totalPages ? currentPage + 1 : currentPage,
            },
        };
    }

    @Get('/ui/chats/new')
    @Render('chats/new')
    newChat() {
        return {
            pageTitle: 'Nuevo chat',
            errors: [],
            form: {
                title: '',
                message: '',
            },
        };
    }

    @Post('ui/chats/new')
    @UseInterceptors(
        FileInterceptor('image', {
            storage,
            fileFilter: imageFileFilter,
        }),
    )
    async createChatHtml(
        @Session() session: Record<string, any>,
        @Body('title') title: string,
        @Body('message') message: string,
        @UploadedFile() image: Express.Multer.File,
        @Res() res: Response,
    ) {
        const trimmedTitle = (title ?? '').trim();
        const trimmedMessage = (message ?? '').trim();
        const errors: string[] = [];
        if (!trimmedTitle) {
            errors.push('El título es obligatorio.');
        }
        if (!trimmedMessage && !image) {
            errors.push('Debes ingresar un mensaje inicial o adjuntar una imagen.');
        }
        if (errors.length > 0) {
            return res.status(400).render('chats/new', {
                pageTitle: 'Nuevo chat',
                errors,
                form: {
                    title: title ?? '',
                    message: message ?? '',
                },
            });
        }
        const userId = this.ensureSessionUser(session);
        const imagePath = image?.filename ? `uploads/${image.filename}` : undefined;
        try {
            const chat = await this.chatService.createChat(
                {
                    title: trimmedTitle,
                    message: trimmedMessage,
                },
                userId,
                imagePath,
            );
            return res.redirect(`/chat/ui/chats/${chat.id}`);
        } catch (error) {
            return res.status(500).render('chats/new', {
                pageTitle: 'Nuevo chat',
                errors: ['No se pudo crear el chat. Intenta nuevamente.'],
                form: {
                    title: title ?? '',


                    message: message ?? '',
                },
            });
        }
    }

    @Get('/ui/chats/:id')
    @Render('chats/detail')
    async viewChat(
        @Param('id') id: string,
        @Session() session: Record<string, any>,
    ) {
        const userId = this.ensureSessionUser(session);
        const chat = await this.chatService.getChatWithMessages(id);
        if (!chat) {
            throw new NotFoundException('Chat no encontrado');
        }
        return this.buildChatViewModel(chat, userId);
    }

    @Get('/ui/chats/chat/:id')
    async getChatWithMessages(
        @Param('id') id: string,
        @Session() session: Record<string, any>,
    ) {
        const userId = this.ensureSessionUser(session);
        const chat = await this.chatService.getChatWithMessages(id);
        if (!chat) {
            throw new NotFoundException('Chat no encontrado');
        }
        return chat;
    }

    @Post('/ui/chats/:id/messages')
    @UseInterceptors(
        FileInterceptor('image', {
            storage,
            fileFilter: imageFileFilter,
        }),
    )
    async addMessage(
        @Param('id') id: string,
        @Session() session: Record<string, any>,
        @Body('content') message: string,
        @UploadedFile() image: Express.Multer.File,
        @Res() res: Response,
    ) {
        const userId = this.ensureSessionUser(session);
        const trimmedMessage = (message ?? '').trim();
        if (!trimmedMessage && !image) {
            throw new BadRequestException(
                'Debes ingresar un mensaje o adjuntar una imagen.',
            );
        }
        const imagePath = image?.filename ? `uploads/${image.filename}` : undefined;
        await this.messageService.createMessage(
            id,
            trimmedMessage,
            userId,
            imagePath,
        );
        return res.redirect(`/chat/ui/chats/${id}`);
    }

    private ensureSessionUser(session: Record<string, any>): string {
        //console.log('Ensuring session user userId:', session);
        if (!session || !session.userId) {
            if (!session) {
                throw new Error('Session is not available');
            }
            session.userId = uuidv4();
        }
        //console.log('Ensuring session user userId:', session);

        return session.userId;
    }

    private buildChatViewModel(chat: Chat & { messages: Message[] }, userId: string) {
        const userColorMap = new Map<string, number>();

        const getUserColor = (senderId: string): number => {
            if (!userColorMap.has(senderId)) {
                let hash = 0;
                for (let i = 0; i < senderId.length; i++) {
                    hash = ((hash << 5) - hash) + senderId.charCodeAt(i);
                    hash = hash & hash;
                }
                userColorMap.set(senderId, (Math.abs(hash) % 6) + 1);
            }
            return userColorMap.get(senderId);
        };

        const messages = chat.messages.map((msg) => ({
            ...msg,
            isOwn: msg.senderId === userId,
            createdAtLabel: this.formatDate(msg.createdAt),
            image: msg.imagePath ? `/${msg.imagePath}` : undefined,
            userColorIndex: getUserColor(msg.senderId),
        }));
        return {
            pageTitle: chat.title,
            chat,
            messages,
            errors: [],
            form: {},
        };
    }

    private formatDate(date: Date): string {
        if (!date) {
            return '';
        }
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 1) {
            return `${days}d`;
        }
        if (hours > 1) {
            return `${hours}h`;
        }
        if (minutes > 1) {
            return `${minutes}m`;
        }
        return 'Ahora';
    }
}