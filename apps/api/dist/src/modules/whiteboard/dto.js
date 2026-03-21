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
exports.WhiteboardActionDto = exports.WhiteboardActionType = exports.DeleteLayerDto = exports.CreateLayerDto = exports.StartWhiteboardDto = void 0;
const class_validator_1 = require("class-validator");
class StartWhiteboardDto {
}
exports.StartWhiteboardDto = StartWhiteboardDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StartWhiteboardDto.prototype, "liveSessionId", void 0);
class CreateLayerDto {
}
exports.CreateLayerDto = CreateLayerDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLayerDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLayerDto.prototype, "name", void 0);
class DeleteLayerDto {
}
exports.DeleteLayerDto = DeleteLayerDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DeleteLayerDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DeleteLayerDto.prototype, "name", void 0);
var WhiteboardActionType;
(function (WhiteboardActionType) {
    WhiteboardActionType["DRAW"] = "DRAW";
    WhiteboardActionType["ERASE"] = "ERASE";
    WhiteboardActionType["CLEAR"] = "CLEAR";
    WhiteboardActionType["UNDO"] = "UNDO";
    WhiteboardActionType["REDO"] = "REDO";
    WhiteboardActionType["SHAPE"] = "SHAPE";
    WhiteboardActionType["TEXT"] = "TEXT";
    WhiteboardActionType["IMAGE"] = "IMAGE";
    WhiteboardActionType["GRID"] = "GRID";
    WhiteboardActionType["GRANT"] = "GRANT";
    WhiteboardActionType["REVOKE"] = "REVOKE";
})(WhiteboardActionType || (exports.WhiteboardActionType = WhiteboardActionType = {}));
class WhiteboardActionDto {
}
exports.WhiteboardActionDto = WhiteboardActionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhiteboardActionDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(WhiteboardActionType),
    __metadata("design:type", String)
], WhiteboardActionDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhiteboardActionDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], WhiteboardActionDto.prototype, "payload", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhiteboardActionDto.prototype, "requestId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhiteboardActionDto.prototype, "targetActionId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WhiteboardActionDto.prototype, "layerId", void 0);
//# sourceMappingURL=dto.js.map