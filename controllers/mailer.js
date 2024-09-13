const nodemailer = require("nodemailer");

const registerMail = async (req, res) => {
  const { email, firstName } = req.body;

  try {
    // Create a transporter using nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "petersonzoconis@gmail.com",
        pass: "hszatxfpiebzavdd",
      },
    });

    // Define mail options
    const mailOptions = {
      from: "petersonzoconis@gmail.com",
      to: email,
      subject: "Signup Successful",
      text: `Welcome ${firstName} to Gekoda! 🎉 We're thrilled to have you join our platform. Get ready to unlock new opportunities and connect with a vibrant community. Feel free to explore all the features and resources we offer to make your experience unforgettable. If you have any questions or need assistance, don't hesitate to reach out. Let's embark on this journey together and make magic happen! 🚀`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    // Log success message to the console
    console.log("Email sent successfully!");

    // Send a success response to the client
    res.status(200).json({ message: "Email sent successfully!" });
  } catch (error) {
    // Log error to the console
    console.error("Error sending email:", error);

    // Send an error response to the client
    res
      .status(500)
      .json({ error: "An error occurred while sending the email." });
  }
};

module.exports = {
  registerMail,
};
