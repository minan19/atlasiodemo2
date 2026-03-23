import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const asyncExec = promisify(exec);

@Injectable()
export class NginxService {
  private readonly logger = new Logger(NginxService.name);
  private readonly denyPath =
    process.env.NGINX_DENY_PATH || '/etc/nginx/deny_autodefense.conf';
  private readonly dockerService = process.env.NGINX_DOCKER_SERVICE || 'infra-nginx-1';
  private readonly reloadEnabled = process.env.SECURITY_NGINX_RELOAD !== '0';

  /**
   * Append an IP/CIDR to deny file.
   */
  async addDeny(target: string) {
    await this.ensureFile();
    const existing = await fs.promises.readFile(this.denyPath, 'utf8');
    const line = `deny ${target};`;
    if (existing.split('\n').some((l) => l.trim() === line)) {
      this.logger.log(`Nginx deny already present: ${target}`);
    } else {
      await fs.promises.appendFile(this.denyPath, `${line}\n`, { encoding: 'utf8' });
      this.logger.warn(`Nginx deny added: ${target}`);
    }
    await this.reload();
  }

  /**
   * Remove an IP/CIDR from deny file.
   */
  async removeDeny(target: string) {
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
    } catch (err) {
      this.logger.error(`removeDeny failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Reload nginx inside docker service.
   */
  private async reload() {
    if (!this.reloadEnabled) {
      this.logger.log('Nginx reload skipped (SECURITY_NGINX_RELOAD=0)');
      return;
    }
    try {
      await asyncExec(`docker exec ${this.dockerService} nginx -s reload`);
      this.logger.log('Nginx reloaded');
    } catch (err) {
      this.logger.error(`Nginx reload failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Ensure deny file and its directory exist.
   */
  private async ensureFile() {
    const dir = path.dirname(this.denyPath);
    await fs.promises.mkdir(dir, { recursive: true });
    try {
      await fs.promises.access(this.denyPath);
    } catch {
      await fs.promises.writeFile(this.denyPath, '# managed by autodefense\n', 'utf8');
    }
  }
}
