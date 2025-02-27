const nodemailer = require("nodemailer");
const cron = require("node-cron");
const Event = require("../models/eventsModel");
const EventRegistration = require("../models/registerEventModel");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const generateEventDetailsRows = (data) => {
  // Define field mappings with conditions for display
  const fieldMappings = {
    fullName: {
      label: "Attendee Name",
      value: data.fullName,
      show: Boolean(data.fullName),
    },
    eventTitle: {
      label: "Event Title",
      value: data.eventTitle,
      show: Boolean(data.eventTitle),
    },
    eventCategory: {
      label: "Event Type",
      value: data.eventCategory,
      show: Boolean(data.eventCategory),
    },
    eventDate: {
      label: "Event Date",
      value: data.eventDate
        ? new Date(data.eventDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : null,
      show: Boolean(data.eventDate),
    },
    duration: {
      label: "Duration",
      value: data.duration ? `${data.duration} minutes` : null,
      show: Boolean(data.duration),
    },
    venue: {
      label: "Venue",
      value: data.venue,
      show: Boolean(data.venue),
    },
    meetingId: {
      label: "Meeting ID",
      value: data.meetingId,
      show: Boolean(data.meetingId),
    },
    passcode: {
      label: "Passcode",
      value: data.passcode,
      show: Boolean(data.passcode),
    },
    meetingLink: {
      label: "Meeting Link",
      value: `<a href="${data.meetingLink}" style="color: #047481; text-decoration: none;">Join Meeting</a>`,
      show: Boolean(data.meetingLink),
    },
  };

  // Filter and map only fields that should be shown
  return Object.entries(fieldMappings)
    .filter(([_, field]) => field.show)
    .map(
      ([_, field]) => `
      <tr>
        <td style="padding: 12px 15px; width: 140px; border-bottom: 1px solid #eee;">
          <strong style="color: #1e293b;">${field.label}:</strong>
        </td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">
          ${field.value}
        </td>
      </tr>
    `
    )
    .join("");
};

const generateEmailTemplate = (data) => {
  const eventDetailsRows = generateEventDetailsRows(data);

  // Only show the Join Meeting button if there's a meeting link
  const joinButtonHtml = data.meetingLink
    ? `
    <div style="text-align: center; margin-top: 30px;">
      <a href="${data.meetingLink}" 
         style="display: inline-block; background-color: #047481; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold;">
         Join Meeting
      </a>
    </div>
  `
    : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Registration Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background-color: #1e293b; padding: 20px; text-align: center;">
          <img src='https://res.cloudinary.com/dxmiz9idd/image/upload/v1730724855/CredulenLogo_n8wexs.png' 
               alt="Credulen Logo" 
               width="200" height="70"
               style="display: block; margin: 0 auto;">
        </div>

        <!-- Save the Date Section (Static Version) -->
        <div style="text-align: center; padding: 40px 20px; background-color: #047481;">
          <div style="width: 200px; height: 200px; margin: 0 auto; border: 8px solid #ffffff; border-radius: 50%; background-color: white;">
            <div style="padding: 50px 0;">
              <div style="font-size: 24px; line-height: 1.2; color: #000000; font-weight: bold;">
                SAVE<br>THE<br>DATE
              </div>
            </div>
          </div>
        </div>

        <!-- Confirmation Message -->
        <div style="text-align: center; padding: 30px 20px; background-color: #f8f9fa;">
          <p style="color: #666; font-size: 16px; margin: 0;">Thank you for registering for our upcoming event.</p>
        </div>

        <!-- Event Details -->
        ${
          eventDetailsRows
            ? `
        <div style="padding: 0 20px 30px;">
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #047481; font-size: 22px; margin: 0 0 20px 0; text-align: center;">Registration Details</h2>
            <table cellpadding="0" cellspacing="0" style="width: 100%; color: #666;">
              ${eventDetailsRows}
            </table>
            ${joinButtonHtml}
          </div>
        </div>
        `
            : ""
        }

        <!-- Additional Information -->
        <div style="padding: 0 30px 30px;">
          <p style="color: #1e293b; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            We look forward to your participation! Don't forget to add this event to your calendar.
          </p>
          <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">
            If you have any questions, please don't hesitate to reach out to our support team at 
            <a href="mailto:support@Credulen.com" style="color: #047481; text-decoration: none;">support@Credulen.com</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #1e293b; font-size: 14px; margin: 0;">© 2024 Credulen. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const sendEventConfirmationEmail = async (data) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: data.email,
    subject: `Registration Confirmed: ${data.eventTitle}`,
    html: generateEmailTemplate(data),
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending event registration email:", error);
    throw new Error("Failed to send event registration email");
  }
};

