const fs = require('fs');
const path = require('path');

const SCREENS = [
  'GrowthScreen.tsx',
  'ShiftsScreen.tsx',
  'RoutineScreen.tsx',
  'HealthScreen.tsx',
  'WalkScreen.tsx',
  'SleepScreen.tsx',
  'DiaperScreen.tsx'
];

for (const screen of SCREENS) {
  const p = path.join(__dirname, 'src', 'screens', screen);
  if (!fs.existsSync(p)) continue;
  let content = fs.readFileSync(p, 'utf8');
  
  // Replace anything like paddingBottom: 40 or Math.max(..., 40) with 160 or Math.max(insets.bottom, 160)
  content = content.replace(/paddingBottom: Math\.max\(insets\.bottom, \d+\)/g, 'paddingBottom: Math.max(insets.bottom, 160)');
  content = content.replace(/paddingBottom: 40/g, 'paddingBottom: 160');
  content = content.replace(/paddingBottom: 180/g, 'paddingBottom: 180'); // already large enough
  
  fs.writeFileSync(p, content, 'utf8');
}
