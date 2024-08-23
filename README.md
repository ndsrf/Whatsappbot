# Whatsappbot
WhatsppApp bot for our internal chat using wweb.js and n8n endpoints

## How to add whatsappbot to startup

The instructions below show how to add this node application to linux systemd startup.

First: add the contents below to a whatsappbot.service file inside the /lib/systemd/system folder:

```
[Unit]
Description=whatsappbot - El bot del foro
Documentation=https://github.com/ndsrf/Whatsappbot
After=network.target

[Service]
Environment=NODE_PORT=3000
Type=simple
User=whatsapp
ExecStart=/usr/bin/node .
Restart=on-failure
WorkingDirectory=/home/whatsapp/code/

[Install]
WantedBy=multi-user.target
```

To install you then to reload all the config first:

```
sudo systemctl daemon-reload
```

and then the following will start it:

```
sudo systemctl start whatsappbot
```

You can run the following to see status

```
sudo systemctl status whatsappbot
```

Once you are happy that it works, you add it to startup by running the following:

```
sudo systemctl enable whatsappbot
```
