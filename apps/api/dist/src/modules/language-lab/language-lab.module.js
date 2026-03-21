"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageLabModule = void 0;
const common_1 = require("@nestjs/common");
const language_lab_service_1 = require("./language-lab.service");
const language_lab_controller_1 = require("./language-lab.controller");
const prisma_service_1 = require("../prisma/prisma.service");
const translation_service_1 = require("./translation.service");
let LanguageLabModule = class LanguageLabModule {
};
exports.LanguageLabModule = LanguageLabModule;
exports.LanguageLabModule = LanguageLabModule = __decorate([
    (0, common_1.Module)({
        providers: [language_lab_service_1.LanguageLabService, translation_service_1.TranslationService, prisma_service_1.PrismaService],
        controllers: [language_lab_controller_1.LanguageLabController],
        exports: [translation_service_1.TranslationService],
    })
], LanguageLabModule);
//# sourceMappingURL=language-lab.module.js.map