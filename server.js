require("dotenv").config();
const express = require("express");
const clients = require("./config/clients");

const app = express();
const { initClient, getQR, isClientInitialized } = require("./services/whatsapp");

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send("WhatsApp Multi-Client AI Server Running");
});

// 🔥 Start client only when button clicked
app.get("/start/:clientId", async (req, res) => {
    const clientId = req.params.clientId;

    const clientConfig = clients.find(c => c.id === clientId);
    if (!clientConfig) return res.send("Invalid client");

    if (!isClientInitialized(clientId)) {
        await initClient(clientConfig);
        return res.send("Client initializing...");
    }

    res.send("Client already running");
});

// 🔥 Get QR
app.get("/qr/:clientId", (req, res) => {
    const qr = getQR(req.params.clientId);

    if (!qr) {
        return res.send("QR not ready or already logged in");
    }

    res.send(`<img src="${qr}" width="300"/>`);
});

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});