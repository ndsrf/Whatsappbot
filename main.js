const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const express = require('express');
const app = express();

var constants = require('./constants');

app.listen(3000, () => {
 console.log("Server running on port 3000, with n8n running in " + constants.N8N_SERVER + " and bot name " + constants.BOT_NAME);
});


app.get("/msg", (req, res, next) => {
 res.json({"message": "Hello, World!"});
});



// const client = new Client();

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
    webVersionCache: {
        type: "remote",
        remotePath:
          "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
      },
    });
    
    client.on('ready', () => {
        console.log('Client is ready!');
    });
    
    client.on('qr', qr => {
        qrcode.generate(qr, {small: true});
    });
    
    client.on('message', message => {
            if (message.body === '!ping') {
                    // send back "pong" to the chat the message was sent in
                    client.sendMessage(message.from, 'pong');
            }
    
            if (message.body === '!ayuda') {
                    client.sendMessage(message.from, 'Hola! soy ' + constants.BOT_NAME + ', el asistente del foro!');
            }
    });

client.initialize();