import express from 'express';
import AppConfig from '../AppConfig.js';

export default class RestApi {

    app = express();
    cfg = (new AppConfig()).getConfig();

    setWss(wss) {
      this.wss = wss;
    }

    setDBConnect(db) {
      this.db = db;
    }

    start() {
      
      this.app.use(express.json())

      this.app.post('/login', async(req, res) => {
        try {
          if (req && req.body && req.body.login && req.body.pass) {

            const user = await this.db.getUserByLoginPass(req.body.login,req.body.pass);
            if (user && user.id) {
              const token = await this.db.generateToken(user.id);
              if (token) {
                user.token = token;
                delete(user.password);
                res.status(200).send(user);
              } else {
                res.status(504).send('Can not set token for user ' + user.id);      
              }
              
            } else {
              res.status(404).send('user not found');    
            }

          } else {
            res.status(404).send('Bad request data');  
          }
        } catch(e) {
          res.status(504).send('Server error: ' + e.message);
        }
      });

      this.app.post('/registration', async (req, res) => {
        try {
          if (req && req.body && req.body.login && req.body.pass && req.body.email) {

            const user = await this.db.getUserByLoginOrEmail(req.body.login, req.body.email);
            if (user && user.id) {
              res.status(404).send('user with this login or email already exists');
            } else {
              const result = await this.db.createUser(req.body.login, req.body.pass, req.body.email);
              if (result && result.rowCount) {
                const user = await this.db.getUserByLoginPass(req.body.login,req.body.pass);
                if (user && user.id) {
                  const token = await this.db.generateToken(user.id, true);
                  if (token) {
                    this.db.userList.push({id: user.id, login: user.login, email: user.email, created: user.created, channels: []});
                    user.token = token;
                    delete(user.password);
                    res.status(200).send(user);
                  } else {
                    res.status(504).send('Can not set token for user ' + user.id);      
                  }
                  
                } else {
                  res.status(404).send('user not found');    
                }
              } else {
                res.status(504).send('Can not create user ' + req.body.login);      
              }
            }
          } else {
            res.status(404).send('Bad request data');  
          }
        } catch(e) {
          res.status(504).send('Server error: ' + e.message);
        }
      });

      this.app.get('/users', async (req, res) => {
        try {
          if (req && req.headers && req.headers.authorization) {
            const user = await this.db.getUserByToken(req.headers.authorization.replace('Bearer ', ''));
            if (user && user.id) {
              res.status(200).send(this.db.getUsers());  
            } else {
              res.status(403).send('Bad auth');
            }
          } else {
            res.status(404).send('Bad data');
          }
        } catch(e) {
          res.status(504).send('Server error: ' + e.message);
        }
      });

      this.app.get('/channels', async (req, res) => {
        try {
          if (req && req.headers && req.headers.authorization) {
            const user = await this.db.getUserByToken(req.headers.authorization.replace('Bearer ', ''));
            if (user && user.id) {
              res.status(200).send(this.db.getChannels());  
            } else {
              res.status(403).send('Bad auth');
            }
          } else {
            res.status(404).send('Bad data');
          }
        } catch(e) {
          res.status(504).send('Server error: ' + e.message);
        }
      });


      this.app.listen(this.cfg.restApiPort , () => {
        console.log(`REST up port ${this.cfg.restApiPort}`);
      });
    }
}

