// src/cron/cron.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CronService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.setupCronJobs();
  }

  private async setupCronJobs() {
    // Ejemplo: Programar trabajos cron al iniciar la aplicación
    try {
      // Limpiar sesiones expiradas cada hora
      await this.prisma.$executeRaw`
        SELECT cron.schedule(
            'delete-old-records-every-5-min',
            '*/5 * * * *', 
            'DELETE FROM Chat WHERE lastMessageAt < NOW() - INTERVAL ''1 hour'''
        );`;

      console.log('Cron jobs configurados correctamente');
    } catch (error) {
      console.error('Error configurando cron jobs:', error);
    }
  }
}