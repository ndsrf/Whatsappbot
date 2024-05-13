const { Client, LocalAuth, MessageTypes } = require('whatsapp-web.js');
const axios = require('axios');
const constants = require('./constants'); // Import your constants module here

async function ChatGPT(message) {
    let messageResponse = ''; // Variable to store the  response

    // Define the URL of the REST API endpoint
    const apiUrl = constants.N8N_SERVER + constants.ENDPOINT_CHATGPT;
    var messageToChatGPT = "";
    var quotedMessage = await message.getQuotedMessage();
    if (quotedMessage)
    {
        messageToChatGPT = quotedMessage.body;
    }
    else
    {
        var index = message.body.indexOf( ' ', message.body.indexOf( ' ' ) + 1 );
        messageToChatGPT = message.body.substr( index + 1 );
    }

    // Define the JSON object to send in the POST request
    const postData = {
        message: messageToChatGPT
    };

    // Make a POST request to the API endpoint
    await axios.post(apiUrl, postData)
    .then(response => {
        // Extract the "message" field from the response data
        messageResponse = response.data.message;
        // console.log('Message:', messageResponse);
    })
    .catch(error => {
        // Handle any errors
        console.error('Error:', error);
    });

    return messageResponse;
}

module.exports = ChatGPT;