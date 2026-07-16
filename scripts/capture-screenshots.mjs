import { chromium, devices } from 'playwright';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const baseUrl = process.argv[2] || 'http://127.0.0.1:8876/';
const outputDir = path.join(process.cwd(), 'docs', 'screenshots');

mkdirSync(outputDir, { recursive: true });

async function seedScene(page) {
  await page.evaluate(() => {
    setPaperColor('#ffffff');
    ST.objects = [
      {
        type: 'axes',
        axisId: 'axis-demo',
        origin: { x: 0, y: 0 },
        scale: 40,
        ticks: 6,
        xlabel: 'x',
        ylabel: 'y',
      },
      {
        type: 'quadratic',
        a: 1,
        b: -2,
        c: -3,
        axisId: 'axis-demo',
        origin: { x: 0, y: 0 },
        unitScale: 40,
        color: '#ef4444',
        lw: 2,
        dash: 'solid',
        fill: '#ef4444',
        fillOp: 0,
      },
      {
        type: 'segment',
        p1: { x: -160, y: 120 },
        p2: { x: -20, y: -60 },
        color: '#2563eb',
        lw: 2,
        dash: 'solid',
        fill: '#2563eb',
        fillOp: 0,
      },
      {
        type: 'segment',
        p1: { x: -160, y: 120 },
        p2: { x: -160, y: -60 },
        color: '#2563eb',
        lw: 2,
        dash: 'solid',
        fill: '#2563eb',
        fillOp: 0,
      },
      {
        type: 'triangle',
        pts: [
          { x: -160, y: 120 },
          { x: -20, y: -60 },
          { x: -160, y: -60 },
        ],
        rightAngleIndex: 2,
        color: '#2563eb',
        lw: 2,
        dash: 'solid',
        fill: '#93c5fd',
        fillOp: 0.24,
      },
      {
        type: 'circle',
        center: { x: 160, y: -80 },
        radius: 70,
        color: '#0f766e',
        lw: 2,
        dash: 'solid',
        fill: '#99f6e4',
        fillOp: 0.12,
      },
      {
        type: 'label',
        pos: { x: -172, y: 136 },
        text: 'A',
        color: '#1d4ed8',
        lw: 1,
      },
      {
        type: 'label',
        pos: { x: -10, y: -68 },
        text: 'B',
        color: '#1d4ed8',
        lw: 1,
      },
      {
        type: 'label',
        pos: { x: -177, y: -68 },
        text: 'C',
        color: '#1d4ed8',
        lw: 1,
      },
      {
        type: 'text',
        pos: { x: 150, y: -170 },
        text: '(x - 4)^2 + (y - 2)^2 = 3.06',
        color: '#f59e0b',
        lw: 1,
        fontSize: 13,
      },
    ];
    ST.selected = [];
    ST.showEquations = true;
    ST.showIntersections = true;
    vp.scale = 1;
    vp.panX = 0;
    vp.panY = 0;
    render();
    aiCenterView();
    vp.scale = Math.min(vp.scale, 1.1);
    render();
  });
}

async function captureDesktopOverview(browser) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 980 }, deviceScaleFactor: 1.5 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await seedScene(page);
  await page.screenshot({ path: path.join(outputDir, 'desktop-overview.png'), fullPage: true });
  await page.close();
}

async function captureAiPanel(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1.5 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await seedScene(page);
  await page.click('#btn-ai');
  await page.fill('#ai-input', '画一条经过点A且垂直于BC的辅助线');
  await page.screenshot({ path: path.join(outputDir, 'desktop-ai-panel.png'), fullPage: true });
  await page.close();
}

async function captureIpad(browser) {
  const context = await browser.newContext({
    ...devices['iPad Pro 11'],
    locale: 'zh-CN',
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await seedScene(page);
  await page.click('#btn-ai');
  await page.screenshot({ path: path.join(outputDir, 'ipad-layout.png'), fullPage: true });
  await context.close();
}

const browser = await chromium.launch({ headless: true });

try {
  await captureDesktopOverview(browser);
  await captureAiPanel(browser);
  await captureIpad(browser);
  console.log(`Screenshots written to ${outputDir}`);
} finally {
  await browser.close();
}
