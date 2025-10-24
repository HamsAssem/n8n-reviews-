import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const express = require('express');
const multer  = require('multer');
const fetch   = require('node-fetch');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.get('/health', (_, res) => res.send('OK'));

// expects form-data: store, email, pass, file (csv)
app.post('/run', upload.single('file'), async (req, res) => {
  try {
    const { store, email, pass } = req.body;
    if (!store || !email || !pass || !req.file) {
      return res.status(400).json({ ok:false, error:'Missing store/email/pass/file' });
    }

    // call Browserless Playwright via env
    const ws = process.env.BROWSERLESS_WS;
    if (!ws) return res.status(500).json({ ok:false, error:'BROWSERLESS_WS not set' });

    // TODO: implement your Shopify CSV upload using Playwright here.
    // Use req.file.buffer (CSV bytes), and store/email/pass.

    return res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false, error: String(e) });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('listening on', PORT));

});

app.get('/health', (_req, res) => res.send('OK'));
app.listen(process.env.PORT || 8080, () => console.log('server up'));

