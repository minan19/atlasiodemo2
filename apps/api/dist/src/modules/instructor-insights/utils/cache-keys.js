"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WINDOWS = void 0;
exports.classInsightsKey = classInsightsKey;
exports.studentInsightsKey = studentInsightsKey;
function classInsightsKey(classId, window) {
    return `insights:class:${classId}:${window}`;
}
function studentInsightsKey(classId, studentId, window) {
    return `insights:student:${classId}:${studentId}:${window}`;
}
exports.WINDOWS = ['7d', '30d', '90d'];
//# sourceMappingURL=cache-keys.js.map