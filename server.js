const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { exec } = require("child_process");
const paypal = require("@paypal/checkout-server-sdk");

const app = express();
const port = 3001;

// Omogućavanje CORS i parsiranje JSON-a
app.use(cors());
app.use(express.json());

// PayPal Sandbox konfiguracija
const clientId = "Af6IBblLCyOierzsCuY4kCOlqwdh7tVFXCYiNfa9pWJ6X4O3Wx6g51ruM1XoJhk3qXguUhjkrAeGgkKT"; // Tvoj Sandbox Client ID
const clientSecret = "EGpUvb-agkItBQVDMfdyc57MGH-dIN-R5R5f-la-xfGHFioDkYcrTHJUBFEqDjmgx-k3vCqyy56wu1-t"; // Tvoj Sandbox Secret
const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

// Ruta za kreiranje PayPal porudžbine
app.post("/api/paypal/create-order", async (req, res) => {
  const { total } = req.body;

  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "EUR",
          value: total.toString(),
        },
      },
    ],
  });

  try {
    const order = await client.execute(request);
    console.log("PayPal porudžbina kreirana:", order.result.id);
    res.json({ id: order.result.id });
  } catch (error) {
    console.error("Greška pri kreiranju PayPal porudžbine:", error);
    res.status(500).json({ error: "PayPal order creation failed" });
  }
});

// Ruta za hvatanje PayPal plaćanja
app.post("/api/paypal/capture-order", async (req, res) => {
  const { orderID } = req.body;

  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});

  try {
    const capture = await client.execute(request);
    console.log("PayPal plaćanje uhvaćeno:", capture.result);
    res.json({ capture: capture.result });
  } catch (error) {
    console.error("Greška pri hvatanju PayPal plaćanja:", error);
    res.status(500).json({ error: "PayPal capture failed" });
  }
});

// Serviranje statičkih fajlova iz `public/images`
app.use("/images", express.static(path.join(__dirname, "public", "images")));

// API ruta za dobijanje liste slika
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

// API ruta za primanje porudžbine i čuvanje u order.json
app.post("/api/order", (req, res) => {
  const { name, selectedImages, paymentMethod, orderID } = req.body;

  if (!name || !selectedImages || selectedImages.length === 0) {
    return res.status(400).json({ error: "Nedostaju podaci u porudžbini." });
  }

  const orderData = { name, selectedImages, paymentMethod, orderID: orderID || null };
  const orderFilePath = path.join(__dirname, "order.json");

  fs.writeFile(orderFilePath, JSON.stringify(orderData, null, 2), (err) => {
    if (err) {
      console.error("Greška pri čuvanju porudžbine:", err);
      return res.status(500).json({ error: "Greška pri čuvanju porudžbine." });
    }
    console.log("Porudžbina sačuvana u order.json:", orderData);
    res.status(200).json({ message: "Porudžbina je primljena i sačuvana." });
  });
});

// API ruta za pokretanje print_order.py
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

// Pokretanje servera
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server je pokrenut na http://0.0.0.0:${port}`);
});