const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { exec } = require("child_process");
const paypal = require("@paypal/checkout-server-sdk");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const clientId = "Af6IBblLCyOierzsCuY4kCOlqwdh7tVFXCYiNfa9pWJ6X4O3Wx6g51ruM1XoJhk3qXguUhjkrAeGgkKT";
const clientSecret = "EGpUvb-agkItBQVDMfdyc57MGH-dIN-R5R5f-la-xfGHFioDkYcrTHJUBFEqDjmgx-k3vCqyy56wu1-t";

const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

app.post("/api/paypal/create-order", async (req, res) => {
  const { total } = req.body;
  
  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [{ amount: { currency_code: "EUR", value: total.toString() } }],
  });

  try {
    const order = await client.execute(request);
    res.json({ id: order.result.id });
  } catch (error) {
    res.status(500).json({ error: "PayPal order creation failed" });
  }
});

app.post("/api/paypal/capture-order", async (req, res) => {
  const { orderID } = req.body;

  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});

  try {
    const capture = await client.execute(request);
    res.json({ capture: capture.result });
  } catch (error) {
    res.status(500).json({ error: "PayPal capture failed" });
  }
});

// Nova ruta za beleženje prihvatanja uslova
app.post("/api/accept-terms", (req, res) => {
  const { deviceId, timestamp } = req.body;
  const ipAddress = req.ip; // IP adresa uređaja
  const logEntry = `${timestamp} - Device ID: ${deviceId} - IP: ${ipAddress} - Terms Accepted\n`;

  // Beleženje u fajl
  fs.appendFile(path.join(__dirname, "terms_log.txt"), logEntry, (err) => {
    if (err) {
      console.error("Greška pri beleženju prihvatanja uslova:", err);
      return res.status(500).json({ error: "Failed to log terms acceptance" });
    }
    res.json({ message: "Terms accepted and logged" });
  });
});

app.use("/images", express.static(path.join(__dirname, "public", "images")));

app.get("/api/images", (req, res) => {
  const imagesDirectory = path.join(__dirname, "public", "images");
  fs.readdir(imagesDirectory, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Ne može se pročitati folder sa slikama." });
    }
    const images = files.filter(file => file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png"));
    res.json(images);
  });
});

app.post("/api/order", (req, res) => {
  const { name, selectedImages, paymentMethod, orderID } = req.body;

  if (!name || !selectedImages || selectedImages.length === 0) {
    return res.status(400).json({ error: "Nedostaju podaci u porudžbini." });
  }

  const orderData = { name, selectedImages, paymentMethod, orderID: orderID || null };
  const orderFilePath = path.join(__dirname, "order.json");

  fs.writeFile(orderFilePath, JSON.stringify(orderData, null, 2), (err) => {
    if (err) {
      return res.status(500).json({ error: "Greška pri čuvanju porudžbine." });
    }
    res.status(200).json({ message: "Porudžbina je primljena i sačuvana." });
  });
});

app.post("/api/print", (req, res) => {
  console.log("Pokretanje štampe sa podacima:", req.body);
  exec("python print_order.py", (error, stdout, stderr) => {
    if (error) {
      console.error(`Greška: ${error.message}`);
      return res.status(500).json({ error: "Greška prilikom štampe: " + error.message });
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return res.status(500).json({ error: "Greška prilikom štampe: " + stderr });
    }
    console.log(`stdout: ${stdout}`);
    res.status(200).json({ message: "Štampa uspešno pokrenuta." });
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server je pokrenut na http://0.0.0.0:${port}`);
});
