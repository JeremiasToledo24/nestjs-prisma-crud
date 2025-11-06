// src/metrics/metrics.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { collectDefaultMetrics, register } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  onModuleInit() {
    // 1. Habilita las métricas por defecto
    // Esto incluirá uso de CPU, memoria, lag del event loop, etc.
    collectDefaultMetrics();
  }

  /**
   * Obtiene todas las métricas registradas en el formato de texto
   * plano que Prometheus espera.
   */
  async getMetrics() {
    return register.metrics();
  }

  /**
   * Obtiene el Content-Type que se debe usar en la respuesta
   * para el endpoint de métricas.
   */
  getContentType() {
    return register.contentType;
  }
}