import { MailingService } from "../mailingService/mailing.service";
const serverConfig = require('../../../config/mailing.config');
const puppeteer = require('puppeteer');

/*SDA CUSTOM*/const wait = (ms: number) => {
/*SDA CUSTOM*/  return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
/*SDA CUSTOM*/}

export class MailDashboardsController {

static sendDashboard = async (dashboard: string, userMail: string, transporter: any, message: string, token: string) => {

    try {
      console.log(`[MailDashboardsController] Starting sendDashboard for ${userMail} on dashboard ${dashboard}`);
      const browserPDF = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      const page = await browserPDF.newPage();

      page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', err => console.log(`[Browser Error] ${err.message}`));

      await page.setViewport({ width: 1920, height: 1080 });

      const loginUrl = `${serverConfig.server_apiURL}/admin/user/fake-login/${userMail}/${token}`;
      console.log(`[MailDashboardsController] Getting token from: ${loginUrl}`);

      let loginResponse: any = null;
      page.on('response', async (response) => {
        if (response.url().includes('fake-login')) {
          try {
            loginResponse = await response.json();
          } catch (e) {}
        }
      });

      await page.goto(loginUrl, { waitUntil: 'networkidle2' });
      await wait(3000);

      if (!loginResponse || !loginResponse.token) {
        console.error(`[MailDashboardsController] Failed to obtain token for ${userMail}`, loginResponse);
        await browserPDF.close();
        return;
      }

      console.log(`[MailDashboardsController] Token obtained: ${loginResponse.token.substring(0, 50)}...`);

      await page.setCookie({
        name: 'token',
        value: loginResponse.token,
        domain: 'localhost',
        path: '/',
        httpOnly: false
      });

      const dashboardUrl = `${serverConfig.server_baseURL}#/dashboard/${dashboard}`;
      console.log(`[MailDashboardsController] Loading dashboard: ${dashboardUrl}`);

      const response = await page.goto(dashboardUrl, { waitUntil: 'networkidle2', timeout: 180000 });
      console.log(`[MailDashboardsController] Response status:`, response?.status());

      const htmlContent = await page.content();
      console.log(`[MailDashboardsController] HTML length: ${htmlContent.length}, first 500 chars:`, htmlContent.substring(0, 500));

      console.log(`[MailDashboardsController] Waiting for dashboard to render...`);
      await wait(120000);

      const debugInfo = await page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          bodyText: document.body.innerText.substring(0, 300),
          hasAppRoot: !!document.querySelector('app-root'),
          hasMyDashboard: !!document.querySelector('#myDashboard'),
        };
      });
      console.log(`[MailDashboardsController] Debug:`, JSON.stringify(debugInfo));

      const filename = `${dashboard}_${userMail.replace(/[@.]/g, '_')}.pdf`;
      const filepath = __dirname;
      console.log(`[MailDashboardsController] Generating PDF: ${filename}`);

      await page.pdf({
        path: `${filepath}/${filename}`,
        width: 1380,
        height: 1000,
        printBackground: true,
        displayHeaderFooter: false,
        landscape: false,
      });

      await browserPDF.close();
      const link = `${serverConfig.server_baseURL}#/dashboard/${dashboard}`;
      console.log(`[MailDashboardsController] PDF generated, calling mailDashboardSending`);
      MailingService.mailDashboardSending(userMail, filename, filepath, transporter, message, link);

    }
    catch (err) {
      console.error(`[MailDashboardsController] Error in sendDashboard:`, err);
      throw err;
    }

  }

}
