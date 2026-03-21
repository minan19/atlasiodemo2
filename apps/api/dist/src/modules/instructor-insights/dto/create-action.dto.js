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
exports.CreateInstructorActionDto = void 0;
const class_validator_1 = require("class-validator");
class CreateInstructorActionDto {
}
exports.CreateInstructorActionDto = CreateInstructorActionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateInstructorActionDto.prototype, "classId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['class', 'student']),
    __metadata("design:type", String)
], CreateInstructorActionDto.prototype, "targetType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInstructorActionDto.prototype, "targetUserId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['assignPractice', 'assignQuiz', 'shareMaterial', 'message']),
    __metadata("design:type", String)
], CreateInstructorActionDto.prototype, "actionType", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateInstructorActionDto.prototype, "payload", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInstructorActionDto.prototype, "dueAt", void 0);
//# sourceMappingURL=create-action.dto.js.map