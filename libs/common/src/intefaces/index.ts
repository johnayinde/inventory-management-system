import { Request } from 'express';

export interface ReqInrf extends Request {
  user: {
    email: string;
    sub: number;
  };
}

export interface encryptData {
  salt: string;
  iv: string;
  encryptedText: string;
}
