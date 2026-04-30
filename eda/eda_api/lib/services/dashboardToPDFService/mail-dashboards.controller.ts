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
      const browser = await puppeteer.launch({ headless: true , args: ['--no-sandbox'] });
      const loginPage = await browser.newPage();

    /* SDA CUSTOM */      await loginPage.on('response', async (response: any) => {

        if (response.url().includes('fake-login')) {
          try {
            console.log(`[MailDashboardsController] Fake-login response received: ${response.status()}`);
            const res = await response.json();
            console.log(`[MailDashboardsController] Token obtained for ${userMail}`);
            
            const browserPDF = await puppeteer.launch({ headless: true,  args: ['--no-sandbox'] });
            const page = await browserPDF.newPage();

            await page.setViewport({ width: 1366, height: 768 });

            console.log(`[MailDashboardsController] Navigating to dashboard page: ${serverConfig.server_baseURL}`);
/* SDA CUSTOM */            await page.goto(`${serverConfig.server_baseURL}`, { waitUntil: 'networkidle2' });
/* SDA CUSTOM */            await page.evaluate((res: any) => {
              localStorage.setItem('token', res.token);
              localStorage.setItem('user', JSON.stringify(res.user));
              localStorage.setItem('id', res.user._id);
            }, res);

            const dashboardUrl = `${serverConfig.server_baseURL}/#/dashboard/${dashboard}`;
            console.log(`[MailDashboardsController] Loading dashboard: ${dashboardUrl}`);
/* SDA CUSTOM */            await page.goto(dashboardUrl, { waitUntil: 'networkidle2', timeout: 120000 });
/* SDA CUSTOM */            await page.waitForSelector('#myDashboard', { timeout: 120000 });
/* SDA CUSTOM */            console.log(`[MailDashboardsController] Waiting for dashboard widgets/charts to render...`);
/* SDA CUSTOM */            await page.waitForFunction(() => {
/* SDA CUSTOM */              const dashboardElement = document.querySelector('#myDashboard');
/* SDA CUSTOM */              const widgets = document.querySelectorAll('ngx-gridster-item, eda-blank-panel, .gridster-item').length;
/* SDA CUSTOM */              return !!dashboardElement && widgets > 0;
/* SDA CUSTOM */            }, { timeout: 120000 });
/* SDA CUSTOM */            await wait(3000);
            
            const filename = `${dashboard}_${userMail.replace(/[@.]/g, '_')}.pdf`;
            const filepath = __dirname;
            console.log(`[MailDashboardsController] Generating PDF: ${filename}`);
            
            await page.pdf({
                path: `${filepath}/${filename}`,
/* SDA CUSTOM */                width: 1380,
/* SDA CUSTOM */                height: 1000,
                printBackground: true,
                displayHeaderFooter: false,
                landscape: false,
            });
            
            await browserPDF.close();
            const link = `${serverConfig.server_baseURL}/#/dashboard/${dashboard}`;
            console.log(`[MailDashboardsController] PDF generated, calling mailDashboardSending`);
            MailingService.mailDashboardSending(userMail, filename, filepath, transporter, message, link);

          } catch (err) {
            console.error(`[MailDashboardsController] Error in response handler:`, err);
          }
        }
      });

      const loginUrl = `${serverConfig.server_apiURL}/admin/user/fake-login/${userMail}/${token}`;
      console.log(`[MailDashboardsController] Navigating to login URL: ${loginUrl}`);
      await loginPage.goto(loginUrl, { waitUntil: 'networkidle2' });
      await browser.close();
      console.log(`[MailDashboardsController] Initial browser closed`);

    }
    catch (err) {
      console.error(`[MailDashboardsController] Error in sendDashboard:`, err);
      throw err;
    }

  }

}
