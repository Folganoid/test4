import express from 'express';
import AppConfig from '../AppConfig.js';
import cors from 'cors';
import Routes from '../handlers/Routes.js';

export default class RestApi {

    app = express();
    cfg = (new AppConfig()).getConfig();

    setWss(wss) {
      this.wss = wss;
    }

    setDBConnect(db) {
      this.db = db;
    }

    routes = new Routes();

    start() {
      
      this.app.use(express.json());
      this.app.use(cors({origin: '*'}));

      this.app.post('/login', async(req, res) => {
        try {
          this.routes.postLoginHandler(req, res, this.db);
        } catch(e) {
          res.status(504).send('Server error: ' + e.message);
        }
      });

      this.app.post('/registration', async (req, res) => {
        try {
          this.routes.postRegistrationHandler(req, res, this.db);
        } catch(e) {
          res.status(504).send('Server error: ' + e.message);
        }
      });

      this.app.get('/users', (req, res) => {
        try {
          this.routes.getUsersHandler(req, res, this.db);
        } catch(e) {
          res.status(504).send('Server error: ' + e.message);
        }
      });

      this.app.get('/channels', async (req, res) => {
        try {
          this.routes.getChannelsHandler(req, res, this.db);
        } catch(e) {
          res.status(504).send('Server error: ' + e.message);
        }
      });


      this.app.listen(this.cfg.restApiPort , () => {
        console.log(`REST up port ${this.cfg.restApiPort}`);
      });
    }
}