// REMINDER FUNCTIONS
const sentReminders = new Set();

// Function to generate a unique reminder key
const getReminderKey = (email, eventId, reminderType) => {
  return `${email}-${eventId}-${reminderType}-${new Date().toDateString()}`;
};

// Generate 24-hour reminder email template
const generate24HourReminderTemplate = (data) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Reminder - 24 Hours to Go!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background-color: #1e293b; padding: 20px; text-align: center;">
          <img src='https://res.cloudinary.com/dxmiz9idd/image/upload/v1730724855/CredulenLogo_n8wexs.png' 
               alt="Credulen Logo" 
               width="200" height="70"
               style="display: block; margin: 0 auto;">
        </div>

        <!-- Reminder Banner -->
        <div style="background-color: #047481; padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Your Event Starts in 24 Hours!</h1>
        </div>

        <!-- Event Details -->
        <div style="padding: 30px;">
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
            <h2 style="color: #047481; margin-top: 0;">${data.eventTitle}</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  <strong>Date & Time:</strong>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  ${new Date(data.eventDate).toLocaleString()}
                </td>
              </tr>
              ${
                data.venue
                  ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  <strong>Venue:</strong>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  ${data.venue}
                </td>
              </tr>
              `
                  : ""
              }
              ${
                data.meetingLink
                  ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  <strong>Meeting Link:</strong>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  <a href="${data.meetingLink}" style="color: #047481;">Join Meeting</a>
                </td>
              </tr>
              `
                  : ""
              }
            </table>

            ${
              data.meetingLink
                ? `
            <div style="text-align: center; margin-top: 20px;">
              <a href="${data.meetingLink}" 
                 style="display: inline-block; background-color: #047481; color: white; 
                        padding: 12px 30px; text-decoration: none; border-radius: 5px;">
                Join Event
              </a>
            </div>
            `
                : ""
            }
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #666; margin: 0;">© 2024 Credulen. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate 1-hour reminder email template
const generate1HourReminderTemplate = (data) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Starts in 1 Hour!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background-color: #1e293b; padding: 20px; text-align: center;">
          <img src='https://res.cloudinary.com/dxmiz9idd/image/upload/v1730724855/CredulenLogo_n8wexs.png' 
               alt="Credulen Logo" 
               width="200" height="70"
               style="display: block; margin: 0 auto;">
        </div>

        <!-- Urgent Reminder Banner -->
        <div style="background-color: #dc2626; padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Your Event Starts in 1 Hour!</h1>
        </div>

        <!-- Event Details -->
        <div style="padding: 30px;">
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
            <h2 style="color: #047481; margin-top: 0;">${data.eventTitle}</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  <strong>Date & Time:</strong>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  ${new Date(data.eventDate).toLocaleString()}
                </td>
              </tr>
              ${
                data.venue
                  ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  <strong>Venue:</strong>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  ${data.venue}
                </td>
              </tr>
              `
                  : ""
              }
              ${
                data.meetingLink
                  ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  <strong>Meeting Link:</strong>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  <a href="${data.meetingLink}" style="color: #047481;">Join Meeting</a>
                </td>
              </tr>
              `
                  : ""
              }
            </table>

            ${
              data.meetingLink
                ? `
            <div style="text-align: center; margin-top: 20px;">
              <a href="${data.meetingLink}" 
                 style="display: inline-block; background-color: #dc2626; color: white; 
                        padding: 12px 30px; text-decoration: none; border-radius: 5px;">
                Join Now
              </a>
            </div>
            `
                : ""
            }
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #666; margin: 0;">© 2024 Credulen. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Function to send reminder emails
const sendReminderEmail = async (registration, event, template) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: registration.email,
    subject: `Reminder: ${event.title} - Starting Soon!`,
    html: template({
      eventTitle: event.title,
      eventDate: event.date,
      venue: event.venue,
      meetingLink: event.meetingLink,
      meetingId: event.meetingId,
      passcode: event.passcode,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to ${registration.email}`);
  } catch (error) {
    console.error(
      `Failed to send reminder email to ${registration.email}:`,
      error
    );
  }
};

const checkAndSendReminders = async () => {
  try {
    const now = new Date();
    console.log("Checking reminders at:", now);

    // Clear old reminder records (older than 24 hours)
    for (const key of sentReminders) {
      const [email, eventId, reminderType, dateStr] = key.split("-");
      const reminderDate = new Date(dateStr);
      if (now - reminderDate > 24 * 60 * 60 * 1000) {
        sentReminders.delete(key);
      }
    }

    // Find upcoming events within the next 25 hours
    const upcomingEvents = await Event.find({
      date: {
        $gt: now,
        $lt: new Date(now.getTime() + 25 * 60 * 60 * 1000), // 25 hours from now
      },
    });

    console.log(`Found ${upcomingEvents.length} upcoming events`);

    for (const event of upcomingEvents) {
      const registrations = await EventRegistration.find({ slug: event.slug });
      console.log(
        `Found ${registrations.length} registrations for event: ${event.title}`
      );

      const eventTime = new Date(event.date);
      const hoursUntilEvent = (eventTime - now) / (1000 * 60 * 60);
      console.log(`Hours until event: ${hoursUntilEvent}`);

      for (const registration of registrations) {
        // Check for 24-hour reminder
        if (hoursUntilEvent <= 24.5 && hoursUntilEvent > 23.5) {
          const reminderKey = getReminderKey(
            registration.email,
            event._id,
            "24h"
          );
          if (!sentReminders.has(reminderKey)) {
            console.log(`Sending 24hr reminder to ${registration.email}`);
            await sendReminderEmail(
              registration,
              event,
              generate24HourReminderTemplate
            );
            sentReminders.add(reminderKey);
          } else {
            console.log(
              `Skipping duplicate 24hr reminder for ${registration.email}`
            );
          }
        }

        // Check for 1-hour reminder
        if (hoursUntilEvent <= 1.5 && hoursUntilEvent > 0.5) {
          const reminderKey = getReminderKey(
            registration.email,
            event._id,
            "1h"
          );
          if (!sentReminders.has(reminderKey)) {
            console.log(`Sending 1hr reminder to ${registration.email}`);
            await sendReminderEmail(
              registration,
              event,
              generate1HourReminderTemplate
            );
            sentReminders.add(reminderKey);
          } else {
            console.log(
              `Skipping duplicate 1hr reminder for ${registration.email}`
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in reminder check:", error);
    console.error(error.stack);
  }
};

// Modified scheduler to run every 10 minutes
const scheduleReminders = () => {
  console.log("Initializing reminder scheduler...");

  // Run every 10 minutes
  cron.schedule("*/10 * * * *", () => {
    console.log("Running scheduled reminder check...");
    checkAndSendReminders().catch((err) => {
      console.error("Failed to run reminder check:", err);
    });
  });

  // Run an initial check immediately on startup
  checkAndSendReminders().catch((err) => {
    console.error("Failed to run initial reminder check:", err);
  });
};

// Function to check the current state of sent reminders (for debugging)
const getRemindersStatus = () => {
  return {
    totalTrackedReminders: sentReminders.size,
    reminders: Array.from(sentReminders),
  };
};

const triggerReminderCheck = async () => {
  console.log("Manually triggering reminder check...");
  await checkAndSendReminders();
};

module.exports = {
  sendEventConfirmationEmail,
  scheduleReminders,
  checkAndSendReminders,
  triggerReminderCheck,
  getRemindersStatus,
};
