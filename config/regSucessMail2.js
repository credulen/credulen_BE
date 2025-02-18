const sendRegSuccessMail2 = async (data) => {
  const {
    fullName,
    phoneNumber,
    email,
    employmentStatus,
    jobTitle,
    selectedSolution,
    slug,
    solutionCategory,
    companyName,
    companyIndustry,
    companySize,
    country,
    firstName,
    lastName,
    solutionType,
  } = data;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Registration Confirmation",
    html: `
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Registration Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: white;">
              <tr>
                  <td style="background-color: #1a1a1a; padding: 20px; text-align: center;">
                      <img src="/api/placeholder/150/50" alt="Creculen Logo" style="height: 50px;">
                  </td>
              </tr>
              <tr>
                  <td style="padding: 40px 20px; text-align: center;">
                      <h1 style="color: #333; margin: 0 0 20px 0; font-size: 28px;">Registration Confirmed!</h1>
                      <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                          Thank you for registering for our solutions at Creculen. We're excited to help you unlock intelligence and create value in your journey.
                      </p>
                  </td>
              </tr>
              <tr>
                  <td style="padding: 0 20px 30px;">
                      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
                          <h2 style="color: #333; font-size: 20px; margin: 0 0 20px 0;">Registration Details</h2>
                          <table cellpadding="0" cellspacing="0" width="100%" style="color: #666;">
                              <tr>
                                  <td style="padding: 8px 0;"><strong>Name:</strong></td>
                                  <td style="padding: 8px 0;">${fullName}</td>
                              </tr>
                              <tr>
                                  <td style="padding: 8px 0;"><strong>Email:</strong></td>
                                  <td style="padding: 8px 0;">${email}</td>
                              </tr>
                              <tr>
                                  <td style="padding: 8px 0;"><strong>Phone:</strong></td>
                                  <td style="padding: 8px 0;">${phoneNumber}</td>
                              </tr>
                              <tr>
                                  <td style="padding: 8px 0;"><strong>Employment Status:</strong></td>
                                  <td style="padding: 8px 0;">${employmentStatus}</td>
                              </tr>
                              <tr>
                                  <td style="padding: 8px 0;"><strong>Job Title:</strong></td>
                                  <td style="padding: 8px 0;">${jobTitle}</td>
                              </tr>
                              <tr>
                                  <td style="padding : 8px 0;"><strong>Selected Solution:</strong></td>
                                  <td style="padding: 8px 0;">${selectedSolution}</td>
                              </tr>
                              <tr>
                                  <td style="padding: 8px 0;"><strong>Slug:</strong></td>
                                  <td style="padding: 8px 0;">${slug}</td>
                              </tr>
                              <tr>
                                  <td style="padding: 8px 0;"><strong>Solution Category:</strong></td>
                                  <td style="padding: 8px 0;">${solutionCategory}</td>
                              </tr>
                              <tr>
                                  <td style="padding: 8px 0;"><strong>Company Name:</strong></td>
                                  <td style="padding: 8px 0;">${companyName}</td>
                              </tr>
                              <tr>
                                  <td style="padding: 8px 0;"><strong>Company Industry:</strong></td>
                                  <td style="padding: 8px 0;">${companyIndustry}</td>
                              </tr>
                              <tr>
                                  <td style="padding: 8px 0;"><strong>Company Size:</strong></td>
                                  <td style="padding: 8px 0;">${companySize}</td>
                              </tr>
                              <tr>
                                  <td style="padding: 8px 0;"><strong>Country:</strong></td>
                                  <td style="padding: 8px 0;">${country}</td>
                              </tr>
                          </table>
                      </div>
                  </td>
              </tr>
              <tr>
                  <td style="padding: 0 20px 40px;">
                      <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                          Our team will review your registration and contact you within the next 24-48 hours to discuss the next steps and customize our solution to your specific needs.
                      </p>
                      <p style="color: #666; font-size: 16px; line-height: 1.5;">
                          In the meantime, if you have any questions, please don't hesitate to reach out to our support team at <a href="mailto:support@creculen.com" style="color: #0066cc; text-decoration: none;">credulen@gmail.com</a>
                      </p>
                  </td>
              </tr>
              <tr>
                  <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                      <p style="color: #666; font-size: 14px; margin: 0;">
                          © 2024 Credulen. All rights reserved.
                      </p>
                  </td>
              </tr>
          </table>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
};
