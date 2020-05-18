const puppeteer = require('puppeteer');

const config = {
  path: 'example.pdf', printBackground: true, format: 'A4',
  margin: { top: "10mm", bottom: "10mm", left: "0mm", right: "0mm" }
};

(async () => {
  let st = Date.now()
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.setViewport({ width: 894, height: 978 })
  await page.goto('https://baike.baidu.com/item/%E6%84%9F%E5%8A%A8%E4%B8%AD%E5%9B%BD2019%E5%B9%B4%E5%BA%A6%E4%BA%BA%E7%89%A9', { waitUntil: 'networkidle2' });
  await page.pdf(config);
  await browser.close();
  console.log(Date.now() - st)
  return;
})();