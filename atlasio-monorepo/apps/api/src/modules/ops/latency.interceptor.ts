import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class LatencyInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startedAt = Date.now();
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();
    const requestId = req.requestId ?? 'n/a';
    const route = req.route?.path ?? req.url ?? 'unknown';
    const method = req.method ?? 'GET';

    return next.handle().pipe(
      tap({
        next: () => {
          this.metrics.record({
            requestId,
            route,
            method,
            statusCode: res.statusCode ?? 200,
            durationMs: Date.now() - startedAt,
          });
        },
        error: () => {
          this.metrics.record({
            requestId,
            route,
            method,
            statusCode: res.statusCode ?? 500,
            durationMs: Date.now() - startedAt,
          });
        },
      }),
    );
  }
}
