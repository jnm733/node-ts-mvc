
import Server from './system/server';
import Configuration from "./system/config";
import * as dotenv from 'dotenv';
import routerApi from './routes/api';
const bodyParser = require('body-parser');

//Loading .env file
dotenv.config();

//Init config
const configuration = Configuration.init();

//Init server
const server = Server.init(configuration);

//Init bodyparser
server.app.use(bodyParser.urlencoded({ extended: false }));
server.app.use(bodyParser.json());

//Set view engine
server.app.set('view engine', 'ejs');
server.app.set('views', __dirname + '/views');

//Loading routes
server.app.use(routerApi);

server.start();