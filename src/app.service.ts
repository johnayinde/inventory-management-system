import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppService {
  private logDir = path.join(process.cwd(), 'logs');

  getHello(tenant_id: number, user_id: number) {
    return `Hello World! tenant_id: ${tenant_id} user_id: ${user_id}`;
  }

  private getMostRecentErrorLogFile(): string | null {
    const files = fs.readdirSync(this.logDir);
    const errorLogFiles = files.filter(
      (file) => file.startsWith('error.') && file.endsWith('.log'),
    );

    if (errorLogFiles.length === 0) {
      return null;
    }

    return path.join(this.logDir, errorLogFiles[0]);
  }

  async getErrorLogs() {
    const errorLogFile = this.getMostRecentErrorLogFile();

    if (!errorLogFile) {
      return 'No error logs found';
    }

    const data = fs.readFileSync(errorLogFile, 'utf8');

    const logEntries = data
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));

    return logEntries;
  }
}
