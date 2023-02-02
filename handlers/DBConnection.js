import pg from 'pg';
import AppConfig from '../AppConfig.js';

export default class DBConnection {

    cfg = (new AppConfig).getConfig();

    userTokens = {};

    userList = [];

    channelList = [];

    async start() {
        const users = await this.makeQuery('SELECT u.id, u.login, u.email, u.created FROM users as u;');
        this.userList = users.rows;
        const userChannels = await this.makeQuery('SELECT c.user_id, c.channel_id FROM channelusers as c;');
        for (let i of this.userList) {
            i.channels = [];
            i.isOnline = false;
            for (let z of userChannels.rows) {
                if (z.user_id === i.id) i.channels.push(z.channel_id);
            }
        }
        console.log('users data cached...')
        const channels = await this.makeQuery('SELECT c.id, c.name, c.description FROM channels as c;');
        this.channelList = channels.rows;
        console.log('channels data cached...')
    }

    async makeQuery(str, values = []) {
            try {
                const client = new pg.Client({
                    user: this.cfg.postgresUser,
                    host: this.cfg.postgresPath,
                    database: this.cfg.postgresDB,
                    password: this.cfg.postgresPass,
                    port: this.cfg.postgresPort
                })
                
                await client.connect()
                const res = await client.query(str, values)
                await client.end();
                return res;

            } catch (error) {
                console.log('DB Connection ERROR');
                throw error;
            }
    }

    getChannels() {
        return this.channelList.sort((a, b) => (a.id > b.id) ? 1 : -1);
    }

    getUsers() {
        return this.userList.sort((a, b) => (a.id > b.id) ? 1 : -1);
    }

    async getUserByLoginPass(login, pass) {
        try {
            const res = await this.makeQuery('SELECT * FROM users as u where u.login = $1 and u.password = $2', [login, pass]);
            if (res.rows.length > 0 && res.rows[0].id) {
                const channels = await this.makeQuery('SELECT * FROM channelusers as ch where ch.user_id = $1;', [res.rows[0].id]);
                const channelIds = [];
                for (let i of channels.rows) {
                    channelIds.push(i.channel_id);
                }
                res.rows[0].channels = channelIds;
                return res.rows[0];
            }
            return null;
        } catch (error) {
            console.log('ERROR: ' + error.message);
        }
    }

    async getUserByLoginOrEmail(login, email) {
        try {
            const res = await this.makeQuery('SELECT * FROM users as u where u.login = $1 or u.email = $2', [login, email]);
            if (res.rows.length > 0 && res.rows[0].id) {
                return res.rows[0];
            }
            return null;
        } catch (error) {
            console.log('ERROR: ' + error.message);
        }
    }

    async generateToken(id, create = false) {
        const token = this.buildToken();
        try {
            let res;
            if (!create) {
                res = await this.makeQuery('UPDATE tokens SET token = $1 where user_id = $2', [token, id]);
            } else {
                res = await this.makeQuery('INSERT INTO tokens (user_id, token) VALUES ($1, $2)', [id, token]);
            }
            if (res) {
                for (const [key, value] of Object.entries(this.userTokens)) {
                  if (value === id) delete(this.userTokens[key]);
                }
                this.userTokens[token] = id;
                return token;
            }
            return null;
        } catch(error) {
            console.log('ERROR: ' + error.message);
        }
    }

    async createUser(login, pass, email) {
        try {
            const res = await this.makeQuery(`INSERT INTO users (login, password, email) VALUES ($1, $2, $3);`, [login, pass, email]);
            if (res) return res;
            return null;
        } catch(error) {
            console.log('ERROR: ' + error.message);
        }
    }

    async getMessages() {
        const res = await this.makeQuery('SELECT * FROM messages');
        return res.rows;
    }

    async getUserByToken(token) {
        try {
            const res = await this.makeQuery(`select u.id, u.login, u.password, u.created from tokens as t 
            inner join users as u on u.id = t.user_id
            where t.token = $1;`, [token]);
            if (res.rows.length > 0) return res.rows[0];
            return null;
        } catch(error) {
            console.log('ERROR: ' + error.message);
        }
    }

    buildToken(length = 32) {
            let result = '';
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            const charactersLength = characters.length;
            let counter = 0;
            while (counter < length) {
              result += characters.charAt(Math.floor(Math.random() * charactersLength));
              counter += 1;
            }
            return result;
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
}