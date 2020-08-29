import cron from "node-cron";
import TestCommand from "./testCommand";

//Test Command
cron.schedule('* * * * *', TestCommand.init);