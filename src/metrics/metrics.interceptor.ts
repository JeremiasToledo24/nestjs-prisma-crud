// src/metrics/metrics.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { MetricsService } from './metrics.service';
import { Request, Response } from 'express';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<Request>();
    const res = httpContext.getResponse<Response>();

    // Obtener la ruta de la plantilla (ej. /users/:id) en lugar de la ruta completa (ej. /users/123)
    const path = req.route?.path || req.path;
    
    // Ignorar el propio endpoint de métricas para no crear un bucle
    if (path === '/metrics') {
      return next.handle();
    }

    const method = req.method;

    // 1. Iniciar el temporizador del histograma
    const endTimer = this.metricsService.requestDuration.startTimer({
      method,
      path,
    });

    return next.handle().pipe(
      // 'tap' se usa para observar el valor emitido (como el status code)
      tap(() => {
        const statusCode = res.statusCode.toString();
        
        // 2. Incrementar el contador
        this.metricsService.requestCounter.inc({
          method,
          path,
          status_code: statusCode,
        });
      }),
      // 'finalize' se ejecuta siempre, haya éxito o error
      finalize(() => {
        const statusCode = res.statusCode.toString();

        // 3. Detener el temporizador y registrar la duración
        // Pasamos el status_code aquí para que el timer sepa todas sus etiquetas
        endTimer({ status_code: statusCode });
      }),
    );
  }
}