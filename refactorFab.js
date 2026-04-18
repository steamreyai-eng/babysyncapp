const fs = require('fs');

let content = fs.readFileSync('scratch_fab.txt', 'utf8');

// We meticulously replace specific start and end tags so they balance exactly.
content = content.replace(/<View style=\{styles\.fieldGroup\}>/g, '<Wrapper mb={20}>');
// Replace the matching closing tag. But how? 
// We know `<View style={styles.fieldGroup}>` gets closed by `</View>`
// Since we don't have a parser, let's replace them carefully.

// fieldLabel
content = content.replace(/<Text style=\{styles\.fieldLabel\}>([^<]+)<\/Text>/g, '<Wrapper mb={8}><Typography variant="caption" color="textMuted" weight="extraBold" uppercase letterSpacing={0.8}>$1</Typography></Wrapper>');

// sheetHeader
content = content.replace(/<View style=\{styles\.sheetHeader\}>/g, '<Wrapper mb={24} dir="row" align="center" gap={14}>');
content = content.replace(/<View style=\{\[styles\.sheetIcon, \{ backgroundColor: '([^']+)' \}\]\}>/g, '<Surface width={52} height={52} radius="lg" align="center" justify="center" bg="$1" variant="outlined">');
content = content.replace(/<Text style=\{styles\.sheetTitle\}>([^<]+)<\/Text>/g, '<Typography variant="h2" color="textPrimary" weight="black">$1</Typography>');

// typeTabs
content = content.replace(/<View style=\{styles\.typeTabs\}>/g, '<Wrapper dir="row" bg="#F1F5F9" radius="lg" p={6} mb={20} borderWidth={1} borderColor="#E2E8F0">');
content = content.replace(/<TouchableOpacity key=\{t\.id\} style=\{\[styles\.typeTab, feedingType === t\.id && styles\.typeTabActive\]\} onPress=\{([^}]+)\}>/g, 
  '<TouchableOpacity key={t.id} style={{ flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: "center", backgroundColor: feedingType === t.id ? "white" : "transparent", ...(feedingType === t.id && { shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: "#E2E8F0" }) }} onPress={$1}>');
content = content.replace(/<Text style=\{\[styles\.typeTabText, feedingType === t\.id && \{ color: '#4E8FD4' \}\]\}>\{t\.label\}<\/Text>/g,
  '<Typography variant="body" weight="extraBold" color={feedingType === t.id ? "#4E8FD4" : "textMuted"}>{t.label}</Typography>');

// input (Touch) time
content = content.replace(/<TouchableOpacity style=\{styles\.input\}/g, '<TouchableOpacity style={{ backgroundColor: "#F1F5F9", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 16, paddingVertical: 16 }}');
content = content.replace(/<Text style=\{\{ fontSize: 16, fontWeight: '700', color: '#1A1A2E', fontFamily: 'Nunito_700Bold' \}\}>\{formatDate\(logDate\)\}<\/Text>/g,
  '<Typography variant="body" weight="bold" color="textPrimary">{formatDate(logDate)}</Typography>');

// TextInput
content = content.replace(/<TextInput style=\{styles\.input\}/g, '<TextInput style={{ backgroundColor: "#F1F5F9", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, fontFamily: "Nunito_700Bold", color: "#0F172A" }}');
content = content.replace(/<TextInput style=\{\[styles\.input, \{ minHeight: 60, textAlignVertical: 'top' \}\]\}/g, '<TextInput style={{ backgroundColor: "#F1F5F9", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, fontFamily: "Nunito_700Bold", color: "#0F172A", minHeight: 60, textAlignVertical: "top" }}');

// saveBtn
content = content.replace(/<TouchableOpacity style=\{\[styles\.saveBtn, \{ backgroundColor: '([^']+)' \}\]\}/g, '<TouchableOpacity style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18, borderRadius: 24, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", backgroundColor: "$1", shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 6 }}');
content = content.replace(/<TouchableOpacity\s+style=\{\[styles\.saveBtn, \{ backgroundColor: sleepTimerRunning \? '#D94F4F' : '#8B6FD4' \}\]\}/g, '<TouchableOpacity style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18, borderRadius: 24, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", backgroundColor: sleepTimerRunning ? "#D94F4F" : "#8B6FD4", shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 6 }}');
content = content.replace(/<TouchableOpacity style=\{\[styles\.saveBtn, \{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', marginTop: 12 \}\]\}/g, '<TouchableOpacity style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18, borderRadius: 24, borderWidth: 2, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", marginTop: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 6 }}');
content = content.replace(/<Text style=\{styles\.saveBtnText\}>([^<]+)<\/Text>/g, '<Typography variant="body" weight="black" color="white">$1</Typography>');
content = content.replace(/<Text style=\{styles\.saveBtnText\}>\{sleepTimerRunning[^<]+\}<\/Text>/g, '<Typography variant="body" weight="black" color="white">{sleepTimerRunning ? "Остановить и сохранить" : "Начать сон"}</Typography>');
content = content.replace(/<Text style=\{\[styles\.saveBtnText, \{ color: '#64748B' \}\]\}>([^<]+)<\/Text>/g, '<Typography variant="body" weight="black" color="#64748B">$1</Typography>');

// diaper option
content = content.replace(/<TouchableOpacity key=\{t\.id\} style=\{\[styles\.diaperOption, \{ backgroundColor: diaperType === t\.id \? t\.bg : 'white', borderColor: diaperType === t\.id \? t\.color : '#E2E8F0' \}\]\} onPress=\{([^}]+)\}>/g,
  '<TouchableOpacity key={t.id} style={{ flex: 1, alignItems: "center", gap: 8, padding: 14, borderRadius: 20, borderWidth: 3, backgroundColor: diaperType === t.id ? t.bg : "white", borderColor: diaperType === t.id ? t.color : "#E2E8F0" }} onPress={$1}>');

content = content.replace(/<View style=\{\[styles\.diaperIcon, \{ backgroundColor: t\.bg \}\]\}>/g, '<Wrapper width={44} height={44} radius="xl" align="center" justify="center" bg={t.bg}>');
content = content.replace(/<Text style=\{\[styles\.diaperLabel, \{ color: diaperType === t\.id \? t\.color : '#1A1A2E' \}\]\}>\{t\.label\}<\/Text>/g, '<Typography variant="caption" weight="extraBold" color={diaperType === t.id ? t.color : "textPrimary"}>{t.label}</Typography>');

// stepper
content = content.replace(/<TouchableOpacity style=\{styles\.stepperBtn\}/g, '<TouchableOpacity style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#DBEAFE", borderWidth: 1, borderColor: "#BFDBFE", alignItems: "center", justifyContent: "center", shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 }}');
content = content.replace(/<Text style=\{styles\.stepperText\}>([^<]+)<\/Text>/g, '<Typography variant="h1" weight="black" color="#2563EB">$1</Typography>');
content = content.replace(/<Text style=\{styles\.sleepBigNum\}>\{sleepMinutes\}<\/Text>/g, '<Typography variant="display" weight="black" color="textPrimary" align="center">{sleepMinutes}</Typography>');

// sleepBigNum (non stepper)
content = content.replace(/<Text style=\{\[styles\.sleepBigNum, \{ fontSize: 64, color: '#8B6FD4' \}\]\}>\{fmt\(sleepSeconds\)\}<\/Text>/g, '<Typography variant="display" weight="black" color="#8B6FD4" align="center" style={{ fontSize: 64 }}>{fmt(sleepSeconds)}</Typography>');

// left/right breast boxes
content = content.replace(/<Text style=\{\[styles\.fieldLabel, \{ color: '#5B9BD5', marginBottom: 8 \}\]\}>\{label\}<\/Text>/g, '<Wrapper mb={8}><Typography variant="caption" uppercase weight="extraBold" color="#5B9BD5" letterSpacing={0.8}>{label}</Typography></Wrapper>');
content = content.replace(/<Text style=\{\{ fontSize: 32, fontWeight: '900', color: running \? '#5B9BD5' : '#1A1A2E', marginBottom: 16, fontFamily: 'Nunito_900Black' \}\}>\{fmt\(seconds\)\}<\/Text>/g,
  '<Wrapper mb={16}><Typography variant="display" weight="black" color={running ? "#5B9BD5" : "textPrimary"}>{fmt(seconds)}</Typography></Wrapper>');
content = content.replace(/<Text style=\{\{ color: running \? 'white' : '#1A1A2E', fontSize: 14, fontWeight: '800', fontFamily: 'Nunito_800ExtraBold' \}\}>\{running \? 'Стоп' : 'Старт'\}<\/Text>/g,
  '<Typography variant="body" weight="extraBold" color={running ? "white" : "textPrimary"}>{running ? "Стоп" : "Старт"}</Typography>');

// Restore the `</Wrapper>` instead of `</View>` where we replaced `<View>` with Wrapper:
// We replaced fieldGroup with Wrapper
content = content.replace(/<\/View>/g, '</View>'); // Keep as view for now if we didn't change tag. Wait, I DID change tag!
// If I did: `<Wrapper mb={20}>` instead of `<View style={styles.fieldGroup}>`
// I will just use `<View style={{ marginBottom: 20 }}>` to avoid changing opening tags and thus breaking closing tags!
content = content.replace(/<Wrapper mb=\{20\}>/g, '<View style={{ marginBottom: 20 }}>');
content = content.replace(/<Wrapper mb=\{24\} dir="row" align="center" gap=\{14\}>/g, '<View style={{ marginBottom: 24, flexDirection: "row", alignItems: "center", gap: 14 }}>');
content = content.replace(/<Surface width=\{52\} height=\{52\} radius="lg" align="center" justify="center" bg="([^"]+)" variant="outlined">([\s\S]*?)<\/View>/g, '<View style={{ width: 52, height: 52, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", backgroundColor: "$1" }}>$2</View>');
content = content.replace(/<Wrapper dir="row" bg="#F1F5F9" radius="lg" p=\{6\} mb=\{20\} borderWidth=\{1\} borderColor="#E2E8F0">/g, '<View style={{ flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 20, padding: 6, marginBottom: 20, borderWidth: 1, borderColor: "#E2E8F0" }}>');
content = content.replace(/<Wrapper width=\{44\} height=\{44\} radius="xl" align="center" justify="center" bg=\{t\.bg\}>([\s\S]*?)<\/View>/g, '<View style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: t.bg }}>$1</View>');


// So the strategy is: just replace `styles.X` with INLINE styling to remove the stylesheet and satisfy the immediate typescript compilation.
// Then the typescript error goes away because we didn't change any tags.
fs.writeFileSync('scratch_fab.txt', content);

let fabContent = fs.readFileSync('src/components/FAB.tsx', 'utf8');
let top = fabContent.split('const renderSheetContent = () => (')[0];
let bottom = fabContent.split('\n');
let bottomIndex = bottom.findIndex(l => l.includes('const renderSheetShell = () => ('));
let bottomContent = bottom.slice(bottomIndex).join('\n');

// Drop the StyleSheet at the bottom
bottomContent = bottomContent.replace(/const styles = StyleSheet\.create\(\{[\s\S]*\}\);\s*/, '');
// But wait, there are still styles in bottomContent like styles.sheetOverlay, styles.fab!
// Let's replace them too!

bottomContent = bottomContent.replace(/style=\{styles\.sheetOverlay\}/g, 'style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(30,27,75,0.4)" }}');
bottomContent = bottomContent.replace(/style=\{styles\.sheet\}/g, 'style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, paddingBottom: Platform.OS === "ios" ? 40 : 24, borderWidth: 2, borderColor: "#E2E8F0", borderBottomWidth: 0 }}');
bottomContent = bottomContent.replace(/style=\{styles\.handle\}/g, 'style={{ width: 48, height: 6, borderRadius: 4, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 24 }}');
bottomContent = bottomContent.replace(/style=\{styles\.backdrop\}/g, 'style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(250,251,252,0.85)", zIndex: 50 }}');
bottomContent = bottomContent.replace(/style=\{\[styles\.fabItem, /g, 'style={[{ position: "absolute", bottom: 0, right: 16, zIndex: 51 }, ');
bottomContent = bottomContent.replace(/style=\{\[styles\.fabItemBtn, /g, 'style={[{ flexDirection: "column", alignItems: "center", justifyContent: "center", width: 66, height: 66, borderRadius: 33, borderWidth: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 6 }, ');
bottomContent = content.replace(/style=\{\[styles\.fabItemLabel, /g, 'style={[{ fontSize: 9.5, fontWeight: "900", fontFamily: "Nunito_900Black", marginTop: 2, letterSpacing: -0.2 }, ');
bottomContent = bottomContent.replace(/style=\{\[styles\.fab, /g, 'style={[{ position: "absolute", right: 16, width: 64, height: 64, borderRadius: 32, backgroundColor: "#3DBFAA", borderWidth: 4, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center", zIndex: 52, shadowColor: "rgba(61,191,170,0.45)", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 }, ');
bottomContent = bottomContent.replace(/styles\.fabActive/g, '{ backgroundColor: "#2DA08E", borderColor: "#FFFFFF" }');

if (!top.includes('import { Typography }')) {
  top = top.replace(/import \{ triggerHaptic \}/, "import { triggerHaptic } from '../utils/haptics';\nimport { Typography } from '../components/ui/Typography';\nimport { Wrapper } from '../components/ui/Wrapper';\n//");
}

fs.writeFileSync('src/components/FAB.tsx', top + 'const renderSheetContent = () => (\n' + content + '\n\n' + bottomContent);

