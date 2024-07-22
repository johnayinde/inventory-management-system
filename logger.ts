import { ConsoleLogger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export class CustomLogger extends ConsoleLogger {
  private logDirectory = path.join(__dirname, '..', '.logs');
  private logFile = path.join(this.logDirectory, 'logs.txt');

  constructor(context: string) {
    super(context);
    this.ensureLogDirectoryExists();
  }

  private ensureLogDirectoryExists() {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  private writeToFile(message: string) {
    fs.appendFileSync(this.logFile, message + '\n');
  }

  log(message: string) {
    super.log(message);
    this.writeToFile(message);
  }

  error(message: string, trace: string) {
    super.error(message, trace);
    this.writeToFile(`${message} - ${trace}`);
  }

  warn(message: string) {
    super.warn(message);
    this.writeToFile(message);
  }

  debug(message: string) {
    super.debug(message);
    this.writeToFile(message);
  }

  verbose(message: string) {
    super.verbose(message);
    this.writeToFile(message);
  }
}
