import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  OTP_PREFIX = 'otp_email';
  ATTEMPTS_KEY = 'login_attempts_';
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
  public async setOTPValue(user: string): Promise<string> {
    const value = (size: number): string =>
      [...Array(size)]
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join('');
    const otp_value = value(6).toUpperCase();
    this.cacheManager.del(`${this.OTP_PREFIX}_${user}`);
    this.cacheManager.set(`${this.OTP_PREFIX}_${user}`, otp_value);
    return otp_value;
  }

  public getOTPValue(key_suffix: string) {
    return this.cacheManager.get(`${this.OTP_PREFIX}_${key_suffix}`);
  }
  public deleteOTPValue(key_suffix: string) {
    return this.cacheManager.del(`${this.OTP_PREFIX}_${key_suffix}`);
  }

  public setData(key: string, data: unknown) {
    return this.cacheManager.set(key, data);
  }
  public getData(key: string) {
    return this.cacheManager.get(key);
  }
  public delData(key: string) {
    return this.cacheManager.del(key);
  }
}
