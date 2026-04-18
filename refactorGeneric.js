const fs = require('fs');

let c = fs.readFileSync('src/screens/DiaperScreen.tsx', 'utf8');

c = c.replace(/import \{.*?\} from 'react-native';/, "$&\nimport { Wrapper } from '../components/ui/Wrapper';\nimport { Surface } from '../components/ui/Surface';\nimport { Typography } from '../components/ui/Typography';");

// Convert header
c = c.replace(/<View style=\{\{ paddingTop: Math\.max\(insets\.top, 16\), paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FAFBFC', flexDirection: 'row', alignItems: 'center' \}\}>/g, 
'<Wrapper pt={Math.max(insets.top, 16)} px={16} pb={16} bg="#FAFBFC" dir="row" align="center">');
c = c.replace(/<TouchableOpacity onPress=\{\(\) => navigation\.goBack\(\)\} style=\{\{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: \{ width: 0, height: 2 \}, shadowOpacity: 0\.05, shadowRadius: 4, elevation: 2, marginRight: 16, borderWidth: 1, borderColor: '#E2E8F0' \}\}>/g,
'<Surface as={TouchableOpacity} onPress={() => navigation.goBack()} width={44} height={44} radius={22} align="center" justify="center" variant="elevated" mr={16} borderWidth={1} borderColor="#E2E8F0">');
c = c.replace(/<Text style=\{\{ fontFamily: 'Nunito_900Black', fontSize: 24, color: '#1A1A2E' \}\}>Подгузники<\/Text>/g, '<Typography variant="h1" weight="black" color="textPrimary">Подгузники</Typography>');

// Convert generic cards
c = c.replace(/<View style=\{\{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#8A8A9E', shadowOpacity: 0\.08, shadowRadius: 32, elevation: 4, borderWidth: 1, borderColor: '#F0ECE8', marginBottom: 20 \}\}>/g,
'<Surface bg="white" radius="xl" p={20} variant="elevated" borderWidth={1} borderColor="#F0ECE8" mb={20}>');
c = c.replace(/<View style=\{\{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#8A8A9E', shadowOpacity: 0\.08, shadowRadius: 32, elevation: 4, borderWidth: 1, borderColor: '#F0ECE8' \}\}>/g,
'<Surface bg="white" radius="xl" p={20} variant="elevated" borderWidth={1} borderColor="#F0ECE8">');

// Generic texts
c = c.replace(/<Text style=\{\{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0\.5 \}\}>/g, 
'<Typography variant="tiny" weight="extraBold" color="textMuted" uppercase mb={8} style={{ letterSpacing: 0.5 }}>');

c = c.replace(/<Text style=\{\{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#1A1A2E' \}\}>/g,
'<Typography variant="body" weight="bold" color="textPrimary">');

// Type selector
c = c.replace(/<View style=\{\{ flexDirection: 'row', backgroundColor: '#F9F8F6', borderRadius: 16, padding: 4, marginBottom: 24 \}\}>/g,
'<Wrapper dir="row" bg="#F9F8F6" radius="lg" p={4} mb={24}>');

fs.writeFileSync('src/screens/DiaperScreen.tsx', c);
