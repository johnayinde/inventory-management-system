export const html_reset = (first_name, url) => `
    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #7c7835; text-align: center;">Reset Your Password</h2>
        <p style="font-size: 16px;">Hi, ${first_name || ''}</p>
        <p style="font-size: 16px;">
          We received a request to reset the password for your account. Click the link below to reset your password:
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${url}?reset=true" style="font-size: 16px; color: #fff; background-color: #7c7835; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Reset Password</a>
        </div>
        <p style="font-size: 16px;">
          If you didn't request this, please ignore this email. This link will expire in 24 hours.
        </p>
        <p style="font-size: 16px;">Best regards,<br/></p>
      </div>
    </div>
  `;

export const html_invite = (first_name, url) => `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #7c7835; text-align: center;">
            Invitation to Join Invio
          </h2>
          <p style="font-size: 16px;">Dear ${first_name || ''},</p>
          <p style="font-size: 16px;">
            You have been invited to join <strong>Invio</strong>, our inventory
            management system, as part of our team.
          </p>
          <p style="font-size: 16px;">
            As a valued member, you'll have access to the tools and resources
            you need to efficiently manage our inventory and contribute to our
            shared success.
          </p>
          <div style="text-align: center; margin: 20px 0;">
            <a
              href="${url}?reset=false"
              style="font-size: 16px; color: #fff; background-color: #7c7835; padding: 10px 20px; border-radius: 5px; text-decoration: none;"
            >
              Join Invio Now
            </a>
          </div>
          <p style="font-size: 16px;">
            If you have any questions or need assistance, feel free to reach
            out.
          </p>
          <p style="font-size: 16px;">Welcome aboard!</p>
          <p style="font-size: 16px;">
            Best regards,
          </p>
        </div>
      </div>
`;

export const html_otp = (otp) => `
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
