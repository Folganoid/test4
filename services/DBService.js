import pg from "pg";
import AppConfig from "../AppConfig.js";
import OtherService from "../services/OtherService.js";
import Bcrypt from "bcryptjs";

export default class DBService {
  appcfg = new AppConfig();
  cfg = this.appcfg.getConfig();
  userTokens = {};
  userList = [];
  channelList = [];
  messageList = [];

  async start() {
    const users = await this.makeQuery(
      "SELECT u.id, u.login, u.email, u.created, u.image FROM users as u;"
    );
    this.userList = users.rows;
    const userChannels = await this.makeQuery(
      "SELECT c.user_id, c.channel_id FROM channelusers as c;"
    );
    for (let i of this.userList) {
      i.channels = [];
      i.isOnline = false;
      for (let z of userChannels.rows) {
        if (z.user_id === i.id) i.channels.push(z.channel_id);
      }
    }
    console.log(this.userList.length + " Users data cached OK...");

    const messages = await this.makeQuery(
      "SELECT * FROM messages ORDER BY created DESC LIMIT $1;",
      [this.cfg.fetchMessagesLimitInStart]
    );
    this.messageList = messages.rows.sort((a, b) =>
      a.create > b.create ? 1 : -1
    );
    console.log(this.messageList.length + " Messages data cached OK...");

    const channels = await this.makeQuery(
      "SELECT c.id, c.name, c.description, c.owner_user_id FROM channels as c;"
    );
    this.channelList = channels.rows;
    console.log(this.channelList.length + " Channels data cached OK...");
  }

  async makeQuery(str, values = []) {
    try {
      const client = new pg.Client({
        user: this.cfg.postgresUser,
        host: this.cfg.postgresPath,
        database: this.cfg.postgresDB,
        password: this.cfg.postgresPass,
        port: this.cfg.postgresPort,
        ssl: true,
      });

      await client.connect();
      const res = await client.query(str, values);
      await client.end();
      return res;
    } catch (error) {
      console.log("DB Connection ERROR");
      throw error;
    }
  }

  async makeMultipleQuery(queries) {
    try {
      const client = new pg.Client({
        user: this.cfg.postgresUser,
        host: this.cfg.postgresPath,
        database: this.cfg.postgresDB,
        password: this.cfg.postgresPass,
        port: this.cfg.postgresPort,
        ssl: true,
      });

      let res = [];
      await client.connect();
      for (let i of queries) {
        let r = await client.query(i.sql, i.params);
        res.push(r);
      }
      await client.end();
      return res;
    } catch (error) {
      console.log("DB Connection ERROR");
      throw error;
    }
  }

  getChannels() {
    return this.channelList.sort((a, b) => (a.id > b.id ? 1 : -1));
  }

  getUsers() {
    return this.userList.sort((a, b) => (a.id > b.id ? 1 : -1));
  }

  getMessages(ids = []) {
    return this.messageList.filter((e) => ids.includes(String(e.channel_id)));
  }

  async createChannel(user_id, name, desc) {
    try {
      for (let i of this.channelList) {
        if (i.name === name) return -1;
      }
      const res = await this.makeQuery(
        "INSERT INTO channels (name, description, owner_user_id) VALUES ($1, $2, $3)",
        [name, desc, user_id]
      );
      if (res) {
        const channel = await this.getChannelByName(name);
        if (channel && channel.id) {
          this.channelList.push(channel);
          await this.makeQuery(
            "INSERT INTO channelusers (user_id, channel_id) VALUES ($1, $2)",
            [user_id, channel.id]
          );
          for (let i = 0; i < this.userList.length; i++) {
            if (+this.userList[i].id === +user_id) {
              this.userList[i].channels.push(channel.id);
            }
          }
          return channel;
        }
        return 0;
      } else {
        return 0;
      }
    } catch (error) {
      console.log("ERROR: " + error.message);
      return 0;
    }
  }

