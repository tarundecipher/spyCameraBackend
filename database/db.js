const Sequelize = require('sequelize');
import { UserModel } from "./user";


export const sequelize = new Sequelize("postgres","postgres","postgres",{
    dialect: "postgres",
    host: "auth-postgres-srv",
});
export const User = sequelize.define('User',UserModel);