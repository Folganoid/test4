import express from "express";
import AppConfig from "../AppConfig.js";
import cors from "cors";
import Routes from "../handlers/Routes.js";
import Logger from "./Logger.js";

export default class RestApi {
  app = express();
  appcfg = new AppConfig();
  cfg = this.appcfg.getConfig();
  logger = new Logger();

  setWss(wss) {
    this.wss = wss;
  }

  setDBConnect(db) {
    this.db = db;
  }

  routes = new Routes();

  start() {
    this.logger.newFile(this.cfg.httpLogFile);

    this.app.use(express.json());
    this.app.use(cors({ origin: "*" }));
    this.app.use(this.logger.saveLog);

    this.app.post("/login", async (req, res) => {
      try {
        this.routes.postLoginHandler(req, res, this.db);
      } catch (e) {
        res.status(500).send("Server error: " + e.message);
      }
    });

    this.app.post("/logout", async (req, res) => {
      try {
        this.routes.postLogOutHandler(req, res, this.db, this.wss);
      } catch (e) {
        res.status(500).send("Server error: " + e.message);
      }
    });

    this.app.post("/registration", async (req, res) => {
      try {
        this.routes.postRegistrationHandler(req, res, this.db, this.wss);
      } catch (e) {
        res.status(500).send("Server error: " + e.message);
      }
    });

    this.app.get("/auth", async (req, res) => {
      try {
        this.routes.getAuthHandler(req, res, this.db);
      } catch (e) {
        res.status(500).send("Server error: " + e.message);
      }
    });

    this.app.get("/users", (req, res) => {
      try {
        this.routes.getUsersHandler(req, res, this.db);
      } catch (e) {
        res.status(500).send("Server error: " + e.message);
      }
    });

    this.app.put("/user", (req, res) => {
      try {
        this.routes.putUsersHandler(req, res, this.db, this.wss);
      } catch (e) {
        res.status(500).send("Server error: " + e.message);
      }
    });

    this.app.get("/channels", async (req, res) => {
      try {
        this.routes.getChannelsHandler(req, res, this.db);
      } catch (e) {
        res.status(500).send("Server error: " + e.message);
      }
    });

    this.app.get("/messages", async (req, res) => {
      try {
        this.routes.getMessagesHandler(req, res, this.db);
      } catch (e) {
        res.status(500).send("Server error: " + e.message);
      }
    });

    this.app.post("/channel", async (req, res) => {
      try {
        this.routes.postChannelHandler(req, res, this.db, this.wss);
      } catch (e) {
        res.status(500).send("Server error: " + e.message);
      }
    });

    this.app.put("/channel/:id", async (req, res) => {
      try {
        this.routes.putChannelHandler(req, res, this.db, this.wss);
      } catch (e) {
        res.status(500).send("Server error: " + e.message);
      }
    });

    this.app.delete("/channel/:id", async (req, res) => {
      try {
        this.routes.deleteChannelHandler(req, res, this.db, this.wss);
      } catch (e) {
        res.status(500).send("Server error: " + e.message);
      }
    });

    this.app.post("/channel/subscribe/:id", async (req, res) => {
      try {
        this.routes.postChannelSubscribeHandler(req, res, this.db, this.wss);
      } catch (e) {
        res.status(500).send("Server error: " + e.message);
      }
    });

    this.app.post("/channel/unsubscribe/:id", async (req, res) => {
      try {
        this.routes.postChannelUnsubscribeHandler(req, res, this.db, this.wss);
      } catch (e) {
        res.status(500).send("Server error: " + e.message);
      }
    });

    this.app.listen(this.cfg.restApiPort, () => {
      console.log(`REST-API started. PORT:${this.cfg.restApiPort}...`);
    });
  }
}
