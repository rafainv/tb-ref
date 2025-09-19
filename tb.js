const { connect } = require("puppeteer-real-browser");
const fs = require("fs");
require("dotenv").config({ quiet: true });

const url = process.env.URL;
const login = process.env.LOGIN;
const senha = process.env.SENHA;

const COOKIES_PATH = "cookies.json";

const tb = async () => {
  const { page, browser } = await connect({
    args: ["--start-maximized"],
    turnstile: true,
    headless: false,
    proxy: {
      host: process.env.HOST_PROXY,
      port: process.env.PORT_PROXY,
      username: process.env.USER_PROXY,
      password: process.env.SENHA_PROXY,
    },
    // disableXvfb: true,
    customConfig: {},
    connectOption: {
      defaultViewport: null,
    },
    plugins: [],
  });

  try {
    if (fs.existsSync(COOKIES_PATH)) {
      const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH));
      await page.setCookie(...cookies);
    }

    await page.goto(url, {
      waitUntil: "networkidle2",
    });

    await page.evaluate(() => {
      // document.body.style.zoom = "50%";
      window.scrollTo(0, document.body.scrollHeight);
    });

    await new Promise((r) => setTimeout(r, 10000));

    let token = null;
    let startDate = Date.now();
    while (!token && Date.now() - startDate < 30000) {
      // await page.click("#cf-captcha");
      token = await page.evaluate(() => {
        try {
          document.querySelector("#cf-captcha").click()
          let item = document.querySelector(
            '[name="cf-turnstile-response"]'
          ).value;
          return item && item.length > 20 ? item : null;
        } catch (e) {
          return null;
        }
      });
      await new Promise((r) => setTimeout(r, 1000));
    }

    await new Promise((r) => setTimeout(r, 10000));

    while (true) {
      const ads = await page.evaluate(() => {
        const ad = document.querySelector(
          "#viewAdsTOffers1 > tbody > tr > td > strong"
        );
        return ad && ad.innerHTML.includes("No Ads Available") ? true : null;
      });
      if (ads) {
        console.log("No Ads Available");
        break;
      }
      const targetDivHandle = await page.evaluate(() => {
        const value = document.querySelector("#newClickDiv");
        return value.style.display !== "none" ? "New Click" : null;
      });
      if (!targetDivHandle) {
        await page.waitForSelector('input[value="View"]');
        await page.click(`input[value="View"]`);
      } else {
        await page.waitForSelector('input[value="New Click"]');
        await page.click(`input[value="New Click"]`);
        await new Promise((r) => setTimeout(r, 5000));
        await page.waitForSelector('input[value="View"]');
        await page.click(`input[value="View"]`);
      }
      await new Promise((r) => setTimeout(r, 5000));
      console.log(targetDivHandle);
      const pages = await browser.pages();
      if (!pages.includes("timebucks.com/")) {
        await pages[1].bringToFront();
        await new Promise((r) => setTimeout(r, 15000));
        await pages[1].close();
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  } catch (error) {
    console.error(`Erro interno do servidor: ${error.message}`);
    await browser.close();
    await new Promise((r) => setTimeout(r, 5000));
    await tb();
  } finally {
    await new Promise((r) => setTimeout(r, 5000));
    await page.screenshot({ path: "screen.png" });
    await browser.close();
  }
};

tb();











