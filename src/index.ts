import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { Browser, Page } from 'puppeteer';
import { ensureLogin } from "./login";
import { Account } from './types';
import { createPage } from "./util/puppeteer";

// tasks
import autoSign from "./tasks/autoSign"
// import autoBugFix from './tasks/autoBugFix';
import autoLuckDraw from './tasks/autoLuckDraw';
import autoDigMine from './tasks/autoDigMine';
import autoMineCount from "./tasks/autoMineCount";

import { sendHappyResult } from './util/emailHelper';
import getConfig from './config';

type Task = (browser: Browser, page: Page, _account: Account) => Promise<any>

const taskList: Task[] = [
    autoSign,
    // autoBugFix,
    autoLuckDraw,
    /*autoDigMine, */
    autoMineCount
];

// const taskList: Task[] = [ autoDigMine];
function getAccount(): Account[] {
    const config = getConfig();
    return (config.user.accounts || '').split('|').map(account => {
        return {
            account,
            uid: ''
        }
    })
}

function getCookies() {
    const config = getConfig();
    // 如果本地有cookies.json
    if (fs.existsSync(path.join(__dirname, "./cookies.json"))) {
        const cookies = require("./cookies.json");
        return cookies;
    } else {
        return config.user.cookies;
    }

}

async function goSignPage(page: Page) {
    // 点击头像
    console.log('点击头像：开始');
    await page.click('.avatar-wrapper .avatar');
    await page.waitForTimeout(2000);
    await page.waitForSelector('.user-card');
    console.log('点击头像：完毕');

    // 点击钻石
    console.log('点击钻石：开始');
    await page.waitForTimeout(2000);
    await page.click('.user-card .user-detail .ore');
    console.log('点击钻石：结束');

    // 等待跳转
    console.log('等待跳转：开始');
    // await page.waitForResponse('https://juejin.cn/user/center/signin?avatar_menu');
    await page.waitForTimeout(5000);
    console.log('等待跳转：结束');
}

export async function autoAutoHappy() {
    // 获得本地保存的cookie
    const cookies = getCookies();
    //获取所有的账号
    const accounts = getAccount();
    if (!Array.isArray(accounts)) {
        return console.error("没有账号，终止任务");
    };

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        await execAutoTask(account, cookies);
    }
}

async function ensureUid(page: Page) {
    await page.click('.avatar-wrapper .avatar');
    await page.waitForTimeout(2000);
    await page.waitForSelector('.user-card');
    const uid = await page.$eval(".user-detail .username", el => {
        const href = el.getAttribute("href") || "";
        return href.split("/").pop();
    });
    await page.click('.avatar-wrapper .avatar'); // 关闭
    return uid;
}


async function execAutoTask(account: Account, cookies: any) {
    let browser: Browser;
    try {
        let pInfo = await createPage({
            headless: true,
            defaultViewport: { width: 1400, height: 1200 }
        });
        let page = pInfo.page;
        browser = pInfo.browser;
        // 确保登录
        await ensureLogin(account, page, cookies);

        console.log("execAutoTask:准备获取uid");
        const uid = await ensureUid(page);
        account.uid = uid!;
        console.log("execAutoTask:获取uid完毕");

        // 去签到页面
        await goSignPage(page);

        // const rdTaskList = taskList.sort(() => Math.random() - 0.5);
        const results = [];
        for (let i = 0; i < taskList.length; i++) {
            try {
                const task = taskList[i];
                console.log(`account:${account.account} 开始执行任务`, task.name);
                const result = await task.apply(null, [browser, page, account]);

                result.type = task.name;
                results.push(result);
                console.log(`account:${account.account} 执行任务完毕`, task.name)

            } catch (error) {
                console.error("任务执行失败:", error);
            }
        }

        await page.waitForTimeout(2000);
        console.log(`${account.account} 所有任务执行完毕`);

        sendHappyResult({
            account,
            results
        });

    } catch (err) {
        console.log('ensureLogin error:', err);
    } finally {
        // @ts-ignore
        if (browser && browser!.isConnected) {
            await browser.close();
        }
    }
}