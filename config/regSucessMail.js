const nodemailer = require("nodemailer");

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

// Helper function to generate table rows for non-empty fields
const generateTableRows = (data) => {
  const fieldMappings = {
    firstName: { label: "First Name", value: data.firstName },
    lastName: { label: "Last Name", value: data.lastName },
    email: { label: "Email", value: data.email },
    phoneNumber: { label: "Phone", value: data.phoneNumber },
    jobTitle: { label: "Job Title", value: data.jobTitle },
    employmentStatus: {
      label: "Employment Status",
      value: data.employmentStatus,
    },
    selectedSolution: {
      label: "Selected Solution",
      value: data.selectedSolution,
    },
    solutionCategory: { label: "Solution Type", value: data.solutionCategory },
    solutionType: { label: "Solution Category", value: data.solutionType },
    companyName: { label: "Company Name", value: data.companyName },
    companyIndustry: { label: "Company Industry", value: data.companyIndustry },
    companySize: { label: "Company Size", value: data.companySize },
    country: { label: "Country", value: data.country },
    amount: {
      label: "Amount Paid",
      value: data.amount ? `₦${data.amount.toLocaleString()}` : null,
    }, // Add amount
    paymentReference: {
      label: "Payment Reference",
      value: data.paymentReference,
    }, // Add payment reference
  };

  // Generate rows only for fields that have values
  return Object.entries(fieldMappings)
    .filter(([_, field]) => field.value) // Only include fields with values
    .map(
      ([_, field]) => `
      <tr>
        <td style="padding: 10px 0; color: #4B5563; font-size: 14px; font-weight: 600; width: 40%;">
          ${field.label}:
        </td>
        <td style="padding: 10px 0; color: #1F2937; font-size: 14px;">
          ${field.value}
        </td>
      </tr>
    `
    )
    .join("");
};

// Function to generate the full HTML email template
const generateEmailTemplate = (data) => {
  const tableRows = generateTableRows(data);

  return `
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation - Credulen</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Inter', Arial, sans-serif;
            background-color: #F3F4F6;
            line-height: 1.6;
          }
          a {
            text-decoration: none;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #047481;
            color: white;
            border-radius: 6px;
            font-weight: 500;
            text-align: center;
            transition: background-color 0.3s ease;
          }
          .button:hover {
            background-color: #035B66;
          }
        </style>
      </head>
      <body>
        <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #047481; padding: 24px; text-align: center;">
              <img src='https://res.cloudinary.com/dxmiz9idd/image/upload/v1730724855/CredulenLogo_n8wexs.png' 
                   alt="Credulen Logo" 
                   style="max-width: 180px; height: auto;">
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 24px; text-align: center;">
              <h1 style="color: #047481; font-size: 28px; font-weight: 700; margin-bottom: 16px;">
                Payment Confirmation
              </h1>
              <p style="color: #4B5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                Dear ${data.firstName} ${data.lastName},<br>
                Thank you for your payment! We're excited to confirm your registration for <strong>${
                  data.selectedSolution
                }</strong> at Credulen.
              </p>
            </td>
          </tr>

          <!-- Registration Details -->
          <tr>
            <td style="padding: 0 24px 32px;">
              <div style="background-color: #F8FAFC; border-radius: 8px; padding: 24px;">
                <h2 style="color: #047481; font-size: 20px; font-weight: 600; margin-bottom: 20px;">
                  Payment Details
                </h2>
                <table cellpadding="0" cellspacing="0" width="100%">
                  ${tableRows}
                </table>
              </div>
            </td>
          </tr>

          <!-- Next Steps -->
          <tr>
            <td style="padding: 0 24px 40px; text-align: center;">
              <p style="color: #4B5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                Our team will reach out within the next 24-48 hours to provide further details and guide you through the next steps. In the meantime, feel free to explore more about our solutions on our website.
              </p>
              <a href="https://www.credulen.com" class="button">
                Visit Our Website
              </a>
            </td>
          </tr>

          <!-- Support Section -->
          <tr>
            <td style="padding: 0 24px 40px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #6B7280; font-size: 14px; line-height: 1.5; margin-top: 24px;">
                Need assistance? Contact our support team at <a href="mailto:credulen@gmail.com" style="color: #047481; text-decoration: underline;">support@credulen.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 16px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #6B7280; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Credulen. All rights reserved.
              </p>
              <p style="color: #6B7280; font-size: 12px; margin-top: 8px;">
               
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

// Updated email sending functions
const sendRegSuccessMail1 = async (data) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: data.email,
    subject: "Payment Confirmation - Credulen",
    html: generateEmailTemplate(data),
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending payment confirmation email:", error);
    throw new Error("Failed to send payment confirmation email");
  }
};

const sendRegSuccessMail2 = async (data) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: data.email,
    subject: "Registration Confirmation",
    html: generateEmailTemplate(data),
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending registration email:", error);
    throw new Error("Failed to send registration email");
  }
};

module.exports = {
  sendRegSuccessMail1,
  sendRegSuccessMail2,
};
