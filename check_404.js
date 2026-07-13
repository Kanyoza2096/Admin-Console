import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });
  
  page.on('response', response => {
    if (response.status() === 404) {
       console.log('404 URL:', response.url());
    }
  });
  
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  
  await browser.close();
})();
