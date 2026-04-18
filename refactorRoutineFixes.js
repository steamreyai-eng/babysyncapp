const fs = require('fs');
let c = fs.readFileSync('src/screens/RoutineScreen.tsx', 'utf8');

c = c.replace(/style=\{\[styles\.card,\s*\{(.*?)\}\]\}/g, `bg="white" radius="xxl" variant="elevated" borderWidth={1} borderColor="#F0ECE8" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2, $1 }}`);
c = c.replace(/style=\{styles\.card\}/g, `bg="white" radius="xxl" variant="elevated" borderWidth={1} borderColor="#F0ECE8" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}`);

c = c.replace(/StyleSheet\.absoluteFill/g, `{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }`);

c = c.replace(/<Typography([^>]*)Input([^>]*)>/g, '<TextInput$1Input$2>');
c = c.replace(/<Typography([^>]*)Input([^>]*)\/>/g, '<TextInput$1Input$2/>');

fs.writeFileSync('src/screens/RoutineScreen.tsx', c);
