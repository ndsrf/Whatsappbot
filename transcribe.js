const { Client, LocalAuth, MessageTypes } = require('whatsapp-web.js');
const axios = require('axios');
const constants = require('./constants'); // Import your constants module here

async function Transcribe(message) {
    let messageResponse = ''; // Variable to store the transcription response

    // Check if the message contains audio or voice
    if (message.type.includes(MessageTypes.AUDIO) || message.type.includes(MessageTypes.VOICE)) {
        // Check if the message has media
        if (message.hasMedia) {
            // Download the media
            const media = await message.downloadMedia();

            // Construct the API URL
            const apiUrl = constants.N8N_SERVER + constants.ENDPOINT_TRANSCRIBE;

            // Define the JSON object to send in the POST request
            const messageId = message.id.id + '-' + Date.now().toString(36);
            const postData = {
                data: media.data,
                id: messageId
            };

            try {
                // Make a POST request to the API endpoint
                const response = await axios.post(apiUrl, postData);
                
                // Extract the "transcription" field from the response data
                messageResponse = response.data.transcription;

                // Uncomment the line below if you want to log the transcription message
                // console.log('Message:', messageResponse);
            } catch (error) {
                // Handle any errors
                console.error('Error:', error);
            }
        }
    }

    return messageResponse;
}




module.exports = Transcribe;