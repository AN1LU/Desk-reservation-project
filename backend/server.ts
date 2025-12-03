import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Configura tu email
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "analuciapelayom@gmail.com",
    pass: "pyqw ycyv lbvg ixcc"
  }
});

// Endpoint para enviar correo
app.post("/send-email", async (req, res) => {
  const { to, subject, message } = req.body;

  try {
    await transporter.sendMail({
      from: "TU_CORREO@gmail.com",
      to,
      subject,
      text: message
    });

    res.json({ success: true, message: "Correo enviado correctamente" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: "Error enviando correo" });
  }
});

// Puerto
const PORT = 3000;
app.listen(PORT, () => console.log(`Backend escuchando en http://localhost:${PORT}`));
