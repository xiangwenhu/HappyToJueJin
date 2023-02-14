import fs from "fs";
import path from "path";

const env = process.env || {};


interface IConfig {
    user: {
        accounts: string;
        password: string;
        email: string;
        emailPassword: string;
        cookies: Record<string, any[]>
    }
}


let config: IConfig | null = null;

export default function getConfig(): IConfig {
    if (!config) {
        config = initConfig();
    }
    return config;
}

function initConfig() {
    if (fs.existsSync(path.join(__dirname, "./index.local.js"))) {
        const config = require("./index.local") as IConfig;
        return config
    }

    return {
        user: {
            accounts: env.USER_ACCOUNT_LIST,
            cookies: JSON.parse(env.USER_COOKIES as string),
            password: env.USER_PASSWORD, // 你的掘金登录密码
            email: env.USER_EMAIL, // 你的接收通知的邮箱
            emailPassword: env.USER_EMAIL_PASSWORD,  // 邮箱密码
        }
    } as IConfig;
}




