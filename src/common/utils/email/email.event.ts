import { EventEmitter } from 'node:events';
import Mail from 'nodemailer/lib/mailer';
import { sendEmail } from '../email/send.email';
import { verifyEmail } from '../email/verify.email.template';
import { OtpEnum } from 'src/common/enums';

interface IEmail extends Mail.Options {
  otp: string;
}

export const emailEvent = new EventEmitter();

emailEvent.on(OtpEnum.ConfirmEmail, async (data: IEmail) => {
  try {
    data.subject = OtpEnum.ConfirmEmail;
    data.html = verifyEmail(data.otp, data.subject);
    await sendEmail(data);
  } catch (error) {
    console.log(`Failed to send email `, error);
  }
});

emailEvent.on(OtpEnum.ResetPassword, async (data: IEmail) => {
  try {
    data.subject = OtpEnum.ResetPassword;
    data.html = verifyEmail(data.otp, data.subject);
    await sendEmail(data);
  } catch (error) {
    console.log(`Fail to send email `, error);
  }
});
