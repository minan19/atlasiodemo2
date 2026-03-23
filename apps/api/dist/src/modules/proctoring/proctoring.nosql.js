"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ProctoringNoSqlWriter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProctoringNoSqlWriter = void 0;
const common_1 = require("@nestjs/common");
const mongodb_1 = require("mongodb");
let ProctoringNoSqlWriter = ProctoringNoSqlWriter_1 = class ProctoringNoSqlWriter {
    constructor() {
        this.logger = new common_1.Logger(ProctoringNoSqlWriter_1.name);
    }
    async init() {
        if (this.client)
            return;
        const uri = process.env.MONGO_URL;
        if (!uri) {
            this.logger.warn('MONGO_URL not set; ai_logs will be skipped');
            return;
        }
        this.client = new mongodb_1.MongoClient(uri);
        await this.client.connect();
    }
    async writeLog(log) {
        try {
            if (!this.client) {
                await this.init();
            }
            if (!this.client)
                return;
            const dbName = process.env.MONGO_DB ?? 'atlasio';
            const coll = this.client.db(dbName).collection('ai_logs');
            await coll.insertOne(log);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`ai_logs write skipped: ${msg}`);
        }
        return;
    }
};
exports.ProctoringNoSqlWriter = ProctoringNoSqlWriter;
exports.ProctoringNoSqlWriter = ProctoringNoSqlWriter = ProctoringNoSqlWriter_1 = __decorate([
    (0, common_1.Injectable)()
], ProctoringNoSqlWriter);
//# sourceMappingURL=proctoring.nosql.js.map