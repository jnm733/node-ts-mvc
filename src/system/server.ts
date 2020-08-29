import express = require('express');
import IConfiguration from "./config";
import cluster from "cluster";
import Mysql from "./mysql";

export default class Server {

    private static _instance: Server;
    public app: express.Application;
    public configuration: IConfiguration;
    public workers: any[];
    public primary: number;

    constructor( configuration: IConfiguration ) {
        this.configuration = configuration;
        this.app = express();
        this.workers = [];
        this.primary = 0;
    }

    static init(configuration: IConfiguration) {
        return this._instance || (this._instance = new this(configuration));
    }

    start() {

        if (cluster.isMaster) {

            for (let i = 0; i < this.configuration.num_workers; i++) {
                let worker = this.createWorker();
            }

            //Set primary worker
            this.setPrimaryWorker();

            cluster.on('exit', (worker:any, code:any, signal:any) => {
                console.log(`Worker ${worker.id} died with code: ${code} and signal: ${signal}`);

                // Delete worker from list
                let news = [];
                for (let i in this.workers) {
                    if (worker.id != this.workers[i].id)
                        news.push(this.workers[i]);
                }
                this.workers = news;

                // Create new node
                const node = this.createWorker();

                //If is primary worker, set again
                if (worker.id == this.primary)
                    this.setPrimaryWorker();
            });

        } else {

            process.on('message', (msg) => {
                if (msg.cmd) {
                    switch (msg.cmd) {
                        case 'primary':
                            this.primary = msg.primary;

                            //Load cron if is primary worker
                            if (cluster.worker.id == this.primary) {
                                require('../commands/cron');
                            }

                            break;
                    }
                }
            });

            this.app.listen(this.configuration.port, () => {
                this.app.use(express.static(this.configuration.public_path));

                //Init database
                Mysql.instance;

                console.log('(Worker ' + cluster.worker.id + ') Server running at port ' + this.configuration.port);

            }).on('error', (e) => {
                console.error('(Worker ' + cluster.worker.id + ") Error on server initialization: " + e);
            });

        }
    }

    private createWorker() {
        let worker = cluster.fork().on('online', () => {
            console.log("Online worker " + worker.id);
        }).on('error', () => {
            console.error("Error on worker " + worker.id);
        });

        this.workers.push(worker);

        return worker;
    }

    private setPrimaryWorker() {
        this.primary = this.workers[Math.floor(Math.random()*this.workers.length)].id;
        for (let i in this.workers) {
            let worker = this.workers[i];
            worker.send({ cmd: 'primary', primary: this.primary });
        }
        console.log("Set primary Worker " + this.primary);
    }
}