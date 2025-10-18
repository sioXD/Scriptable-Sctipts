/******************************************************************************
 * CONFIGURATION
 *****************************************************************************/

const YOURNAME = 'TODO'; // TODO: your GitHub Username
const WAKAUSER = 'TODO'; // TODO: your WakaTime Username
const API_KEY = 'TODO'; // TODO: Insert API Key
const DATERANGE = 'last_7_days';

const FONT_NAME = 'Menlo';
const FONT_SIZE = 9;
const FONT_SIZE_TITLE = 13;
const FONT_SIZE_LEGEND = 10;

const COLORS = {
  bg0: '#00000000',
  bg1: '#00000000',
};

const CACHE_KEY_LAST_UPDATED = 'last_updated';
const Cache = importModule('Cache_Waka');
const cache = new Cache('WakaStats');

/******************************************************************************
 * MAIN
 *****************************************************************************/

const data = await fetchData();
const widget = await createWidget(data);

Script.setWidget(widget);
Script.complete();

/******************************************************************************
 * WIDGET CREATION
 *****************************************************************************/

async function createWidget(data) {
  const w = new ListWidget();
  w.setPadding(12, 12, 12, 12);
  const bg = new LinearGradient();
  bg.colors = [new Color(COLORS.bg0), new Color(COLORS.bg1)];
  bg.locations = [0, 1];
  w.backgroundGradient = bg;

  // ---- TITLE ----
  const title = w.addText(`WakaStats for ${YOURNAME} | Last 7 Days`);
  title.font = new Font(FONT_NAME, FONT_SIZE_TITLE);
  title.centerAlignText();
  title.textColor = Color.white();
  title.textOpacity = 0.8;
  w.addSpacer(8);

  // ---- MAIN STACK (Chart + Legend) ----
  const mainStack = w.addStack();
  mainStack.layoutHorizontally();
  mainStack.centerAlignContent();
  mainStack.addSpacer();
  

  // Chart
  const chartSize = 80;
  const chartImage = drawPieChart(data.waka.languagesData, chartSize);
  const chartImg = mainStack.addImage(chartImage);
  chartImg.imageSize = new Size(chartSize, chartSize);
  mainStack.addSpacer(12);
  
  mainStack.addSpacer();

  // Legend
  const legendStack = mainStack.addStack();
  legendStack.layoutVertically();
  data.waka.languagesData.forEach((lang) => {
    const s = legendStack.addStack();
    const colorBox = s.addImage(generateColorBox(lang.color, 10, 10));
    s.addSpacer(4);
    const t = s.addText(`${lang.name} (${lang.percent}%)`);
    t.font = new Font(FONT_NAME, FONT_SIZE_LEGEND);
    t.textColor = Color.white();
    legendStack.addSpacer(2);
  });
    mainStack.addSpacer();

  w.addSpacer(10);

  // ---- TIME INFO ----
  const timeStack = w.addStack();
  timeStack.layoutHorizontally();
  timeStack.centerAlignContent();
  timeStack.spacing = 16;
  timeStack.addSpacer();

  const avg = timeStack.addText(`⏱ Avg: ${data.waka.dayAv}`);
  avg.font = new Font(FONT_NAME, FONT_SIZE);
  avg.textColor = Color.white();

  // const total = timeStack.addText(`⌛️ Total: ${data.waka.total}`);
  //total.font = new Font(FONT_NAME, FONT_SIZE);
  //total.textColor = Color.white();


  timeStack.addSpacer();

  w.addSpacer(8);
  const updatedAt = new Date().toLocaleString();
  const footer = w.addText(`Last updated: ${updatedAt}`);
  footer.font =  Font.italicSystemFont(7);
  footer.textOpacity = 0.6;
  footer.centerAlignText();
  footer.textColor = Color.white();

  return w;
}

/******************************************************************************
 * DATA FETCHING
 *****************************************************************************/

async function fetchData() {
  const waka = await fetchWaka();
  const lastUpdated = await getLastUpdated();
  cache.write(CACHE_KEY_LAST_UPDATED, new Date().getTime());
  return { waka, lastUpdated };
}

async function fetchWaka() {
  const url = `https://wakatime.com/api/v1/users/${WAKAUSER}/stats/${DATERANGE}`;
  const key = Data.fromString(API_KEY).toBase64String();
  const headers = { Authorization: `Basic ${key}` };
  const data = await fetchJson(url, headers);

  if (!data) return 'No data found';

  // color for chart (rotating)
  const palette = [
    '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#A66DD4', '#FF9F1C', '#FF6F61',
  ];

  const languagesData = data.data.languages
    .slice(0, 5) // max of 5 languages
    .map((e, i) => ({
      name: e.name,
      percent: e.percent.toFixed(1),
      color: palette[i % palette.length],
    }));

  return {
    languagesData,
    dayAv: data.data.human_readable_daily_average,
    total: data.data.human_readable_total,
  };
}

async function fetchJson(url, headers) {
  try {
    const req = new Request(url);
    req.headers = headers;
    return await req.loadJSON();
  } catch (error) {
    console.error(`Error fetching ${url}: ${error}`);
    return null;
  }
}

async function getLastUpdated() {
  let cached = await cache.read(CACHE_KEY_LAST_UPDATED);
  if (!cached) {
    cached = new Date().getTime();
    cache.write(CACHE_KEY_LAST_UPDATED, cached);
  }
  return cached;
}

/******************************************************************************
 * DRAWING HELPERS
 *****************************************************************************/

function drawPieChart(data, size) {
  const ctx = new DrawContext();
  ctx.size = new Size(size, size);
  ctx.opaque = false;

  const center = new Point(size / 2, size / 2);
  const radius = size / 2;

  let startAngle = 0;

  // draw all
  for (let segment of data) {
    const endAngle = startAngle + (segment.percent / 100) * 2 * Math.PI;

    drawSegment(ctx, center, radius, startAngle, endAngle, segment.color);

    startAngle = endAngle;
  }

  // better transition
  ctx.setFillColor(new Color("#000000")); // transparent color
  ctx.fillEllipse(
    new Rect(center.x - radius * 0.02, center.y - radius * 0.02, radius * 0.04, radius * 0.04)
  );

  return ctx.getImage();
}

function drawSegment(ctx, center, radius, startAngle, endAngle, color) {
  const steps = 200; // for smooth circle
  const path = new Path();

  path.move(center);
  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + ((endAngle - startAngle) * i) / steps;
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius;
    path.addLine(new Point(x, y));
  }
  path.closeSubpath();

  ctx.setFillColor(new Color(color));
  ctx.addPath(path);
  ctx.fillPath();
}

function generateColorBox(color, w, h) {
  const ctx = new DrawContext();
  ctx.size = new Size(w, h);
  ctx.opaque = false;
  ctx.setFillColor(new Color(color));

  // draw circle
  const diameter = Math.min(w, h);
  ctx.fillEllipse(new Rect(0, 0, diameter, diameter));

  return ctx.getImage();
}

DrawContext.prototype.fillEllipseSector = function (center, radius, startAngle, endAngle) {
  this.beginPath();
  this.addArc(center.x, center.y, radius, startAngle, endAngle, false);
  this.addLine(new Point(center.x, center.y));
  this.closePath();
  this.fillPath();
};
