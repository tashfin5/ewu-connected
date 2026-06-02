import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function test() {
  console.log("Attempting to send email using:", process.env.EMAIL_USER);
  try {
    let info = await transporter.sendMail({
      from: '"Test" <noreply@test.com>',
      to: process.env.EMAIL_USER, // send to self
      subject: 'Test Email',
      text: 'This is a test'
    });
    console.log("Email sent successfully!", info.messageId);
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

test();
