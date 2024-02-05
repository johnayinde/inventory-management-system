import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { encryption } from '@app/common';

@Injectable()
export class EmailService {
  transporter: any;
  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: configService.get('NODEMAILER_USER'),
        pass: configService.get('NODEMAILER_PASS'),
      },
    });
  }
  public async sendmail(to: string, subject: string, html: string) {
    const mailOptions = {
      from: this.configService.get('EMAIL_FROM'),
      to,
      subject,
      text: html,
    };
    this.transporter.sendMail(mailOptions, function (error: unknown, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  }
  public async sendOTP(otp: string, email: string) {
    const subject = 'Comfirm Email';
    const html = `To confirm your mail, please Enter the OTP displayed below:\n\n\n ${otp}`;
    return this.sendmail(email, subject, html);
  }

  public async sendResetPasswordToEmail(
    email: string,
    path: string = 'auth',
  ): Promise<{ salt: string; iv: string; encryptedText: string }> {
    const encrypted_data = encryption(email);

    const url = `${this.configService.get<string>(
      'FRONTEND_URL',
    )}/${path}/reset-password?token=${encrypted_data.encryptedText}`;
    const subject = 'Password Reset Link';
    const html = `To Reset Password continue with the link ${url}`;
    this.sendmail(email, subject, html);
    return encrypted_data;
  }
}
