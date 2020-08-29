import {Request, Response} from "express";
import {IListQueryResult} from "../system/mysql";
import Model, {IParamsQuery, orderDirection} from "../models/model";
import Notification, {INotification} from "../models/notification";
import {validationResult} from "express-validator";
import {OkPacket} from "mysql";
import Controller from "./controller";

export default class NotificationsController extends Controller{

    constructor() {
        super();
    }

    public static getNotifications(req: Request, res: Response) {

        let query = req.query as {[key: string]: string};

        let paramsQuery: IParamsQuery = Model.getParamsQuery(query);
        if (paramsQuery.order === undefined) {
            paramsQuery.order = {
                by: 'id',
                dir: orderDirection.DESC
            }
        }
        Notification.get((err: string, data: IListQueryResult<INotification>) => {

            if (err) {
                console.error(err);
                return res.status(400).json({
                    ok: false,
                });
            }

            res.json({
                ok: true,
                data: data
            });

        }, paramsQuery);

    }

    public static notification(req: Request, res: Response) {

        Notification.find(req.params.id, (err: string, result: INotification) => {
            if (err) {
                console.error(err);
                return res.status(404).json({
                    ok: false,
                });
            }

            res.json({
                ok: true,
                data: result,
            });

        });

    }

    public static saveNotification(req: Request, res: Response) {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({
                ok: false,
                errors: errors.mapped()
            });
        }

        let params: INotification = req.body;

        let notification = new Notification(params);

        notification.insert((err: String, insertRow: INotification) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    ok: false,
                });
            }

            res.json({
                ok: true,
                data: insertRow,
            });

        });

    }

    public static updateNotification(req: Request, res: Response) {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({
                ok: false,
                errors: errors.array()
            });
        }

        Notification.find(req.params.id, (err: string, result: INotification) => {
            if (err) {
                console.error(err);
                return res.status(404).json({
                    ok: false,
                });
            }

            let notification = new Notification(result);
            let paramsQuery: IParamsQuery = {
                fields: req.body
            }
            notification.save((err: string, result: OkPacket) => {
                if (err) {
                    console.error(err);
                    return res.status(400).json({
                        ok: false,
                    });
                }

                res.json({
                    ok: true,
                    data: notification,
                });

            }, paramsQuery);

        });

    }

    public static deleteNotification(req: Request, res: Response) {

        Notification.find(req.params.id, (err: string, result: INotification) => {
            if (err) {
                console.error(err);
                return res.status(404).json({
                    ok: false,
                });
            }

            let notification = new Notification(result);

            notification.delete((err: string, result: OkPacket) => {
                if (err) {
                    console.error(err);
                    return res.status(400).json({
                        ok: false,
                    });
                }

                res.json({
                    ok: true
                });

            });

        });

    }

}