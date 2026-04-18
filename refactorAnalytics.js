const fs = require('fs');

let content = fs.readFileSync('src/screens/AnalyticsScreen.tsx', 'utf8');

// Replace StyleSheet elements
content = content.replace(/const styles = StyleSheet\.create\(\{[\s\S]*?\}\);/g, '');

// Replace styles.card
content = content.replace(/style=\{styles\.card\}/g, 'bg="white" p={20} radius="xl" variant="elevated" mb={20} borderWidth={1} borderColor="#E2E8F0"');
// Notice: for styles.card it's usually <View style={styles.card}>
content = content.replace(/<View bg="white"/g, '<Surface bg="white"');

// Replace styles.statCard
content = content.replace(/<View style=\{styles\.statCard\}>/g, '<Surface bg="white" p={16} radius="lg" variant="elevated" minWidth={150} flex={1} borderWidth={1} borderColor="#E2E8F0">'); 

// Replace styles.statIconWrapper
content = content.replace(/<View style=\{\[\{ backgroundColor: bg \}, styles\.statIconWrapper\]\}>/g, '<Wrapper width={44} height={44} radius="lg" align="center" justify="center" mb={8} bg={bg}>');

// Replace standard texts in StatCard
content = content.replace(/<Text style=\{\{ fontFamily: 'Nunito_900Black', fontSize: 20, color: '#0F172A', lineHeight: 24 \}\}>/g, '<Typography variant="h2" weight="black" color="textPrimary" style={{ lineHeight: 24 }}>');
content = content.replace(/<Text style=\{\{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#6B6B80', lineHeight: 14 \}\}/g, '<Typography variant="tiny" weight="bold" color="textMuted" style={{ lineHeight: 14 }}');
content = content.replace(/<Text style=\{\{ fontFamily: 'Nunito_700Bold', fontSize: 10, color: '#94A3B8', marginTop: 2 \}\}>/g, '<Typography variant="tiny" weight="bold" color="#94A3B8" mt={2}>');

// Replace sleep blocks
content = content.replace(/style=\{\[styles\.sleepBlock, \{ backgroundColor: (.*?) \}\]\}/g, 'p={12} radius="lg" flex={1} minWidth={140} bg={$1}');
content = content.replace(/<View p=\{12\}/g, '<Wrapper p={12}');

content = content.replace(/<Text style=\{styles\.sleepBlockTitle\}>/g, '<Typography variant="tiny" weight="extraBold" color="#8A8A9E" mb={4} uppercase>');
content = content.replace(/<Text style=\{\[styles\.sleepBlockValue, \{ color: (.*?) \}\]\}>/g, '<Typography variant="h3" weight="black" color={$1}>');
content = content.replace(/<Text style=\{styles\.sleepBlockSub\}>/g, '<Typography variant="tiny" weight="bold" color="textMuted" mt={4}>');

// Remove Text imports / replace with primitives where safe
if (!content.includes('import { Wrapper }')) {
   content = content.replace(/import \{.*?\} from 'react-native';/g, "$&\nimport { Wrapper } from '../components/ui/Wrapper';\nimport { Surface } from '../components/ui/Surface';\nimport { Typography } from '../components/ui/Typography';");
}

// Convert common Views explicitly
content = content.replace(/<\/View>\s*<\/View>\s*<Text style=\{\{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#6B6B80', lineHeight: 14 \}\}/g, '<\/Wrapper>\n    <\/Wrapper>\n    <Typography variant="tiny" weight="bold" color="textMuted" style={{ lineHeight: 14 }}');
content = content.replace(/<\/Text>\n\s*\{delta/g, '<\/Typography>\n    {delta');

fs.writeFileSync('src/screens/AnalyticsScreen.tsx', content);
