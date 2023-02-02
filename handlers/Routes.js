export default class Routes {

  async getUsersHandler(req, res, db) {
    if (req && req.headers && req.headers.authorization) {
      const user = await db.getUserByToken(req.headers.authorization.replace('Bearer ', ''));
      if (user && user.id) {
        res.status(200).send(db.getUsers());  
      } else {
        res.status(401).send('Bad token');
      }
    } else {
      res.status(400).send('Bad request data');
    }
  }

  async getChannelsHandler(req, res, db) {
    if (req && req.headers && req.headers.authorization) {
      const user = await db.getUserByToken(req.headers.authorization.replace('Bearer ', ''));
      if (user && user.id) {
        res.status(200).send(db.getChannels());  
      } else {
        res.status(401).send('Bad token');
      }
    } else {
      res.status(400).send('Bad request data');
    }
  }

  async postLoginHandler(req, res, db) {
    if (req && req.body && req.body.login && req.body.pass) {
      const user = await db.getUserByLoginPass(req.body.login,req.body.pass);
      if (user && user.id) {
        const token = await db.newToken(user.id);
        if (token) {
          user.token = token;
          delete(user.password);
          res.status(200).send(user);
        } else {
          res.status(504).send('Can not set token for user ' + user.id);      
        }
      } else {
        res.status(401).send('Bad credentials');    
      }
    } else {
      res.status(400).send('Bad request data');  
    }
  }

  async postRegistrationHandler(req, res, db) {
    if (req && req.body && req.body.login && req.body.pass && req.body.email) {
      const user = await db.getUserByLoginOrEmail(req.body.login, req.body.email);
      if (user && user.id) {
        res.status(403).send('user with this login or email already exists');
      } else {
        const createUserResult = await db.createUser(req.body.login, req.body.pass, req.body.email);
        if (createUserResult && createUserResult.rowCount) {
          const user = await db.getUserByLoginPass(req.body.login,req.body.pass);
          if (user && user.id) {
            const token = await db.newToken(user.id, true);
            if (token) {
              db.userList.push({id: user.id, login: user.login, email: user.email, created: user.created, channels: []});
              user.token = token;
              delete(user.password);
              res.status(200).send(user);
            } else {
              res.status(504).send('Can not set token for user ' + user.id);      
            }
            
          } else {
            res.status(401).send('user not found');    
          }
        } else {
          res.status(504).send('Can not create user ' + req.body.login);      
        }
      }
    } else {
      res.status(400).send('Bad request data');  
    }
  }
}