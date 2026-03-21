"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IyzicoService = void 0;
const common_1 = require("@nestjs/common");
const iyzico_sdk_1 = require("./iyzico.sdk");
let IyzicoService = class IyzicoService {
    async createCheckout(dto, amount, user) {
        if (!process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET) {
            throw new common_1.BadRequestException('Iyzico API bilgileri tanımlı değil');
        }
        return (0, iyzico_sdk_1.iyzicoCreateCheckout)(dto, amount, user);
    }
};
exports.IyzicoService = IyzicoService;
exports.IyzicoService = IyzicoService = __decorate([
    (0, common_1.Injectable)()
], IyzicoService);
//# sourceMappingURL=iyzico.service.js.map