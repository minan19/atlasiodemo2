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
exports.ProctorEventDto = exports.ProctorEventType = exports.StartProctorSessionDto = void 0;
const class_validator_1 = require("class-validator");
class StartProctorSessionDto {
}
exports.StartProctorSessionDto = StartProctorSessionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StartProctorSessionDto.prototype, "courseId", void 0);
var ProctorEventType;
(function (ProctorEventType) {
    ProctorEventType["EYE"] = "EYE";
    ProctorEventType["HEAD"] = "HEAD";
    ProctorEventType["AUDIO"] = "AUDIO";
    ProctorEventType["TAB"] = "TAB";
    ProctorEventType["OBJECT"] = "OBJECT";
    ProctorEventType["HEARTBEAT"] = "HEARTBEAT";
})(ProctorEventType || (exports.ProctorEventType = ProctorEventType = {}));
class ProctorEventDto {
}
exports.ProctorEventDto = ProctorEventDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProctorEventDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ProctorEventType),
    __metadata("design:type", String)
], ProctorEventDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ProctorEventDto.prototype, "score", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ProctorEventDto.prototype, "value", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], ProctorEventDto.prototype, "flags", void 0);
//# sourceMappingURL=dto.js.map