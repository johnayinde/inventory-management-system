import { ProductStatusType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { HttpException, HttpStatus } from '@nestjs/common';

export function calculateChangeInPercentage(current: number, previous: number) {
  if (!previous || !current) return 0;
  return ((current - previous) / previous) * 100;
}

export function determineProductStatus(
  remainingQuantity: number,
  threshold: number,
) {
  if (remainingQuantity === 0) {
    return ProductStatusType.sold_out;
  } else if (remainingQuantity > threshold) {
    return ProductStatusType.in_stock;
  } else if (remainingQuantity <= threshold) {
    return ProductStatusType.running_low;
  }
}

export function calculate_date_range(no_of_days) {
  const end_date = Date.now();
  const start_date = new Date(end_date - no_of_days * 24 * 60 * 60 * 1000);
  return { start: start_date, end: new Date(end_date) };
}

export function generatePassword(minLength = 8, maxLength = 20) {
  const length =
    Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';

  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);

  const hashedPassword = await bcrypt.hash(password, salt);

  return hashedPassword;
}

export async function compareHashedPasswords(
  prev_password: string,
  new_password: string,
) {
  return await bcrypt.compare(prev_password, new_password);
}

export async function comparePasswordString(pwd: string, cPwd: string) {
  const isMatch = pwd == cPwd;
  if (!isMatch) {
    throw new HttpException('Password does not match', HttpStatus.BAD_GATEWAY);
  }
  return isMatch;
}
