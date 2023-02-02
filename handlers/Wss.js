import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { parse } from 'url';
import AppConfig from '../AppConfig.js';
import OtherService from '../services/OtherService.js';

export default class Wss {

  server = createServer();
  clientsChat = new Map();
  clientsSystem = new Map();
  usersOnline = {};

  cfg = (new AppConfig()).getConfig();

  setRestApi(rest) {
    this.restApi = rest;
  }

  setDBConnect(db) {
    this.db = db;
  }

  start() {

    const wssChat = new WebSocketServer({ noServer: true });
    const wssSystem = new WebSocketServer({ noServer: true });

      wssChat.on('connection', (ws) => {
        this.wssChatHandler(ws);
      });
        
      wssSystem.on('connection', (ws) => {
        this.wssSystemHandler(ws);
      });
        
      this.server.on('upgrade', function upgrade(request, socket, head) {
        const { pathname } = parse(request.url);
        if (pathname === '/chat') {
          wssChat.handleUpgrade(request, socket, head, function done(ws) {
            wssChat.emit('connection', ws, request);
          });
        } else if (pathname === '/system') {
          wssSystem.handleUpgrade(request, socket, head, function done(ws) {
            wssSystem.emit('connection', ws, request);
          });
        } else {
          socket.destroy();
        }
      });
         
      this.server.listen(this.cfg.wssPort);
      console.log("wss up port " + this.cfg.wssPort);

  }

  wssSystemHandler(ws) {
    const id = OtherService.generateUUID();
    const metadata = { id, userId: -1, type: 'system' };

    this.usersOnline[id] = -1;
  
    this.clientsSystem.set(ws, metadata);
    ws.on('message', async (messageAsString) => {
      const message = JSON.parse(messageAsString);
      const metadata = this.clientsSystem.get(ws);
      message.type = metadata.type;
      if (message.token) {
        const checkToken = await this.db.checkToken(message.token);
        if (checkToken && checkToken > 0) {
          this.usersOnline[id] = checkToken;
          for (let i = 0; i < this.db.userList.length; i++) {
            if (this.db.userList[i].id === checkToken) this.db.userList[i].isOnline = true;
          }
          message.sender = checkToken;
          delete(message.token);
          const outbound = JSON.stringify(message);
          this.wssSend(outbound, 'system');
        }
      }
    });
  
    ws.on("close", () => {
      this.clientsSystem.delete(ws);
      if (this.usersOnline[id]) {
        this.wssSend(JSON.stringify({msg: 'IamOffline', type: 'system', sender: this.usersOnline[id]}), 'system');
      }
      for (let i = 0; i < this.db.userList.length; i++) {
        if (this.db.userList[i].id === this.usersOnline[id]) this.db.userList[i].isOnline = false;
      }
      delete(this.usersOnline[id]);
    });
  }

  wssChatHandler(ws) {
    const id = OtherService.generateUUID();
    const metadata = { id, userId: -1, type: 'chat' };
  
    this.clientsChat.set(ws, metadata);
    ws.on('message', async (messageAsString) => {
      const message = JSON.parse(messageAsString);
      const metadata = this.clientsChat.get(ws);
      message.sender = metadata.id;
      message.type = metadata.type;
      if (message.token) {
        const checkToken = await this.db.checkToken(message.token);
        if (checkToken && checkToken > 0) {
          message.sender = checkToken;
          delete(message.token);
          const outbound = JSON.stringify(message);
          this.wssSend(outbound, 'chat');
        }
      }
    });
    ws.on("close", () => {
      this.clientsChat.delete(ws);
    });
  }

  wssSend(str, type = 'chat') {
    console.log(str);
    if (type === 'chat') {
      [...this.clientsChat.keys()].forEach((client) => {
        client.send(str);
      });
    } else if (type === 'system') {
      [...this.clientsSystem.keys()].forEach((client) => {
        client.send(str);
      });
    }
  }
}