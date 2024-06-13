const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const connections = new Map();

wss.on('connection', (ws) => {
    const id = uuidv4();
    connections.set(id, ws);
    console.log(`Connected clients = ${connections.size}`);

    ws.on('message', (message) => {
        console.log(`Received: ${message}`);
        connections.forEach((client, clientId) => {
            if (clientId !== id && client.readyState === WebSocket.OPEN) {
                console.log(`Sending to: ${clientId}`);
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        connections.delete(id);
        console.log(`Client disconnected, Connected clients = ${connections.size}`);
    });
});

server.listen(8080, () => {
    console.log('Server is listening on port 8080');
});
