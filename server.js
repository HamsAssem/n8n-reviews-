import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const BROWSERLESS_WS = process.env.BROWSERLESS_WS; // wss://production-<region>.browserless.io/?token=XXXX

app.post('/upload', upload.single('file'), async (req, res) => {
  const { store, email, pass } = req.body;
  if (!store || !email || !pass || !req.file) {
    return res.status(400).json({ ok: false, error: 'Missing store/email/pass/file' });
  }

  const tmpFile = path.join('/tmp', 'reviews.csv');
  try {
    await fs.writeFile(tmpFile, req.file.buffer);

    const browser = await chromium.connectOverCDP(BROWSERLESS_WS);
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login
    await page.goto(`https://${store}/admin`, { waitUntil: 'domcontentloaded' });
    const hasDomain = await page.$('input[name="shop_domain"]');
    if (hasDomain) {
      await page.fill('input[name="shop_domain"]', store);
      await page.keyboard.press('Enter');
    }

    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 45000 });
    const emailSel = (await page.$('input[type="email"]')) ? 'input[type="email"]' : 'input[name="email"]';
    await page.fill(emailSel, email);
    await page.keyboard.press('Enter');

    await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 45000 });
    const passSel = (await page.$('input[type="password"]')) ? 'input[type="password"]' : 'input[name="password"]';
    await page.fill(passSel, pass);
    await page.keyboard.press('Enter');

    await page.waitForLoadState('networkidle', { timeout: 120000 });

    // Judge.me app
    await page.goto(`https://${store}/admin/apps/judgeme`, { waitUntil: 'networkidle' });

    // Find Import button(s)
    const goImport =
      (await page.$('text=/import reviews/i')) ||
      (await page.$('button:has-text("Import")')) ||
      (await page.$('text=/import from a spreadsheet/i'));
    if (goImport) await goImport.click();

    // Upload CSV
    await page.waitForSelector('input[type="file"]', { timeout: 30000 });
    await page.setInputFiles('input[type="file"]', tmpFile);

    // Confirm
    const confirm =
      (await page.$('button:has-text("Import")')) ||
      (await page.$('text=/start import/i')) ||
      (await page.$('text=/upload/i'));
    if (confirm) await confirm.click();

    await page.waitForTimeout(8000);
    await browser.close();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  } finally {
    try { await fs.unlink(tmpFile); } catch {}
  }
});

app.get('/health', (_req, res) => res.send('OK'));
app.listen(process.env.PORT || 8080, () => console.log('server up'));
