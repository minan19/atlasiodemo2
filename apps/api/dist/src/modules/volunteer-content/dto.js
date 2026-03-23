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
exports.ListVolunteerContentQuery = exports.CreateVolunteerFeedbackDto = exports.UpdateVolunteerContentStatusDto = exports.CreateVolunteerContentDto = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class CreateVolunteerContentDto {
}
exports.CreateVolunteerContentDto = CreateVolunteerContentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateVolunteerContentDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateVolunteerContentDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateVolunteerContentDto.prototype, "contentType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateVolunteerContentDto.prototype, "resourceUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateVolunteerContentDto.prototype, "courseId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateVolunteerContentDto.prototype, "isPublic", void 0);
class UpdateVolunteerContentStatusDto {
}
exports.UpdateVolunteerContentStatusDto = UpdateVolunteerContentStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.VolunteerContentStatus),
    __metadata("design:type", String)
], UpdateVolunteerContentStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateVolunteerContentStatusDto.prototype, "notes", void 0);
class CreateVolunteerFeedbackDto {
}
exports.CreateVolunteerFeedbackDto = CreateVolunteerFeedbackDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], CreateVolunteerFeedbackDto.prototype, "rating", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateVolunteerFeedbackDto.prototype, "comment", void 0);
class ListVolunteerContentQuery {
}
exports.ListVolunteerContentQuery = ListVolunteerContentQuery;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.VolunteerContentStatus),
    __metadata("design:type", String)
], ListVolunteerContentQuery.prototype, "status", void 0);
//# sourceMappingURL=dto.js.map