  async updateChannel(id, name = "", desc = "") {
    try {
      for (let i of this.channelList) {
        if (i.name === name) return -1;
      }

      if (name !== "") {
        const res = await this.makeQuery(
          "UPDATE channels SET name = $1 WHERE id = $2",
          [name, id]
        );
        if (res) {
          for (let i = 0; i < this.channelList.length; i++) {
            if (this.channelList[i].id === id) this.channelList[i].name = name;
          }
        }
      }
      if (desc !== "") {
        const res2 = await this.makeQuery(
          "UPDATE channels SET description = $1 WHERE id = $2",
          [desc, id]
        );
        if (res2) {
          for (let i = 0; i < this.channelList.length; i++) {
            if (this.channelList[i].id === id) {
              this.channelList[i].description = desc;
            }
          }
        }
      }
      return this.getChannelById(id);
    } catch (error) {
      console.log("ERROR: " + error.message);
      return 0;
    }
  }

  async deleteChannel(id) {
    try {
      await this.makeQuery("DELETE FROM channelusers WHERE channel_id = $1", [
        id,
      ]);
      await this.makeQuery("DELETE FROM channels WHERE id = $1", [id]);
      this.channelList = this.channelList.filter((e) => e.id !== id);
      for (let i = 0; i < this.userList.length; i++) {
        this.userList[i].channels = this.userList[i].channels.filter(
          (e) => e !== id
        );
      }
    } catch (error) {
      console.log("ERROR: " + error.message);
      return 0;
    }
  }

  async getChannelByName(name) {
    try {
      const res = await this.makeQuery(
        "SELECT * FROM channels WHERE name = $1",
        [name]
      );
      if (res.rows.length > 0 && res.rows[0].id) {
        return res.rows[0];
      }
      return null;
    } catch (error) {
      console.log("ERROR: " + error.message);
      return null;
    }
  }

  async getChannelById(id) {
    try {
      const res = await this.makeQuery("SELECT * FROM channels WHERE id = $1", [
        id,
      ]);
      if (res.rows.length > 0 && res.rows[0].id) {
        return res.rows[0];
      }
      return null;
    } catch (error) {
      console.log("ERROR: " + error.message);
      return null;
    }
  }

  async getUserByLoginPass(login, pass) {
    try {
      const res = await this.makeQuery(
        "SELECT * FROM users as u where u.login = $1",
        [login]
      );
      if (res.rows.length > 0 && res.rows[0].id) {
        if (Bcrypt.compareSync(pass, res.rows[0].password)) {
          const channels = await this.makeQuery(
            "SELECT * FROM channelusers as ch WHERE ch.user_id = $1;",
            [res.rows[0].id]
          );
          const channelIds = [];
          for (let i of channels.rows) {
            channelIds.push(i.channel_id);
          }
          res.rows[0].channels = channelIds;
          return res.rows[0];
        }
        return null;
      }
      return null;
    } catch (error) {
      console.log("ERROR: " + error.message);
      return null;
    }
  }

  async getUserByLoginOrEmail(login, email) {
    try {
      const res = await this.makeQuery(
        "SELECT * FROM users as u WHERE u.login = $1 or u.email = $2",
        [login, email]
      );
      if (res.rows.length > 0 && res.rows[0].id) {
        return res.rows[0];
      }
      return null;
    } catch (error) {
      console.log("ERROR: " + error.message);
      return null;
    }
  }

  async newToken(id, create = false) {
    const token = OtherService.generateToken();
    try {
      let res;
      if (!create) {
        res = await this.makeQuery(
          "UPDATE tokens SET token = $1 where user_id = $2",
          [token, id]
        );
      } else {
        res = await this.makeQuery(
          "INSERT INTO tokens (user_id, token) VALUES ($1, $2)",
          [id, token]
        );
      }
      if (res) {
        for (const [key, value] of Object.entries(this.userTokens)) {
          if (value === id) delete this.userTokens[key];
        }
        this.userTokens[token] = id;
        return token;
      }
      return null;
    } catch (error) {
      console.log("ERROR: " + error.message);
      return null;
    }
  }

