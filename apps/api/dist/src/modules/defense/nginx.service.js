"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NginxService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NginxService = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = require("fs");
const path = require("path");
const asyncExec = (0, util_1.promisify)(child_process_1.exec);
let NginxService = NginxService_1 = class NginxService {
    constructor() {
        this.logger = new common_1.Logger(NginxService_1.name);
        this.denyPath = process.env.NGINX_DENY_PATH || '/etc/nginx/deny_autodefense.conf';
        this.dockerService = process.env.NGINX_DOCKER_SERVICE || 'infra-nginx-1';
        this.reloadEnabled = process.env.SECURITY_NGINX_RELOAD !== '0';
    }
    async addDeny(target) {
        await this.ensureFile();
        const existing = await fs.promises.readFile(this.denyPath, 'utf8');
        const line = `deny ${target};`;
        if (existing.split('\n').some((l) => l.trim() === line)) {
            this.logger.log(`Nginx deny already present: ${target}`);
        }
        else {
            await fs.promises.appendFile(this.denyPath, `${line}\n`, { encoding: 'utf8' });
            this.logger.warn(`Nginx deny added: ${target}`);
        }
        await this.reload();
    }
    async removeDeny(target) {
        try {
            await this.ensureFile();
            const content = await fs.promises.readFile(this.denyPath, 'utf8');
            const updated = content
                .split('\n')
                .filter((l) => l.trim() !== '' && l.trim() !== `deny ${target};`)
                .join('\n')
                .concat('\n');
            await fs.promises.writeFile(this.denyPath, updated, 'utf8');
            this.logger.log(`Nginx deny removed: ${target}`);
            await this.reload();
        }
        catch (err) {
            this.logger.error(`removeDeny failed: ${err instanceof Error ? err.message : err}`);
        }
    }
    async reload() {
        if (!this.reloadEnabled) {
            this.logger.log('Nginx reload skipped (SECURITY_NGINX_RELOAD=0)');
            return;
        }
        try {
            await asyncExec(`docker exec ${this.dockerService} nginx -s reload`);
            this.logger.log('Nginx reloaded');
        }
        catch (err) {
            this.logger.error(`Nginx reload failed: ${err instanceof Error ? err.message : err}`);
        }
    }
    async ensureFile() {
        const dir = path.dirname(this.denyPath);
        await fs.promises.mkdir(dir, { recursive: true });
        try {
            await fs.promises.access(this.denyPath);
        }
        catch {
            await fs.promises.writeFile(this.denyPath, '# managed by autodefense\n', 'utf8');
        }
    }
};
exports.NginxService = NginxService;
exports.NginxService = NginxService = NginxService_1 = __decorate([
    (0, common_1.Injectable)()
], NginxService);
//# sourceMappingURL=nginx.service.js.map