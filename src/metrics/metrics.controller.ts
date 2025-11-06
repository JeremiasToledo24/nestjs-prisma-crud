// src/metrics/metrics.controller.ts

import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';

// Por defecto, se servirá en la raíz del servidor.
// Si tienes un prefijo global (como /api), se servirá en /api/metrics
@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  async getMetrics(@Res() res: Response) {
    // 1. Establece el header de Content-Type
    res.set('Content-Type', this.metricsService.getContentType());

    // 2. Devuelve las métricas
    res.end(await this.metricsService.getMetrics());
  }
}