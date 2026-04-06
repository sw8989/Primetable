import { MailService } from '@sendgrid/mail';
import { Restaurant } from '@shared/schema';
import openaiService from './openaiService';

// Check if the API key is available
if (!process.env.SENDGRID_API_KEY) {
  console.warn("WARNING: SENDGRID_API_KEY environment variable is not set. Email notifications will not work.");
}

// Initialize the SendGrid mail service
const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

// Sender email address
const FROM_EMAIL = 'bookings@primetable.example.com';

// Email templates - in a production app, these would be more sophisticated
const EMAIL_TEMPLATES = {
  BOOKING_CONFIRMATION: {
    subject: 'Your Reservation at {{restaurantName}} is Confirmed',
  },
  BOOKING_REMINDER: {
    subject: 'Reminder: Your Upcoming Reservation at {{restaurantName}}',
  },
  BOOKING_SECURED: {
    subject: 'Success! We Secured Your Table at {{restaurantName}}',
  },
  BOOKING_UPDATE: {
    subject: 'Update on Your Reservation Request for {{restaurantName}}',
  },
  BOOKING_CANCELLATION: {
    subject: 'Your Reservation at {{restaurantName}} Has Been Cancelled',
  }
};

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Replace template placeholders with actual values
 */
function replaceTemplatePlaceholders(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

/**
 * Send an email using SendGrid
 */
async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn("Email not sent: SENDGRID_API_KEY is not set");
      return false;
    }

    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || '',
      html: params.html || params.text || '',
    });
    
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Send a booking confirmation email
 */
export async function sendBookingConfirmation(
  userEmail: string,
  restaurant: Restaurant,
  date: Date,
  time: string,
  partySize: number
): Promise<boolean> {
  try {
    // Generate a personalized message using AI
    const emailContent = await openaiService.generateBookingMessage(
      restaurant.name,
      restaurant.cuisine,
      date,
      time,
      partySize,
      true // Confirmation
    );

    const subject = replaceTemplatePlaceholders(
      EMAIL_TEMPLATES.BOOKING_CONFIRMATION.subject,
      { restaurantName: restaurant.name }
    );

    return await sendEmail({
      to: userEmail,
      from: FROM_EMAIL,
      subject,
      text: emailContent,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <p>${emailContent.split('\n').join('</p><p>')}</p>
            </div>`
    });
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return false;
  }
}

/**
 * Send a booking update email
 */
export async function sendBookingUpdate(
  userEmail: string,
  restaurant: Restaurant,
  date: Date,
  time: string,
  partySize: number,
  statusUpdate: string
): Promise<boolean> {
  try {
    // Generate a personalized message
    const emailContent = await openaiService.generateBookingMessage(
      restaurant.name,
      restaurant.cuisine,
      date,
      time,
      partySize,
      false // Update, not confirmation
    );

    const combinedContent = `${emailContent}\n\nStatus update: ${statusUpdate}`;

    const subject = replaceTemplatePlaceholders(
      EMAIL_TEMPLATES.BOOKING_UPDATE.subject,
      { restaurantName: restaurant.name }
    );

    return await sendEmail({
      to: userEmail,
      from: FROM_EMAIL,
      subject,
      text: combinedContent,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <p>${combinedContent.split('\n').join('</p><p>')}</p>
            </div>`
    });
  } catch (error) {
    console.error('Error sending booking update email:', error);
    return false;
  }
}

/**
 * Send a success notification when a booking is secured
 */
export async function sendBookingSecuredNotification(
  userEmail: string,
  restaurant: Restaurant,
  date: Date,
  time: string,
  partySize: number,
  bookingReference: string
): Promise<boolean> {
  try {
    const emailContent = `
Great news! We've successfully secured your table at ${restaurant.name}.

Reservation Details:
- Date: ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Time: ${time}
- Party: ${partySize} ${partySize === 1 ? 'person' : 'people'}
- Booking Reference: ${bookingReference}

Your booking has been confirmed through ${restaurant.bookingPlatform}.

Thank you for using Prime Table. Enjoy your dining experience!

Best regards,
The Prime Table Team`;

    const subject = replaceTemplatePlaceholders(
      EMAIL_TEMPLATES.BOOKING_SECURED.subject,
      { restaurantName: restaurant.name }
    );

    return await sendEmail({
      to: userEmail,
      from: FROM_EMAIL,
      subject,
      text: emailContent,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <p>${emailContent.split('\n').join('</p><p>')}</p>
            </div>`
    });
  } catch (error) {
    console.error('Error sending booking secured notification:', error);
    return false;
  }
}

/**
 * Send a reminder email for an upcoming booking
 */
export async function sendBookingReminder(
  userEmail: string,
  restaurant: Restaurant,
  date: Date,
  time: string,
  partySize: number,
  bookingReference: string
): Promise<boolean> {
  try {
    const emailContent = `
This is a friendly reminder about your upcoming reservation at ${restaurant.name}.

Reservation Details:
- Date: ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Time: ${time}
- Party: ${partySize} ${partySize === 1 ? 'person' : 'people'}
- Booking Reference: ${bookingReference}

Location: ${restaurant.location}

If you need to make any changes, please contact us at least 24 hours in advance.

We hope you enjoy your dining experience!

Best regards,
The Prime Table Team`;

    const subject = replaceTemplatePlaceholders(
      EMAIL_TEMPLATES.BOOKING_REMINDER.subject,
      { restaurantName: restaurant.name }
    );

    return await sendEmail({
      to: userEmail,
      from: FROM_EMAIL,
      subject,
      text: emailContent,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <p>${emailContent.split('\n').join('</p><p>')}</p>
            </div>`
    });
  } catch (error) {
    console.error('Error sending booking reminder email:', error);
    return false;
  }
}

/**
 * Send a cancellation email
 */
export async function sendCancellationEmail(
  userEmail: string,
  restaurant: Restaurant,
  date: Date,
  time: string
): Promise<boolean> {
  try {
    const emailContent = `
Your reservation at ${restaurant.name} has been cancelled.

Cancelled Reservation Details:
- Date: ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Time: ${time}

If you did not request this cancellation, please contact our support team immediately.

Thank you for using Prime Table.

Best regards,
The Prime Table Team`;

    const subject = replaceTemplatePlaceholders(
      EMAIL_TEMPLATES.BOOKING_CANCELLATION.subject,
      { restaurantName: restaurant.name }
    );

    return await sendEmail({
      to: userEmail,
      from: FROM_EMAIL,
      subject,
      text: emailContent,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <p>${emailContent.split('\n').join('</p><p>')}</p>
            </div>`
    });
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    return false;
  }
}

export default {
  sendBookingConfirmation,
  sendBookingUpdate,
  sendBookingSecuredNotification,
  sendBookingReminder,
  sendCancellationEmail
};