export interface encryptData {
  salt: string;
  iv: string;
  encryptedText: string;
}
export interface ReqUser {
  email: string;
  userId: number;
  isUser: boolean;
}
