import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import * as nodemailer from 'nodemailer';
import { decryption, encryption } from '@app/common';
import * as SendGrid from '@sendgrid/mail';

@Injectable()
export class EmailService {
  transporter: any;
  constructor(private readonly configService: ConfigService) {
    SendGrid.setApiKey(this.configService.get<string>('SENDGRID_API_KEY'));

    // this.transporter = nodemailer.createTransport({
    //   service: 'gmail',
    //   auth: {
    //     user: configService.get('NODEMAILER_USER'),
    //     pass: configService.get('NODEMAILER_PASS'),
    //   },
    // });
  }

  async send(mail: SendGrid.MailDataRequired) {
    const transport = await SendGrid.send(mail);
    return transport;
  }

  public async sendmail(to: string, subject: string, html: string) {
    const mailOptions = {
      from: this.configService.get('EMAIL_FROM'),
      to,
      subject,
      html,
    };

    await this.send(mailOptions);
  }
  public async sendOTP(otp: string, email: string) {
    const subject = 'Comfirm Email';
    const html = `
    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #7c7835; text-align: center;">Confirm Your Email Address</h2>
        <p style="font-size: 16px;">Hi,</p>
        <p style="font-size: 16px;">
          Thank you for registering with us! To complete your registration, please enter the OTP below:
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #7c7835;">${otp}</span>
        </div>
        <p style="font-size: 16px;">If you didn't request this, please ignore this email.</p>
        <p style="font-size: 16px;">Best regards,<br/></p>
      </div>
    </div>
  `;
    return await this.sendmail(email, subject, html);
  }

  public async sendResetPasswordToEmail(
    email: string,
    data = {},
  ): Promise<{ salt: string; iv: string; encryptedText: string }> {
    const encrypted_data = encryption(data);
    const url = `${this.configService.get<string>(
      'FRONTEND_URL',
    )}/reset-password?token=${encrypted_data.encryptedText}`;
    const subject = 'Password Reset Link';
    const html = `
    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #7c7835; text-align: center;">Reset Your Password</h2>
        <p style="font-size: 16px;">Hi,</p>
        <p style="font-size: 16px;">
          We received a request to reset the password for your account. Click the link below to reset your password:
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${url}" style="font-size: 16px; color: #fff; background-color: #7c7835; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Reset Password</a>
        </div>
        <p style="font-size: 16px;">
          If you didn't request this, please ignore this email. This link will expire in 24 hours.
        </p>
        <p style="font-size: 16px;">Best regards,<br/></p>
      </div>
    </div>
  `;
    await this.sendmail(email, subject, html);
    return encrypted_data;
  }
}
