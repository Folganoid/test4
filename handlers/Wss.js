import { WebSocketServer } from "ws";
import { createServer } from "http";
import { parse } from "url";
import AppConfig from "../AppConfig.js";
import OtherService from "../services/OtherService.js";

export default class Wss {
  server = createServer();
  clientsChat = new Map();
  clientsSystem = new Map();
  usersOnline = {};

  messagesBuffer = [];

  appcfg = new AppConfig();
  cfg = this.appcfg.getConfig();

  setRestApi(rest) {
    this.restApi = rest;
  }

  setDBConnect(db) {
    this.db = db;
  }

  start() {
    const wssChat = new WebSocketServer({ noServer: true });
    const wssSystem = new WebSocketServer({ noServer: true });

    wssChat.on("connection", (ws) => {
      this.wssChatHandler(ws);
    });

    wssSystem.on("connection", (ws) => {
      this.wssSystemHandler(ws);
    });

    this.server.on("upgrade", function upgrade(request, socket, head) {
      const { pathname } = parse(request.url);
      if (pathname === "/chat") {
        wssChat.handleUpgrade(request, socket, head, function done(ws) {
          wssChat.emit("connection", ws, request);
        });
      } else if (pathname === "/system") {
        wssSystem.handleUpgrade(request, socket, head, function done(ws) {
          wssSystem.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    this.server.listen(this.cfg.wssPort);
    console.log("WSS service started. PORT:" + this.cfg.wssPort + "...");

    setInterval(() => {
      this.sendMessageFromBuffer();
    }, 5000);
    console.log("Message saver started OK...");
  }

  wssSystemHandler(ws) {
    const id = OtherService.generateUUID();
    const metadata = { id, userId: -1, type: "system" };

    this.usersOnline[id] = -1;

    this.clientsSystem.set(ws, metadata);
    ws.on("message", async (messageAsString) => {
      const message = JSON.parse(messageAsString);
      const metadata = this.clientsSystem.get(ws);
      message.type = metadata.type;
      if (message.token) {
        const checkToken = await this.db.checkToken(message.token);
        if (checkToken && checkToken > 0) {
          this.usersOnline[id] = checkToken;
          for (let i = 0; i < this.db.userList.length; i++) {
            if (this.db.userList[i].id === checkToken) {
              this.db.userList[i].isOnline = true;
            }
          }
          delete message.token;
          if (message.msg.length > this.cfg.messageLength) {
            message.msg = message.msg.substring(0, this.cfg.messageLength);
          }
          const outbound = JSON.stringify(message);
          this.wssSend(outbound, "system");
        }
      }
    });

    ws.on("close", () => {
      this.clientsSystem.delete(ws);
      if (this.usersOnline[id] && this.usersOnline[id] > 0) {
        this.wssSend(
          JSON.stringify({
            msg: "IamOffline",
            type: "system",
            sender: this.usersOnline[id],
          }),
          "system"
        );
      }
      for (let i = 0; i < this.db.userList.length; i++) {
        if (this.db.userList[i].id === this.usersOnline[id]) {
          this.db.userList[i].isOnline = false;
        }
      }
      delete this.usersOnline[id];
    });
  }

  wssChatHandler(ws) {
    const id = OtherService.generateUUID();
    const metadata = { id, userId: -1, type: "chat" };

    this.clientsChat.set(ws, metadata);
    ws.on("message", async (messageAsString) => {
      const message = JSON.parse(messageAsString);
      const metadata = this.clientsChat.get(ws);
      const time = new Date().toUTCString();
      message.sender = metadata.id;
      message.type = metadata.type;
      message.created = new Date(time).toJSON();
      if (message.token) {
        const checkToken = await this.db.checkToken(message.token);
        if (checkToken && checkToken > 0) {
          message.sender = checkToken;
          delete message.token;
          if (message.msg.length > this.cfg.messageLength) {
            message.msg = message.msg.substring(0, this.cfg.messageLength);
          }
          this.buildMessage(checkToken, message.channel, message.msg, time);
          const outbound = JSON.stringify(message);
          this.wssSend(outbound, "chat");
        }
      }
    });
    ws.on("close", () => {
      this.clientsChat.delete(ws);
    });
  }

  wssSend(str, type = "chat") {
    console.log(str);
    if (type === "chat") {
      [...this.clientsChat.keys()].forEach((client) => {
        client.send(str);
      });
    } else if (type === "system") {
      [...this.clientsSystem.keys()].forEach((client) => {
        client.send(str);
      });
    }
  }

  buildMessage(userId, chanId, msg, time) {
    if (!userId || !chanId || !msg) return null;

    const user = this.db.getUserFromUserListById(userId);
    const chan = this.db.getChannelFromChannelListById(chanId);
    if (!user || !chan || !msg) return null;

    const data = {
      login: user.login,
      channel_id: chan.id,
      msg: msg,
      created: time,
    };
    this.messagesBuffer.push(data);
    data.created = new Date(time).toJSON();
    this.db.messageList.push(data);
  }

  async sendMessageFromBuffer() {
    if (this.messagesBuffer.length > 0) {
      const queries = [];
      for (let i of this.messagesBuffer) {
        const sql = `INSERT INTO messages (login, channel_id, msg, created) VALUES ($1, $2, $3, $4);`;
        const params = [i.login, i.channel_id, i.msg, i.created];
        queries.push({ sql: sql, params: params });
      }
      this.db.makeMultipleQuery(queries);
      console.log(
        this.messagesBuffer.length + " Messages from buffer saved to DB OK..."
      );
      this.messagesBuffer = [];
    }
  }
}
