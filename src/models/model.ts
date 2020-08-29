import Mysql, {IListQueryResult} from "../system/mysql";
import {OkPacket} from "mysql";
import {param} from "express-validator";
const moment = require('moment');

interface IOptionsQuery {
    getRow?: boolean,
    setTimestamps?: boolean,
}

export interface IParamsQuery {
    offset?: number,
    limit?: number,
    order?: {
        by: string,
        dir: orderDirection
    },
    where?: {[key: string]: any},
    filters?: {[key: string]: any},
    fields?: {[key: string]: any},
    id?: string,
}

export enum orderDirection {
    ASC = 'ASC',
    DESC = 'DESC'
}

export default class Model {

    public static db_table: string;
    public static db_key: string;

    protected constructor(db_table: string, db_key: string) {
        Model.db_table = db_table;
        Model.db_key = db_key;
    }

    public static get(callback: Function, paramsQuery?: IParamsQuery,) {

        Mysql.executeListQuery(this.db_table, paramsQuery || {}, (err: string, result: IListQueryResult<Object>) => {
            if (err) {
                return callback(err);
            }

            return callback(false, result);
        });

    }

    public static find(id: string | number, callback: Function, paramsQuery?: IParamsQuery) {

        //Fields select
        let fields = "*";
        if (paramsQuery && paramsQuery.fields) {
            fields = "";
            for (let key in paramsQuery.fields) {
                if (Number(key) > 0)
                    fields += ', ';
                fields += paramsQuery.fields[key];
            }
        }
        let key = paramsQuery?.id || this.db_key;
        let query = "SELECT "+fields+" FROM "+this.db_table+" WHERE "+key+'="'+id+'" LIMIT 1';
        Mysql.executeRawQuery(query).then( result => {
            if (result.length == 0)
                return callback('No se encuentra el registro');
            callback(false, result[0]);
        }).catch(err => {
            return callback(err.message);
        });

    }

    public insert(callback: Function, paramsQuery?: IParamsQuery, options?: IOptionsQuery) {

        let fields = this.getFields();
        if (!options || options.setTimestamps === undefined || options.setTimestamps)
            fields.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

        let paramsQueryInsert: IParamsQuery = {
            fields: fields
        }
        Mysql.executeInsertQuery(Model.db_table, paramsQueryInsert, (err: string, result: OkPacket) => {
            if (err) {
                return callback(err);
            }

            if (options && options.getRow !== undefined && !options.getRow)
                callback(false, result.insertId);
            else {
                Model.find(result.insertId, (err: string, result: Object) => {
                    if (err) {
                        return callback(err);
                    }
                    callback(false, result);
                });
            }
        });

    }

    public save(callback: Function, paramsQuery?: IParamsQuery, options?: IOptionsQuery) {

        let filters: {[key: string]: any} = {};
        //Update property fields
        let fields = this.getFields();
        //Update parameters fields
        let update = (paramsQuery && paramsQuery.fields) ? paramsQuery.fields : {};
        if (update) {
            for (let key in update) {
                fields[key] = update[key];
            }
        }
        if (!options || options.setTimestamps === undefined || options.setTimestamps)
            fields.updated_at = moment().format('YYYY-MM-DD HH:mm:ss');
        // @ts-ignore
        filters[Model.db_key] = this[Model.db_key];
        let paramsQueryUpdate: IParamsQuery = {
            fields: fields,
            filters: filters
        }
        Mysql.executeUpdateQuery(Model.db_table, paramsQueryUpdate, (err: string, result: OkPacket) => {
            if (err) {
                return callback(err);
            }

            if (!result.affectedRows)
                return callback('No se encuentra el registro');

            if (options && options.getRow !== undefined && !options.getRow)
                callback(false, result)
            else {
                // @ts-ignore
                Model.find(this[Model.db_key], (err: string, result: Object) => {
                    if (err) {
                        return callback(err);
                    }
                    callback(false, result);
                });
            }

        });

    }

    public delete(callback: Function, paramsQuery?: IParamsQuery, options?: IOptionsQuery) {
        let filters: {[key: string]: any} = {};
        // @ts-ignore
        filters[Model.db_key] = this[Model.db_key];
        let paramsQueryDelete: IParamsQuery = {
            filters: filters
        }
        Mysql.executeDeleteQuery(Model.db_table, paramsQueryDelete, (err: string, result: OkPacket) => {
            if (err) {
                return callback(err);
            }

            if (!result.affectedRows)
                return callback('No se encuentra el registro');

            callback(false, result);

        });

    }

    public static getParamsQuery(query: {[key: string]: string}) {

        let offset = query.offset || 0;
        offset = Number(offset);
        delete query.offset;

        let limit = query.limit || 10;
        limit = Number(limit);
        delete query.limit;

        let order = query.order || '';
        delete query.order;

        let dir = query.dir || false;
        delete query.dir;

        let paramsQuery: IParamsQuery = {
            offset: offset,
            limit: limit,
            filters: query,
        }

        if (order != '') {
            paramsQuery.order = {by: order, dir: (!dir) ? orderDirection.ASC : this.getOrderDir(dir)};
        }

        return paramsQuery;
    }

    protected getFields() {
        let properties: String[] = Object.getOwnPropertyNames(this);
        let fields: {[key: string]: any}  = {};
        properties.forEach(element => {
            // @ts-ignore
            if (this[element] !== undefined) {
                // @ts-ignore
                fields[element] = this[element];
            }
        });

        return fields;
    }

    private static getOrderDir(value:any){
        switch(value){
            case 'asc':
            case "ASC":
            case 1:
            case "1":
                return orderDirection.ASC;
            default:
                return orderDirection.DESC;
        }
    }


}