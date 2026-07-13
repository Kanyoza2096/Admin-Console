import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const bodyHandle = await page.$('body');
  const html = await page.evaluate(body => body.innerHTML, bodyHandle);
  
  if (html.includes('Dashboard')) {
    console.log('Dashboard rendered successfully.');
    console.log('BODY HEAD:', html.substring(0, 1000));
  } else {
    console.log('Dashboard not found in HTML. Snippet: ', html.substring(0, 1000));
  }
  
  await browser.close();
})();
