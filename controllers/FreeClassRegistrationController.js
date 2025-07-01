const CampaignRegistration = require("../models/FreeClassRegistrationModel");
const nodemailer = require("nodemailer");

// Configure Nodemailer transporter

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

const registerCampaign = async (req, res) => {
  try {
    const { name, email, phoneNum } = req.body;

    // Validate required fields
    if (!name || !email || !phoneNum) {
      return res.status(400).json({
        success: false,
        message: "All fields (name, email, phoneNum) are required",
      });
    }

    // Check for existing registration
    const existingRegistration = await CampaignRegistration.findOne({ email });
    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered",
      });
    }

    // Create new registration
    const registration = await CampaignRegistration.create({
      name,
      email,
      phoneNum,
    });

    // Send confirmation email with resource link
    const resourceLink = "https://credulen.com/resources/class-materials";
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Credulen Free Master Class!",
      html: `
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Credulen Free Master Class - Credulen</title>
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
                    Welcome to Credulen Free Master Class!!
                  </h1>
                 <p style="color: #4B5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                Dear ${name},<br>
                Thank you for signing up for the Credulen Free Masterclass. We’re pleased to confirm your registration was successful.
               </p>

                </td>
              </tr>

              <!-- Resource Link -->
              <tr>
                <td style="padding: 0 24px 40px; text-align: center;">
                  <p style="color: #4B5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                    Click the button below to access your class resources and materials:
                  </p>
                  <a href="${resourceLink}" class="button">
                    Download Resources
                  </a>
                </td>
              </tr>

              <!-- Support Section -->
              <tr>
                <td style="padding: 0 24px 40px; text-align: center; border-top: 1px solid #E5E7EB;">
                  <p style="color: #6B7280; font-size: 14px; line-height: 1.5; margin-top: 24px;">
                    Need assistance? Contact our support team at <a href="mailto:support@credulen.com" style="color: #047481; text-decoration: underline;">support@credulen.com</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #F8FAFC; padding: 16px; text-align: center; border-top: 1px solid #E5E7EB;">
                  <p style="color: #6B7280; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Credulen. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email}`);

    res.status(201).json({
      success: true,
      message: "Registration successful, email sent with resource link",
      data: {
        name: registration.name,
        email: registration.email,
        registrationDate: registration.registrationDate,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred during registration",
    });
  }
};

const getAllRegistrations = async (req, res) => {
  try {
    const registrations = await CampaignRegistration.find({}).sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving registrations",
    });
  }
};

const getRegistrationById = async (req, res) => {
  try {
    const { id } = req.params;
    const registration = await CampaignRegistration.findById(id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }
    res.status(200).json({
      success: true,
      data: registration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving registration",
    });
  }
};

const deleteRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const registration = await CampaignRegistration.findById(id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }
    await CampaignRegistration.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Registration deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error deleting registration",
    });
  }
};

module.exports = {
  registerCampaign,
  getAllRegistrations,
  getRegistrationById,
  deleteRegistration,
};
