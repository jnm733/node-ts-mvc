import {Router} from 'express';
import Configuration from "../system/config";
import NotificationsController from "../controllers/notificationsController";
import Notification from "../models/notification";
import bodyParser from "body-parser";

const router = Router();
const configuration = Configuration.init();
const base_path = configuration.base_api;

/** Notifications **/
let base_group = 'notifications/';
router.get(base_path+base_group, NotificationsController.getNotifications);
router.get(base_path+base_group+':id/', NotificationsController.notification);
router.post(base_path+base_group, Notification.getValidationSchema(), NotificationsController.saveNotification);
router.put(base_path+base_group+':id/', Notification.getValidationSchema(), NotificationsController.updateNotification);
router.delete(base_path+base_group+':id/', NotificationsController.deleteNotification);

export default router;