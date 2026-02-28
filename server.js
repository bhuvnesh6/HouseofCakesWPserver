require("dotenv").config();
const express = require("express");
const clients = require("./config/clients");

const app = express();

const { 
    initClient, 
    getQR, 
    isClientInitialized,
    getClient 
} = require("./services/whatsapp");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send("WhatsApp Multi-Client AI Server Running");
});


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


app.post("/send-message", async (req, res) => {
    const { clientId, number, message } = req.body;

    try {
        console.log("Incoming body:", req.body);

        if (!clientId || !number || !message) {
            return res.status(400).json({
                error: "clientId, number and message are required"
            });
        }

        const client = getClient(clientId);

        if (!client) {
            return res.status(400).json({ error: "Client not found" });
        }

        if (!client.info) {
            return res.status(400).json({ error: "Client not ready yet" });
        }

        // 🔥 Safe number formatting
        const formattedNumber = number.includes("@c.us")
            ? number
            : number.replace(/\D/g, "") + "@c.us";

        console.log("Sending to:", formattedNumber);

        await client.sendMessage(formattedNumber, message);

        res.json({ success: true });

    } catch (err) {
        console.error("SEND MESSAGE ERROR:", err);
        res.status(500).json({
            error: "Failed to send message",
            details: err.message
        });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});