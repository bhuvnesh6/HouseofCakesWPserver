const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const { sendToWebhook } = require("./webhook");

const qrStore = {};
const clientStore = {};
const statusStore = {};

async function initClient(clientConfig) {

    if (clientStore[clientConfig.id]) {
        console.log(`${clientConfig.id} already initialized`);
        return;
    }

    console.log(`Initializing ${clientConfig.id}...`);

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: clientConfig.id,
            dataPath: clientConfig.sessionPath
        }),
        puppeteer: { headless: true, args: ["--no-sandbox"] }
    });

    clientStore[clientConfig.id] = client;
    statusStore[clientConfig.id] = "initializing";

    // 🔥 QR
    client.on("qr", async (qr) => {
        console.log(`QR generated for ${clientConfig.id}`);
        qrStore[clientConfig.id] = await QRCode.toDataURL(qr);
        statusStore[clientConfig.id] = "qr";
    });

    // ✅ Ready
    client.on("ready", () => {
        console.log(`${clientConfig.id} is ready`);
        qrStore[clientConfig.id] = null;
        statusStore[clientConfig.id] = "ready";
    });

    // ❌ Disconnected
    client.on("disconnected", (reason) => {
        console.log(`${clientConfig.id} disconnected:`, reason);
        statusStore[clientConfig.id] = "disconnected";
        delete clientStore[clientConfig.id];
    });

    // 💬 Message
    client.on("message", async (message) => {

        if (message.fromMe) return;
        if (!message.body) return;
        if (message.from.includes("@lid")) return;
        if (message.from.endsWith("@g.us")) return;
        if (message.from.endsWith("@broadcast")) return;

        console.log(`Message from ${message.from} on ${clientConfig.id}`);

        const payload = {
            number: message.from,
            message: message.body
        };

        try {
            const aiResponse = await sendToWebhook(
                clientConfig.webhookUrl,
                payload
            );

            if (!aiResponse) return;

            await handleResponse(client, message.from, aiResponse);

        } catch (err) {
            console.error("Webhook error:", err.message);
        }
    });

    await client.initialize();
}


/* =========================
   🔥 UNIVERSAL RESPONSE HANDLER
========================= */

async function handleResponse(client, to, aiResponse) {

    // 1️⃣ If structured messages array
    if (Array.isArray(aiResponse.messages)) {
        for (const msg of aiResponse.messages) {
            await sendSingleMessage(client, to, msg);
        }
        return;
    }

    // 2️⃣ If simple reply (backward compatibility)
    if (aiResponse.reply) {
        await client.sendMessage(to, aiResponse.reply);
        return;
    }

    // 3️⃣ If typed response
    if (aiResponse.type) {
        await sendSingleMessage(client, to, aiResponse);
        return;
    }

    console.log("Unknown response format");
}


/* =========================
   🔥 SEND SINGLE MESSAGE
========================= */

async function sendSingleMessage(client, to, msg) {

    if (msg.type === "text") {
        await client.sendMessage(to, msg.text);
    }

    else if (msg.type === "image") {
        if (!msg.imageUrl) return;

        const media = await MessageMedia.fromUrl(msg.imageUrl);
        await client.sendMessage(to, media, {
            caption: msg.caption || ""
        });
    }

    else if (msg.type === "images") {
        if (!Array.isArray(msg.images)) return;

        for (const img of msg.images) {
            const media = await MessageMedia.fromUrl(img.url);
            await client.sendMessage(to, media, {
                caption: img.caption || ""
            });
        }
    }

    else {
        console.log("Unsupported message type:", msg.type);
    }
}


/* =========================
   HELPERS
========================= */

function getQR(clientId) {
    return qrStore[clientId] || null;
}

function isClientInitialized(clientId) {
    return !!clientStore[clientId];
}

function getClientStatus(clientId) {
    return statusStore[clientId] || "not_started";
}

module.exports = {
    initClient,
    getQR,
    isClientInitialized,
    getClientStatus
};