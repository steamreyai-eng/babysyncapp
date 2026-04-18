const fs = require('fs');

let c = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');

c = c.replace(/import \{.*?\} from 'react-native';/, "$&\nimport { Wrapper } from '../components/ui/Wrapper';\nimport { Surface } from '../components/ui/Surface';\nimport { Typography } from '../components/ui/Typography';");

// Replace top level container
c = c.replace(/style=\{styles\.container\}/g, 'style={{ flex: 1, backgroundColor: "#FAFBFC", paddingHorizontal: 16, paddingTop: 16 }}');

// Replace standard titles
c = c.replace(/<Text style=\{styles\.title\}>/g, '<Typography variant="h1" weight="black" color="textPrimary" letterSpacing={-0.5} mb={0}>');
c = c.replace(/<Text style=\{styles\.subtitle\}>/g, '<Typography variant="body" weight="bold" color="textMuted" mb={20}>');

// Profile Card
c = c.replace(/style=\{styles\.profileCard\}/g, 'style={{ borderRadius: 24, padding: 20, marginBottom: 24, shadowColor: "#2563EB", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 32, elevation: 6 }}');

// Avatars inside profile
c = c.replace(/style=\{styles\.avatar\}/g, 'style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 2, borderColor: "rgba(255,255,255,0.4)", alignItems: "center", justifyContent: "center" }}');
c = c.replace(/<Text style=\{styles\.avatarText\}>/g, '<Typography variant="h1" weight="black" color="white" align="center">');

// Profile Texts
c = c.replace(/<Text style=\{\{ fontFamily: 'Nunito_900Black', fontSize: 24, color: 'white', letterSpacing: -0\.5 \}\}>/g, '<Typography variant="h2" weight="black" color="white" letterSpacing={-0.5}>');
c = c.replace(/<Text style=\{\{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: 'rgba\(255,255,255,0\.9\)' \}\}>/g, '<Typography variant="tiny" weight="extraBold" color="rgba(255,255,255,0.9)">');

// Buttons
c = c.replace(/style=\{styles\.editBtn\}/g, 'style={{ marginTop: 16, width: "100%", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.1)", paddingVertical: 12, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}');

// Inputs
c = c.replace(/style=\{styles\.inputGroup\}/g, 'style={{ marginBottom: 8 }}');
c = c.replace(/<Text style=\{styles\.inputLabel\}>/g, '<Typography variant="tiny" weight="bold" color="rgba(255,255,255,0.75)" mb={4}>');
c = c.replace(/style=\{styles\.input\}/g, 'style={{ width: "100%", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.25)", color: "white", fontSize: 14, fontFamily: "Nunito_800ExtraBold" }}');
c = c.replace(/style=\{\[styles\.input, \{ flex: 1 \}\]\}/g, 'style={{ flex: 1, width: "100%", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.25)", color: "white", fontSize: 14, fontFamily: "Nunito_800ExtraBold" }}');

// Parents Card
c = c.replace(/style=\{styles\.parentsCard\}/g, 'style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#F0ECE8" }}');
c = c.replace(/style=\{\[styles\.parentBadge, \{ backgroundColor: '#DBEAFE' \}\]\}/g, 'style={{ flex: 1, borderRadius: 16, padding: 16, alignItems: "center", backgroundColor: "#DBEAFE" }}');
c = c.replace(/style=\{\[styles\.parentBadge, \{ backgroundColor: '#F3E8FF' \}\]\}/g, 'style={{ flex: 1, borderRadius: 16, padding: 16, alignItems: "center", backgroundColor: "#F3E8FF" }}');

c = c.replace(/<Text style=\{\[styles\.parentBadgeLabel, \{ color: '(.*?)' \}\]\}>/g, '<Typography variant="tiny" weight="extraBold" uppercase letterSpacing={0.5} mb={4} color="$1" style={{ opacity: 0.8 }}>');
c = c.replace(/<Text style=\{\[styles\.parentBadgeName, \{ color: '(.*?)' \}\]\}>/g, '<Typography variant="h3" weight="black" color="$1">');

// Settings Section
c = c.replace(/<Text style=\{styles\.sectionCaption\}>/g, '<Typography variant="tiny" weight="extraBold" color="textMuted" uppercase letterSpacing={1} mb={8} px={4}>');
c = c.replace(/style=\{styles\.settingItem\}/g, 'style={{ flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: "white", padding: 16, borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0" }}');

c = c.replace(/style=\{\[styles\.settingIconWrap, \{ backgroundColor: (.*?) \}\]\}/g, 'style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: $1 }}');

c = c.replace(/<Text style=\{styles\.settingLabel\}>/g, '<Typography variant="body" weight="extraBold" color="textPrimary" mb={2}>');
c = c.replace(/<Text style=\{styles\.settingSub\}>/g, '<Typography variant="tiny" weight="bold" color="textMuted">');

// Logout / Delete
c = c.replace(/style=\{styles\.logoutBtn\}/g, 'style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, marginBottom: 8 }}');
c = c.replace(/<Text style=\{styles\.logoutBtnText\}>/g, '<Typography variant="body" weight="extraBold" color="#EF4444">');

c = c.replace(/style=\{styles\.deleteAccountBtn\}/g, 'style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, marginBottom: 32, backgroundColor: "#991B1B", borderRadius: 16, marginHorizontal: 32 }}');
c = c.replace(/<Text style=\{styles\.deleteAccountBtnText\}>/g, '<Typography variant="tiny" weight="extraBold" color="white">');

c = c.replace(/<Text style=\{styles\.footerText\}>/g, '<Typography variant="tiny" weight="bold" color="textMuted" align="center" mb={16}>');

// Strip out stylesheet completely so we don't cheat
c = c.replace(/const styles = StyleSheet\.create\(\{[\s\S]*?\}\);/g, '');

fs.writeFileSync('src/screens/SettingsScreen.tsx', c);
