const fs = require('fs');

let c = fs.readFileSync('src/screens/RoutineScreen.tsx', 'utf8');

c = c.replace(/import \{.*?\} from 'react-native';/, `import {
  ScrollView, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, RefreshControl
} from 'react-native';
import { Wrapper } from '../components/ui/Wrapper';
import { Surface } from '../components/ui/Surface';
import { Typography } from '../components/ui/Typography';`);

// Clean styles
c = c.replace(/const styles = StyleSheet\.create\({\s*card:\s*.*?\s*},\s*}\);/gs, '');

c = c.replace(/style=\{\[styles\.card, \{(.*?)\}\]\}/g, (match, p1) => {
   return `bg="white" radius="xl" variant="elevated" borderWidth={1.5} borderColor="#F0ECE8" style={{ shadowColor: '#000', ${p1} }}`;
});
c = c.replace(/style=\{styles\.card\}/g, `bg="white" radius="xl" variant="elevated" borderWidth={1.5} borderColor="#F0ECE8" style={{ shadowColor: '#000' }}`);

// Convert root wrapper 
c = c.replace(/<View style=\{\{ paddingHorizontal: 16, paddingTop: Platform\.OS === 'ios' \? 60 : 16 \}\}>/g, '<Wrapper px={16} pt={Platform.OS === "ios" ? 60 : 16}>');
c = c.replace(/<Text style=\{\{ fontSize: 32, fontFamily: 'Nunito_900Black', color: '#0F172A', letterSpacing: -0\.5, marginBottom: 4 \}\}>Режим<\/Text>/g, '<Typography variant="h1" weight="black" color="#0F172A" mb={4} style={{ fontSize: 32, letterSpacing: -0.5 }}>Режим</Typography>');

// Routine Screen Text blocks
c = c.replace(/<Text style=\{\{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#6B6B80' \}\}>/g, '<Typography variant="body" weight="bold" color="#6B6B80" style={{ fontSize: 15 }}>');

// Convert typical View layout
// Let's rely on standard search and replacements for primitive View and Text tags.
c = c.replace(/<View style=\{\{(.*?)\}\}>/g, (match, p1) => `<Wrapper style={{${p1}}}>`);
c = c.replace(/<\/View>/g, '</Wrapper>');

// Generic replacements for UI texts
c = c.replace(/<Text style=\{\{(.*?)\}\}>([\s\S]*?)<\/Text>/g, (match, p1, p2) => {
    let props = "";
    if (p1.includes('Nunito_900Black')) props += ' variant="body" weight="black"';
    else if (p1.includes('Nunito_800ExtraBold')) props += ' variant="body" weight="extraBold"';
    else if (p1.includes('Nunito_700Bold')) props += ' variant="body" weight="bold"';
    else if (p1.includes('Nunito_600SemiBold')) props += ' variant="body" weight="semiBold"';
    else props += ' variant="body"';
    
    return `<Typography${props} style={{${p1}}}>${p2}</Typography>`;
});

fs.writeFileSync('src/screens/RoutineScreen.tsx', c);
