const { Client, LocalAuth, MessageTypes } = require('whatsapp-web.js');

var constants = require('./constants');
const TranscribeLib = require('./transcribe');
const ChatGPT = require('./chatgpt');
const url = require("url");

const qrcode = require('qrcode-terminal');

const express = require('express');
const app = express();

const axios = require('axios');

const Agenda = require('agenda');
const { now } = require('agenda/dist/agenda/now');

const connectionString = 'mongodb://127.0.0.1/wbagenda';

var restartGoodMorningRoutine = false;

if (process.argv[2] && process.argv[2] === '-rgm') {
    restartGoodMorningRoutine = true;
}



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

function buenosDias(){
    const apiUrl = constants.N8N_SERVER + constants.ENDPOINT_GOODMORNING;

    var currentDate = new Date();
    var cumpleDe = null;
    var queryParams = null; 

    const todayDay = currentDate.getDate();
    switch (currentDate.getMonth())
    {
        case 4: 
            switch (todayDay) {
                case 24: cumpleDe = "Nestor"; break;
            }
    }

    if (cumpleDe) {
        queryParams = {
            cumple: cumpleDe
        };    
    }

    // Make a POST request to the API endpoint
    return axios.get(apiUrl, { params: queryParams })
    .then(response => {
        // Extract the "message" field from the response data
        const messageResponse = response.data.message;
        // console.log('Message:', messageResponse);
        return messageResponse;
    })
    .catch(error => {
        // Handle any errors
        console.error('Error:', error);
    });

}

agenda.define(constants.AGENDA_GOODMORNINGROUTINE, {priority: 'high', concurrency: 10}, (job, done) => {
    const {from} = job.attrs.data;

    buenosDias().then(msg => { 
        client.sendMessage(from, msg) 
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

    if (restartGoodMorningRoutine) {
        const goodMorningJob = agenda.create(constants.AGENDA_GOODMORNINGROUTINE, {from: constants.WHATSAPP_MAINGROUPID});
        goodMorningJob.save();    
    }
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
                        if (quotedMessage.type.includes(MessageTypes.IMAGE) || quotedMessage.type.includes(MessageTypes.AUDIO) || quotedMessage.type.includes(MessageTypes.VOICE)) {
            
                            const transcription = await TranscribeLib.Transcribe(quotedMessage);
                            quotedMessage.reply(transcription);
                
                        } else if (quotedMessage.type.includes(MessageTypes.TEXT)) {
                            var urls = quotedMessage.body.match(/\bhttps?:\/\/\S+/gi);
                            if (urls.length > 0) {
                                const transcription = await  TranscribeLib.ResumeURL(urls[0]);
                                quotedMessage.reply(transcription);        
                            }
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

//  buenosDias().then(msg => { 
//      client.sendMessage('120363292398230155@g.us', msg) 
//  });

(async function() {
    await agenda.start();
    if (restartGoodMorningRoutine) {
        const numRemoved = agenda.cancel({ name: constants.AGENDA_GOODMORNINGROUTINE });
    }
  })();

