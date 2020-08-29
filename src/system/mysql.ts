

import mysql = require('mysql');
import {ConnectionConfig, FieldInfo, MysqlError, OkPacket, PoolConfig, PoolConnection} from "mysql";
import {IParamsQuery} from "../models/model";
import {getBoolean} from "../helpers/parser";
import Configuration from "./config";
import cluster from "cluster";


export interface IListQueryResult<T> {
    total_rows: number,
    total_filtered_rows: number,
    rows: T[]
}

enum IConnectionsModes {
    "POOL" = 1,
    "SINGLE" = 2
}

export default class Mysql {

    private static _instance: Mysql;
    mode: IConnectionsModes;
    connection: mysql.Connection | mysql.Pool;
    configuration: Configuration;

    constructor() {
        this.configuration = Configuration.init();

        let db_pool = getBoolean(process.env.DB_POOL);
        this.mode = (db_pool) ? IConnectionsModes.POOL : IConnectionsModes.SINGLE;

        if (this.mode == IConnectionsModes.SINGLE) {
            let connectionUri: ConnectionConfig = {
                host     : process.env.DB_HOST as string,
                user     : process.env.DB_USER as string,
                password : process.env.DB_PASSWORD as string,
                database : process.env.DB_NAME as string
            };

            this.connection = mysql.createConnection(connectionUri);

        } else {
            let connectionUri: PoolConfig = {
                host     : process.env.DB_HOST as string,
                user     : process.env.DB_USER as string,
                password : process.env.DB_PASSWORD as string,
                database : process.env.DB_NAME as string,
                connectionLimit : process.env.DB_CONNECTION_LIMIT as any || 10
            };

            this.connection = mysql.createPool(connectionUri);
        }

        this.connectDB();
    }

    public static get instance() {
        return this._instance || (this._instance = new this());
    }

    public static async executeRawQuery(query: string, params?: {[key: string]: any}) {

        return new Promise<any>((resolve, reject) => {

            this.instance.connection.query(query, params, (err: MysqlError | null, result: Object[] | OkPacket, fields: FieldInfo[] | undefined) => {

                if (err) {
                    console.error('Error on query: ' + err);
                    reject(err);
                } else {
                    resolve(result);
                }

            });

        });

    }

    public static async executeListQuery(db_table: string, paramsQuery: IParamsQuery, callback: Function) {

        try {

            //Where conditions
            let where = paramsQuery.where || {};
            let whereQuery = '';
            for (let key in where) {
                if (whereQuery == '')
                    whereQuery += ' WHERE ';
                else
                    whereQuery += ' AND '
                whereQuery += ' '+key+' = "'+where[key] + '"';
            }

            //Get count
            let query = "SELECT COUNT(*) as count FROM "+db_table+whereQuery;
            let result = await this.executeRawQuery(query);

            let total_rows: number = result[0].count;

            //Filters conditions
            let filters = paramsQuery.filters || {};
            let filter_operator = '';
            for (let key in filters) {
                if (whereQuery == '')
                    whereQuery += ' WHERE ';
                else
                    whereQuery += ' AND '
                filter_operator = (filters[key].charAt(0) == '%' || filters[key].slice(-1) == '%') ? 'LIKE' : '=';
                whereQuery += ' '+key+' '+filter_operator+' "'+filters[key] + '"';
            }
            //Fields select
            let fields = "*";
            if (paramsQuery.fields) {
                fields = "";
                for (let key in paramsQuery.fields) {
                    if (Number(key) > 0)
                        fields += ', ';
                    fields += paramsQuery.fields[key];
                }
            }

            //Get count filtered rows
            query = "SELECT COUNT(*) as count FROM "+db_table+whereQuery;
            result = await this.executeRawQuery(query);

            let total_filtered_rows: number = result[0].count;

            query = "SELECT "+fields+" FROM "+db_table+whereQuery;

            //Order by
            let order = paramsQuery.order || false;
            if (order) {
                if (order.by) {
                    query += " ORDER BY "+order.by;
                    if (order.dir)
                        query += " "+order.dir;
                }
            }

            //Limit
            let limit = paramsQuery.limit || -1;
            if (limit > 0)
                query += " LIMIT "+limit;


            //Offset
            let offset = paramsQuery.offset || -1;
            if (offset >= 0)
                query += " OFFSET "+offset;

            //Get rows
            result = await this.executeRawQuery(query);

            let res: IListQueryResult<Object> = {
                total_rows: total_rows,
                total_filtered_rows: total_filtered_rows,
                rows: result
            }
            callback(false, res);

        } catch (err) {
            callback(err.message);
        }

    }
    
    public static executeInsertQuery(db_table: string, paramsQuery: IParamsQuery, callback: Function) {

        let query = "INSERT INTO "+db_table+" SET ?";
        this.executeRawQuery(query, paramsQuery.fields).then( result => {
            callback(false, result);
        }).catch(err => {
            return callback(err.message);
        });

    }

    public static executeUpdateQuery(db_table: string, paramsQuery: IParamsQuery, callback: Function) {

        let query = "UPDATE "+db_table+" SET ? WHERE ?";
        this.executeRawQuery(query, [paramsQuery.fields, paramsQuery.filters]).then( result => {
            callback(false, result);
        }).catch(err => {
            return callback(err.message);
        });

    }

    public static executeDeleteQuery(db_table: string, paramsQuery: IParamsQuery, callback: Function) {

        let query = "DELETE FROM "+db_table+" WHERE ?";
        this.executeRawQuery(query, paramsQuery.filters).then( result => {
            callback(false, result);
        }).catch(err => {
            return callback(err.message);
        });

    }

    private connectDB() {
        if ("connect" in this.connection) {
            this.connection.connect((err: mysql.MysqlError) => {
                if (err) {
                    console.error('(Worker ' + cluster.worker.id + ") Error connecting to database: " + err.message);
                    return;
                }
                console.log('(Worker ' + cluster.worker.id + ') DB connected on single mode');
            });
        } else {
            this.connection.getConnection(function(err: MysqlError, connection : PoolConnection) {
                if (err) {
                    console.error('(Worker ' + cluster.worker.id + ") Error connecting to database: " + err.message);
                    return;
                }
                console.log('(Worker ' + cluster.worker.id + ') DB connected on pool mode');

                connection.release();
            });

            if (this.configuration.env == 'development') {
                this.connection.on('acquire', function (connection) {
                    console.log('Connection %d acquired', connection.threadId);
                });

                this.connection.on('enqueue', function () {
                    console.log('Waiting for available connection slot');
                });

                this.connection.on('release', function (connection) {
                    console.log('Connection %d released', connection.threadId);
                });
            }
        }
    }

}