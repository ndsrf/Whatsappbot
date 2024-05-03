const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const express = require('express');
const app = express();

const axios = require('axios');

const Agenda = require('agenda');

const connectionString = 'mongodb://127.0.0.1/wbagenda';

const agenda = new Agenda({
    db: {address: connectionString, collection: 'ourScheduleCollectionName'},
    processEvery: '5 seconds'
});


var constants = require('./constants');

app.listen(3000, () => {
 console.log("Server running on port 3000, with n8n running in " + constants.N8N_SERVER + " and bot name " + constants.BOT_NAME);
});


app.get("/msg", (req, res, next) => {
 res.json({"message": "Hello, World!"});
});


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

    agenda.define('send message', {priority: 'high', concurrency: 10}, (job, done) => {
        const {from, content} = job.attrs.data;
        client.sendMessage(from, 'Me pediste que te recordara: ' + content);
      });
    
    
    client.on('ready', () => {
        console.log('Client is ready!');
    });
    
    client.on('qr', qr => {
        qrcode.generate(qr, {small: true});
    });
    
    client.on('message', async(message) => {

        const mentions = await message.getMentions();

        for (let user of mentions) {
            if (user.isMe)
            {
                //client.sendMessage(message.from, 'Hola a ti también:' + message.body);
                var words = message.body.split(' ');
                if (words.length > 1)
                    {
                        switch (words[1])
                        {
                            case "recuerda":
                                var quotedMessage = await message.getQuotedMessage();
                                if (quotedMessage === undefined)
                                {
                                    client.sendMessage(message.from, 'Tienes que reenviarme un mensaje para que yo lo recuerde');
                                }
                                else
                                {
                                    messageToChatGPT = quotedMessage.body;
                                }
                                var index = message.body.indexOf( ' ', message.body.indexOf( ' ' ) + 1 );
                                var comando = message.body.substr( index + 1 );
                                comando = comando.replace("segundo", "second");
                                comando = comando.replace("minuto", "minute");
                                comando = comando.replace("hora", "hour");
                                comando = comando.replace("dia", "day");
                                comando = comando.replace("meses", "months");
                                comando = comando.replace("año", "year");

                                await agenda.schedule(comando, 'send message', {from: message.from, content: messageToChatGPT});
                                client.sendMessage(message.from, 'OK. Te lo recordaré en ' + comando);
                                break;
                            case "chatgpt":
                                // Define the URL of the REST API endpoint
                                const apiUrl = constants.N8N_SERVER + constants.ENDPOINT_CHATGPT;
                                var messageToChatGPT = "";
                                var quotedMessage = await message.getQuotedMessage();
                                if (quotedMessage === undefined)
                                {
                                    var index = message.body.indexOf( ' ', message.body.indexOf( ' ' ) + 1 );
                                    messageToChatGPT = message.body.substr( index + 1 );
                                }
                                else
                                {
                                    messageToChatGPT = quotedMessage.body;
                                }


                                // Define the JSON object to send in the POST request
                                const postData = {
                                    message: messageToChatGPT
                                };

                                // Make a POST request to the API endpoint
                                axios.post(apiUrl, postData)
                                .then(response => {
                                    // Extract the "message" field from the response data
                                    const messageResponse = response.data.message;
                                    client.sendMessage(message.from, messageResponse);
                                    console.log('Message:', messageResponse);
                                })
                                .catch(error => {
                                    // Handle any errors
                                    console.error('Error:', error);
                                });
                                break;

                            case "ping": 
                                client.sendMessage(message.from, 'pong');
                                break;

                            case "ayuda":
                                client.sendMessage(message.from, `Soy ` + constants.BOT_NAME + `, el asistente del foro.
Solo hablo si me hablas. Por ahora, respondo a los comandos ping, ayuda, chatgpt [pregunta], recuerda [tiempo]].
Ejemplos: "chatgpt de que color es el caballo blanco de Santiago?" O "recuerda 10 segundos"`);
                                break;

                        }
                    } 
            }
        }
    });


client.initialize();

(async function() {
    await agenda.start();
  })();

