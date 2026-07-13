import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const bodyHandle = await page.$('body');
  const html = await page.evaluate(body => body.innerHTML, bodyHandle);
  
  if (html.includes('Dashboard')) {
    console.log('Dashboard found.');
  } else {
    console.log('Dashboard NOT found.');
  }
  
  const rootHtml = await page.evaluate(() => document.getElementById('root').innerHTML);
  if (rootHtml.trim() === '') {
     console.log('ROOT IS EMPTY (BLANK SCREEN)');
  } else {
     console.log('ROOT IS NOT EMPTY');
  }
  
  await browser.close();
})();
