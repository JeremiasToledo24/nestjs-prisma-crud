// src/metrics/metrics.module.ts

import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService], // Exportamos por si quieres usarlo en otros módulos
})
export class MetricsModule {}