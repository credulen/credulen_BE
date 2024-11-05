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
  };

  // Generate rows only for fields that have values
  return Object.entries(fieldMappings)
    .filter(([_, field]) => field.value) // Only include fields with values
    .map(
      ([_, field]) => `
      <tr>
        <td style="padding: 8px 0;"><strong>${field.label}:</strong></td>
        <td style="padding: 8px 0;">${field.value}</td>
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
          <title>Registration Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: white;">
              <tr>
                 <td style="background-color: #1e293b; padding: 20px; text-align: center;">
                    <img src='https://res.cloudinary.com/dxmiz9idd/image/upload/v1730724855/CredulenLogo_n8wexs.png' 
                         alt="Creculen Logo" 
                         width="200" height="70">
                 </td>
              </tr>
              <tr>
                  <td style="padding: 40px 20px; text-align: center;">
                      <h1 style="color: #047481; margin: 0 0 20px 0; font-size: 28px;">Registration Confirmed!</h1>
                      <p style="color: #1e293b; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                          Thank you for registering for our solutions at Creculen. We're excited to help you unlock intelligence and create value in your journey.
                      </p>
                  </td>
              </tr>
              <tr>
                  <td style="padding: 0 20px 30px;">
                    <div style="position: relative; border-radius: 8px; overflow: hidden; padding: 20px;">
                      <div style="background-image: url(https://res.cloudinary.com/dxmiz9idd/image/upload/v1730725044/insight_gggtlk.jpg); background-size: cover; filter: blur(20px); position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 0;"></div>
                      <div style="background-color: rgba(248, 249, 250, 0.8); border-radius: 8px; position: relative; z-index: 1; padding: 20px;">
                          <h2 style="color: #047481; font-size: 20px; margin: 0 0 20px 0;">Registration Details</h2>
                          <table cellpadding="0" cellspacing="0" width="100%" style="color: #666;">
                              ${tableRows}
                          </table>
                      </div>
                    </div>
                  </td>
              </tr>
              <tr>
                  <td style="padding: 0 20px 40px;">
                      <p style="color: #1e293b; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                          Our team will review your registration and contact you within the next 24-48 hours to discuss the next steps and customize our solution to your specific needs.
                      </p>
                      <p style="color: #1e293b; font-size: 16px; line-height: 1.5;">
                          In the meantime, if you have any questions, please don't hesitate to reach out to our support team at <a href="mailto:support@creculen.com" style="color: #0066cc; text-decoration: none;">support@creculen.com</a>
                      </p>
                  </td>
              </tr>
              <tr>
                  <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                      <p style="color: #1e293b; font-size: 14px; margin: 0;">
                          © 2024 Creculen. All rights reserved.
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
