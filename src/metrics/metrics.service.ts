// src/metrics/metrics.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  collectDefaultMetrics,
  register,
  Counter, // <-- Importar Counter
  Histogram, // <-- Importar Histogram
} from 'prom-client';
@Injectable()
export class MetricsService implements OnModuleInit {

  // --- NUEVAS MÉTRICAS ---
  public requestCounter: Counter;
  public requestDuration: Histogram;
  // --- FIN NUEVAS MÉTRICAS ---


  onModuleInit() {
    // 1. Habilita las métricas por defecto
    collectDefaultMetrics();

    // 2. Registra las nuevas métricas personalizadas
    this.initCustomMetrics();
  }
  private initCustomMetrics() {
    // --- Define el Contador de Peticiones ---
    this.requestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      // 'labelNames' nos permite filtrar en Grafana
      labelNames: ['method', 'path', 'status_code'],
    });

    // --- Define el Histograma de Duración ---
    this.requestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'path', 'status_code'],
      // 'buckets' define los rangos de tiempo (en segundos) para medir
      buckets: [0.1, 0.5, 1, 1.5, 2, 5],
    });

    // Registra las nuevas métricas
    register.registerMetric(this.requestCounter);
    register.registerMetric(this.requestDuration);
  }

  async getMetrics() {
    return register.metrics();
  }

  getContentType() {
    return register.contentType;
  }
}