const fs = require('fs');

let c = fs.readFileSync('src/screens/RoutineScreen.tsx', 'utf8');

c = c.replace(/import \{([\s\S]*?)\} from 'react-native';/, (match, p1) => {
  const parts = p1.split(',').map(s=>s.trim()).filter(s=> s && !['View', 'Text', 'StyleSheet'].includes(s));
  return `import { ${parts.join(', ')} } from 'react-native';\nimport { Wrapper } from '../components/ui/Wrapper';\nimport { Surface } from '../components/ui/Surface';\nimport { Typography } from '../components/ui/Typography';`;
});

// Remove StyleSheet
c = c.replace(/const styles = StyleSheet\.create\([\s\S]*?\}\);/, '');

// Replace styles.card array inline
c = c.replace(/style=\{\[styles\.card, \{(.*?)\}\]\}/g, `bg="white" radius="xxl" variant="elevated" borderWidth={1} borderColor="#F0ECE8" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2, $1 }}`);
c = c.replace(/style=\{styles\.card\}/g, `bg="white" radius="xxl" variant="elevated" borderWidth={1} borderColor="#F0ECE8" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}`);

// Replace Views
c = c.replace(/<View/g, '<Wrapper');
c = c.replace(/<\/View>/g, '</Wrapper>');

// Map <Wrapper> that have bg="white" to Surface implicitly? Actually styles.card handled above is fine, they use Wrapper now but they have bg="white"... Oh wait `Wrapper` with bg / radius works perfectly fine too! Surface is just a glorified Wrapper.

// Replace Texts
c = c.replace(/<Text/g, '<Typography variant="body"');
c = c.replace(/<\/Text>/g, '</Typography>');

// Fix typography font families mapping if needed (optional since variant defaults to body anyway, but we should map fonts to weights)
c = c.replace(/style=\{\{.*?fontFamily: 'Nunito_900Black'.*?\}\}/g, match => match.replace('style={{', 'weight="black" style={{'));
c = c.replace(/style=\{\{.*?fontFamily: 'Nunito_800ExtraBold'.*?\}\}/g, match => match.replace('style={{', 'weight="extraBold" style={{'));
c = c.replace(/style=\{\{.*?fontFamily: 'Nunito_700Bold'.*?\}\}/g, match => match.replace('style={{', 'weight="bold" style={{'));
c = c.replace(/style=\{\{.*?fontFamily: 'Nunito_600SemiBold'.*?\}\}/g, match => match.replace('style={{', 'weight="semiBold" style={{'));

fs.writeFileSync('src/screens/RoutineScreen.tsx', c);
