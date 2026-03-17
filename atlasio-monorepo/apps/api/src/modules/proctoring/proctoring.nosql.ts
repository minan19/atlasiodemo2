import { Injectable, Logger } from '@nestjs/common';
import { MongoClient } from 'mongodb';

export type ProctorEventLog = {
  sessionId: string;
  ts: string;
  eventType: string;
  confidence?: number;
  flags?: string[];
  value?: number;
};

@Injectable()
export class ProctoringNoSqlWriter {
  private client?: MongoClient;
  private readonly logger = new Logger(ProctoringNoSqlWriter.name);

  async init() {
    if (this.client) return;
    const uri = process.env.MONGO_URL;
    if (!uri) {
      this.logger.warn('MONGO_URL not set; ai_logs will be skipped');
      return;
    }
    this.client = new MongoClient(uri);
    await this.client.connect();
  }

  async writeLog(log: ProctorEventLog) {
    try {
      if (!this.client) {
        await this.init();
      }
      if (!this.client) return; // still not ready
      const dbName = process.env.MONGO_DB ?? 'atlasio';
      const coll = this.client.db(dbName).collection<ProctorEventLog>('ai_logs');
      await coll.insertOne(log);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`ai_logs write skipped: ${msg}`);
    }
    return;
  }
}
