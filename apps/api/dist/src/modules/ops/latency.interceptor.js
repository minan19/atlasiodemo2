"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LatencyInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const metrics_service_1 = require("./metrics.service");
let LatencyInterceptor = class LatencyInterceptor {
    constructor(metrics) {
        this.metrics = metrics;
    }
    intercept(context, next) {
        const startedAt = Date.now();
        const http = context.switchToHttp();
        const req = http.getRequest();
        const res = http.getResponse();
        const requestId = req.requestId ?? 'n/a';
        const route = req.route?.path ?? req.url ?? 'unknown';
        const method = req.method ?? 'GET';
        return next.handle().pipe((0, operators_1.tap)({
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
        }));
    }
};
exports.LatencyInterceptor = LatencyInterceptor;
exports.LatencyInterceptor = LatencyInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [metrics_service_1.MetricsService])
], LatencyInterceptor);
//# sourceMappingURL=latency.interceptor.js.map