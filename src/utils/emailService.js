const nodemailer = require('nodemailer');
const { logger } = require('./logger');

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Send email
exports.sendEmail = async ({ to, subject, html, text }) => {
    try {
        const mailOptions = {
            from: `"AP Services" <${process.env.EMAIL_FROM}>`,
            to,
            subject,
            html,
            text
        };

        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email sent: ${info.messageId}`);
        return info;

    } catch (error) {
        logger.error('Email sending error:', error);
        throw error;
    }
};

// Send welcome email
exports.sendWelcomeEmail = async (user) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .button { 
                    display: inline-block; 
                    padding: 10px 20px; 
                    background: #2563eb; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 5px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to AP Services!</h1>
                </div>
                <div class="content">
                    <h2>Hello ${user.firstName}!</h2>
                    <p>Thank you for joining AP Services. We're excited to have you on board!</p>
                    <p>With AP Services, you can:</p>
                    <ul>
                        <li>Book trusted professionals for home services</li>
                        <li>Track your bookings in real-time</li>
                        <li>Chat with professionals directly</li>
                        <li>Pay securely online</li>
                    </ul>
                    <p>
                        <a href="${process.env.FRONTEND_URL}/services" class="button">
                            Browse Services
                        </a>
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;

    return await exports.sendEmail({
        to: user.email,
        subject: 'Welcome to AP Services!',
        html
    });
};
