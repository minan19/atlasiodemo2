"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_ROLES = exports.Roles = exports.ROLES_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.ROLES_KEY = 'roles';
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
exports.APP_ROLES = ['ADMIN', 'HEAD_INSTRUCTOR', 'INSTRUCTOR', 'STUDENT', 'GUARDIAN'];
//# sourceMappingURL=roles.js.map