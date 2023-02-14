import { Browser, Page } from "puppeteer";
import { Account } from "../types";


async function getSummaryInfo(page: Page) {
    try {
        // 持续天数和累计签到
        const summary = await page.$eval(".signin .figures", (el) => {
            const cards = el.querySelectorAll(".figure-card");
            return {
                continuousDays: cards.length >= 1 ? cards[0].querySelector(".figure")?.innerHTML : "-",
                totalDays: cards.length >= 2 ? cards[1].querySelector(".figure")?.innerHTML : "-",
                mineCount: cards.length >= 3 ? cards[2].querySelector(".figure")?.innerHTML : "-"
            }
        });

        return summary;
    } catch (err) {
        console.error("autoSign:getDaysInfo:error", err);
        return {
            continuous: '-',
            total: '-'
        }
    }
}

// 可以直接走接口判断
export default async function autoSign(_browser: Browser, page: Page, _account: Account) {
    try {
        await page.waitForSelector('.signin');
        await page.waitForTimeout(5000);


        let signBtn = await page.$('.signin .code-calender .btn');
        let classValue = await page.$eval(".signin .code-calender .btn", el => el.className);
        if (classValue.indexOf('signedin') >= 0) {
            console.log('autoLuckDraw：今日已签到，无需签到');
            const daysInfo = await getSummaryInfo(page);

            return {
                success: true,
                data: daysInfo
            }
        }
        await signBtn!.click();
        await page.waitForTimeout(3000)
        classValue = await page.$eval(".signin .code-calender .btn", el => el.className);
        if (classValue.indexOf('signedin') >= 0) {
            console.log('autoLuckDraw：签到成功')
            await page.waitForTimeout(3000);
            let closeBtn = await page.$('.success-modal .byte-modal__headerbtn');
            closeBtn!.click();
            await page.waitForTimeout(5000);

            const daysInfo = await getSummaryInfo(page);
            return {
                success: true,
                data: daysInfo
            }
        } else {
            console.log('autoLuckDraw：签到失败')
            return {
                success: false,
            }
        }
    } catch (err: any) {
        console.error("autoSign error:", err);
        return {
            success: false,
            message: err.message
        }
    }
}

