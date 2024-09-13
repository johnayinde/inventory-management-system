import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import * as nodemailer from 'nodemailer';
import { decryption, encryption } from '@app/common';
import * as SendGrid from '@sendgrid/mail';
import { html_invite, html_otp, html_reset } from './templates';

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
      from: { name: 'Invio', email: this.configService.get('EMAIL_FROM') },
      to,
      subject,
      html,
    };

    await this.send(mailOptions);
  }
  public async sendOTP(otp: string, email: string) {
    const subject = 'Comfirm Email';
    return await this.sendmail(email, subject, html_otp(otp));
  }

  public async sendResetPasswordToEmail(
    email: string,
    data,
  ): Promise<{ salt: string; iv: string; encryptedText: string }> {
    const { first_name } = data.data;
    const encrypted_data = encryption(data);
    const url = `${this.configService.get<string>(
      'FRONTEND_URL',
    )}/reset-password?token=${encrypted_data.encryptedText}`;
    const subject = data.is_user_flag
      ? 'Invitation to Join Invio'
      : 'Password Reset Link';

    await this.sendmail(
      email,
      subject,
      data.is_user_flag
        ? html_invite(first_name, url)
        : html_reset(first_name, url),
    );
    return encrypted_data;
  }
}
