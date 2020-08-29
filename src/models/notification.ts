import Model, {IParamsQuery} from "./model";
const { check } = require('express-validator');

export interface INotification {
    id?: number,
    id_user: number,
    title: string,
    body?: string,
    icon?: string,
    image?: string,
    url_redirect?: string,
    utm_source?: string,
    utm_medium?: string,
    utm_campaign?: string,
    created_at?: string,
    updated_at?: string,
}

export interface INotifications {
    [key: number]: INotification;
}

export default class Notification extends Model implements INotification{

    public static db_table: string = 'notificaciones';
    public static db_key: string = 'id';

    public id: number;
    public id_user: number;
    public title: string;
    public body: string;
    public icon: string;
    public image: string;
    public url_redirect: string;
    public utm_source: string;
    public utm_medium: string;
    public utm_campaign: string;
    public created_at: string;
    public updated_at: string;

    constructor(params: {[key: string]: any}) {
        super(Notification.db_table, Notification.db_key);
        this.id = params.id;
        this.id_user = params.id_user;
        this.title = params.title;
        this.body = params.body;
        this.icon = params.icon;
        this.image = params.image;
        this.url_redirect = params.url_redirect;
        this.utm_source = params.utm_source;
        this.utm_medium = params.utm_medium;
        this.utm_campaign = params.utm_campaign;
        this.created_at = params.created_at;
        this.updated_at = params.updated_at;
    }

    public shipments(paramsQuery: IParamsQuery, callback: Function) {
        paramsQuery.where = {notificaciones_id: this.id};
        //GET SHIPMENTS
    }

    public static getValidationSchema() {
        return [
            check('id_user').not().isEmpty().withMessage('El id de usuario es requerido').bail()
                .isInt().toInt().withMessage('El id de usuario debe de ser un entero'),
            check('title').not().isEmpty().withMessage('El título es requerido'),
            check('icon').not().isEmpty().withMessage('El icono es requerido').bail()
                .isURL().withMessage('El icono debe estar en formato url'),
            check('url_redirect').not().isEmpty().withMessage('La url es requerida').bail()
                .isURL().withMessage('La url debe estar en formato url'),
            check('image').optional().isURL().withMessage('La imagen debe estar en formato url'),
        ];
    }

}