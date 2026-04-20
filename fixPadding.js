const fs = require('fs');
const path = require('path');

const ANALYTICS_SCREEN_PATH = path.join(__dirname, 'src', 'screens', 'AnalyticsScreen.tsx');
let content = fs.readFileSync(ANALYTICS_SCREEN_PATH, 'utf8');

content = content.replace(
  /contentContainerStyle=\{\{ paddingBottom: 100 \}\}/,
  'contentContainerStyle={{ paddingBottom: 160 }}'
);

fs.writeFileSync(ANALYTICS_SCREEN_PATH, content, 'utf8');

const DOCTOR_SCREEN_PATH = path.join(__dirname, 'src', 'screens', 'DoctorScreen.tsx');
content = fs.readFileSync(DOCTOR_SCREEN_PATH, 'utf8');
content = content.replace(
  /contentContainerStyle=\{\{ paddingBottom: Math\.max\(insets\.bottom, 120\) \}\}/,
  'contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 160) }}'
);
fs.writeFileSync(DOCTOR_SCREEN_PATH, content, 'utf8');

const FEEDING_SCREEN_PATH = path.join(__dirname, 'src', 'screens', 'FeedingScreen.tsx');
content = fs.readFileSync(FEEDING_SCREEN_PATH, 'utf8');
content = content.replace(
  /contentContainerStyle=\{\{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math\.max\(insets\.bottom, 120\) \}\}/,
  'contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 160) }}'
);
fs.writeFileSync(FEEDING_SCREEN_PATH, content, 'utf8');
