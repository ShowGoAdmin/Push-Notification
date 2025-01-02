const sdk = require("node-appwrite");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
const serviceAccount = require("./path-to-service-account.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// Initialize Appwrite Client
const client = new sdk.Client();
const users = new sdk.Users(client);

// Configure Appwrite Client
client
.setEndpoint(process.env.APPWRITE_ENDPOINT) // Appwrite endpoint
.setProject(process.env.APPWRITE_PROJECT_ID) // Project ID
.setKey(process.env.APPWRITE_API_KEY); // API Key from environment variable

// Function to fetch all user tokens from Appwrite Auth
async function fetchUserTokens() {
    try {
        const response = await users.list(); // Fetch all users
        const tokens = [];

        // Iterate through users to find those with push targets
        response.users.forEach((user) => {
            // Assuming push target tokens are stored in the user's preferences
            if (user.prefs && user.prefs.pushTarget && user.prefs.pushTarget.token) {
                tokens.push(user.prefs.pushTarget.token);
            }
        });

        return tokens;
    } catch (error) {
        console.error("Error fetching user tokens from auth:", error);
        return [];
    }
}

// Function to send push notifications
async function sendPushNotification(title, message) {
    try {
        const tokens = await fetchUserTokens();

        if (tokens.length === 0) {
            console.log("No tokens available for sending push notifications.");
            return;
        }

        // Notification payload
        const payload = {
            notification: {
                title: title,
                body: message,
            },
        };

        // Send notifications
        const response = await admin.messaging().sendToDevice(tokens, payload);
        console.log("Push notification sent successfully:", response);
    } catch (error) {
        console.error("Error sending push notification:", error);
    }
}

// Appwrite Function Entry Point
module.exports = async (req, res) => {
    try {
        // Parse incoming payload
        const data = JSON.parse(req.payload || "{}");
        const title = data.title || "Default Title";
        const message = data.message || "Default Message";

        console.log(`Sending notifications with title: ${title}, message: ${message}`);
        await sendPushNotification(title, message);

        res.json({
            success: true,
            message: "Push notifications sent successfully",
        });
    } catch (error) {
        console.error("Error executing function:", error);
        res.json({
            success: false,
            message: "Error occurred while sending notifications.",
        });
    }
};
