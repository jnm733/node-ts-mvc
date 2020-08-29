
import path = require('path');
import * as dotenv from "dotenv";
import {getBoolean} from "../helpers/parser";
import os from "os";

interface IConfiguration {
    port: number;
    env: string;
    num_workers: number;
    base_api: string;
    static_server: boolean;
    public_path: string;
}

const default_config: IConfiguration = {
    port: 8000,
    env: 'development',
    num_workers: os.cpus().length,
    base_api: '/api/v1/',
    static_server: false,
    public_path: '../public',
};

export default class Configuration {

    private static _instance: Configuration;
    public port: number;
    public env: string;
    public num_workers: number;
    public base_api: string;
    public static_server: boolean;
    public public_path: string;

    constructor() {
        dotenv.config();

        this.port = process.env.PORT as any || default_config.port;
        this.env = process.env.NODE_ENV as any || default_config.env;
        this.num_workers = process.env.NUM_WORKERS as any || default_config.num_workers;
        this.base_api = process.env.BASE_API || default_config.base_api;
        this.static_server = getBoolean(process.env.STATIC_SERVER || default_config.static_server);
        this.public_path = process.env.PUBLIC_PATH || default_config.public_path;
        this.public_path = path.resolve(__dirname,this.public_path);
    }

    static init() {
        return this._instance || (this._instance = new this());
    }

}