  async createUser(login, pass, email, image = null) {
    try {
      const salt = await Bcrypt.genSaltSync(10);
      const hash = await Bcrypt.hashSync(pass, salt);
      const res = await this.makeQuery(
        "INSERT INTO users (login, password, email, image) VALUES ($1, $2, $3, $4);",
        [login, hash, email, image]
      );
      if (res) return res;
      return null;
    } catch (error) {
      console.log("ERROR: " + error.message);
      return null;
    }
  }

  async updateUser(id, pass = "", image = "") {
    try {
      let res;
      if (pass === "" && image !== "") {
        res = await this.makeQuery(
          "UPDATE users SET image = $1 where id = $2",
          [image, id]
        );
      }
      if (pass !== "" && image === "") {
        const salt = await Bcrypt.genSaltSync(10);
        const hash = await Bcrypt.hashSync(pass, salt);
        res = await this.makeQuery(
          "UPDATE users SET password = $1 where id = $2",
          [hash, id]
        );
      }
      if (pass !== "" && image !== "") {
        const salt = await Bcrypt.genSaltSync(10);
        const hash = await Bcrypt.hashSync(pass, salt);
        res = await this.makeQuery(
          "UPDATE users SET password = $1, image = $2 where id = $3",
          [hash, image, id]
        );
      }

      if (res) {
        for (let i = 0; i < this.userList.length; i++) {
          if (this.userList[i].id === id) {
            if (image !== "") this.userList[i].image = image;
            return this.userList[i];
          }
        }
        return null;
      } else {
        return null;
      }
    } catch (error) {
      console.log("ERROR: " + error.message);
      return null;
    }
  }

  async getUserByToken(token) {
    try {
      const res = await this.makeQuery(
        `SELECT u.id, u.login, u.password, u.created
        FROM tokens as t 
        INNER JOIN users as u on u.id = t.user_id
        WHERE t.token = $1;`,
        [token]
      );
      if (res.rows.length > 0) return res.rows[0];
      return null;
    } catch (error) {
      console.log("ERROR: " + error.message);
      return null;
    }
  }

  async checkToken(token) {
    if (this.userTokens[token]) {
      return this.userTokens[token];
    }
    const checkUser = await this.getUserByToken(token);
    if (checkUser && checkUser.id) {
      this.userTokens[token] = checkUser.id;
    } else {
      this.userTokens[token] = -1;
    }
    return this.userTokens[token];
  }

  async subscribeToChannel(userId, chanId) {
    try {
      for (let i = 0; i < this.userList.length; i++) {
        if (+this.userList[i].id === +userId) {
          if (!this.userList[i].channels.includes(chanId)) {
            await this.makeQuery(
              "INSERT INTO channelusers (user_id, channel_id) VALUES ($1, $2)",
              [userId, chanId]
            );
            this.userList[i].channels.push(chanId);
            return this.userList[i];
          } else {
            return this.userList[i];
          }
        }
      }
      return 0;
    } catch (error) {
      console.log("ERROR: " + error.message);
      return 0;
    }
  }

  async unsubscribeFromChannel(userId, chanId) {
    try {
      for (let i = 0; i < this.userList.length; i++) {
        if (+this.userList[i].id === +userId) {
          await this.makeQuery(
            "DELETE FROM channelusers WHERE user_id = $1 AND channel_id = $2",
            [userId, chanId]
          );
          this.userList[i].channels = this.userList[i].channels.filter(
            (e) => e !== chanId
          );
          return this.userList[i];
        }
      }
      return 0;
    } catch (error) {
      console.log("ERROR: " + error.message);
      return 0;
    }
  }

  getUserFromUserListById(id) {
    for (let i of this.userList) {
      if (+i.id === +id) return i;
    }
    return null;
  }

  getChannelFromChannelListById(id) {
    for (let i of this.channelList) {
      if (+i.id === +id) return i;
    }
    return null;
  }
}
