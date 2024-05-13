const { Client, LocalAuth, MessageTypes } = require('whatsapp-web.js');

var constants = require('./constants');
const Transcribe = require('./transcribe');
const ChatGPT = require('./chatgpt');

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


app.listen(3000, () => {
    console.log("Server running on port 3000, with n8n running in " + constants.N8N_SERVER + " and bot name " + constants.BOT_NAME);
});


app.get("/msg", (req, res, next) => {
 res.json({"message": "Hello, World!"});
});


const client = new Client({
  authStrategy: new LocalAuth()
  ,
//   puppeteer: {
//         args: ['--no-sandbox', '--disable-setuid-sandbox'],
//     },
     webVersionCache: {
         type: "remote",
         remotePath:
           "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
       },
    });

agenda.define('send message', {priority: 'high', concurrency: 10}, (job, done) => {
    const {from, content} = job.attrs.data;
    client.sendMessage(from, 'Me pediste que te recordara: ' + content);
    done();
    });

agenda.define('good morning routine', {priority: 'high', concurrency: 10}, (job, done) => {
    const {from} = job.attrs.data;

    const apiUrl = constants.N8N_SERVER + constants.ENDPOINT_CHATGPT;
    const todayDate = new Date();
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    var messageToChatGPT = "Eres un robot y das los buenos dias por la manana temprano, citando un hecho curioso que ocurriera hoy, y dando energia y animos para el dia que empieza. Hoy es " + todayDate.toLocaleDateString('es-ES', options);

    // Define the JSON object to send in the POST request
    const postData = {
        message: messageToChatGPT
    };

    // Make a POST request to the API endpoint
    axios.post(apiUrl, postData)
    .then(response => {
        // Extract the "message" field from the response data
        const messageResponse = response.data.message;
        client.sendMessage(from, messageResponse);
        // console.log('Message:', messageResponse);
    })
    .catch(error => {
        // Handle any errors
        console.error('Error:', error);
    });

    done();

    job.repeatEvery('0 0 6 * * *', {
        skipImmediate: true
    });
   job.save();

    });    

client.on('ready', () => {
    console.log('Client is ready!');

    const goodMorningJob = agenda.create('good morning routine', {from: '120363292398230155@g.us'});
    goodMorningJob.save();
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('message', async(message) => {

    const theChat = await message.getChat();

    if (theChat.isGroup) {
        const mentions = await message.getMentions();

        for (let user of mentions) {
            if (user.isMe)
            {
                //client.sendMessage(message.from, 'Hola a ti también:' + message.body);
                var words = message.body.split(' ');
                if (words.length > 1) {

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
    
                                await agenda.schedule(comando, 'send message', {from: message.from, content: messageToChatGPT});
                                client.sendMessage(message.from, 'OK. Te lo recordaré en ' + comando);
                                break;
                            case "chatgpt":
                                const chatgptresponse = await ChatGPT(message);

                                if (quotedMessage) {
                                    quotedMessage.reply(chatgptresponse);
                                }
                                else
                                {
                                    message.reply(chatgptresponse);
                                }
                                
                                break;
    
                            case "ping":
                                var quotedMessage = await message.getQuotedMessage();
                                if (quotedMessage) {
                                    quotedMessage.reply('pong');
                                } 
                                else {
                                    client.sendMessage(message.from, 'pong');
                                }
                                break;

                            case "ayuda":
                                client.sendMessage(message.from, `Soy ` + constants.BOT_NAME + `, el asistente del foro.
    Solo hablo si me hablas. Por ahora, respondo a los comandos ping, ayuda, chatgpt [pregunta], recuerda [tiempo]].
    Ejemplos: "chatgpt de que color es el caballo blanco de Santiago?" O "recuerda saturday 11am". También me puedes mandar audios o mencionarme en audios.`);
                                break;
    
                        }
                    } 
                    else {
                        var quotedMessage = await message.getQuotedMessage();
                        if (quotedMessage.type.includes(MessageTypes.AUDIO) || quotedMessage.type.includes(MessageTypes.VOICE)) {
            
                            const transcription = await Transcribe(quotedMessage);
                            quotedMessage.reply(transcription);
                
                        }
                
                    }
            }
        }
    
    }
    else {
        if (message.type.includes(MessageTypes.AUDIO) || message.type.includes(MessageTypes.VOICE)) {
            
            const transcription = await Transcribe(message);
            client.sendMessage(message.from, transcription);

            }
    }

});


client.initialize();

(async function() {
    await agenda.start();
    const numRemoved = agenda.cancel({ name: 'good morning routine' });
  })();

