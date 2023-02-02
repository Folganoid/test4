import RestApi from './services/RestApi.js';
import Wss from './handlers/Wss.js';
import DBService from './services/DBService.js';

const dbConnect = new DBService();
dbConnect.start();

const wss = new Wss();
wss.start();
wss.setDBConnect(dbConnect);

const restApi = new RestApi();
restApi.start();
restApi.setWss(wss);
restApi.setDBConnect(dbConnect);
