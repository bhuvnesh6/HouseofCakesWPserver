const axios = require("axios");

async function sendToWebhook(webhookUrl, data) {
    try {
        const response = await axios.post(webhookUrl, data);
        return response.data; // must return { reply: "text" }

    } catch (error) {
        console.error("Webhook error:", error.message);
        return { reply: "Sorry, something went wrong." };
    }
}

module.exports = { sendToWebhook };