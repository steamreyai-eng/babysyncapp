const fs = require('fs');
const path = require('path');

const SETTINGS_SCREEN_PATH = path.join(__dirname, 'src', 'screens', 'SettingsScreen.tsx');
let fileContent = fs.readFileSync(SETTINGS_SCREEN_PATH, 'utf8');

// 1. ScrollView padding
fileContent = fileContent.replace(
  /contentContainerStyle=\{\{ paddingBottom: 100 \}\}/,
  'contentContainerStyle={{ paddingBottom: 160 }}'
);

// 2. Parents Wrapper -> Surface
fileContent = fileContent.replace(
  /<Wrapper flex=\{1\} p=\{16\} align="center" style=\{\{ borderRadius: RADIUS\.xl, backgroundColor: '#DBEAFE' \}\}>/g,
  '<Surface flex={1} p={16} align="center" radius="xl" bg="#DBEAFE">'
);
fileContent = fileContent.replace(
  /<Wrapper flex=\{1\} p=\{16\} align="center" style=\{\{ borderRadius: RADIUS\.xl, backgroundColor: '#F3E8FF' \}\}>/g,
  '<Surface flex={1} p={16} align="center" radius="xl" bg="#F3E8FF">'
);
fileContent = fileContent.replace(
  /<\/Wrapper>\n\s*<Wrapper flex=\{1\} p=\{16\} align="center" style=\{\{ borderRadius: RADIUS.xl, backgroundColor: '#F3E8FF' \}\}>/g,
  '</Surface>\n                <Surface flex={1} p={16} align="center" radius="xl" bg="#F3E8FF">' // Just to match the closing tag correctly? No, actually using regex with a lookahead is safer.
);

// We will just do a sweeping replace for the closing tags. Wait, since it's inside `<Wrapper dir="row" gap={12}>`, the children are `Wrapper`. Let's just use simple replaces.
fileContent = fileContent.replace(
  /<Wrapper flex=\{1\} p=\{16\} align="center" radius="xl" bg="#DBEAFE">\s*<Typography variant="tiny" weight="extraBold" color="#2563EB" uppercase letterSpacing=\{0\.5\} mb=\{4\}>Мама<\/Typography>\s*<Typography variant="body" weight="black" color="#2563EB">\{baby\?\.mom_name \|\| "Мама"\}<\/Typography>\s*<\/Wrapper>/g,
  '<Surface flex={1} p={16} align="center" radius="xl" bg="#DBEAFE">\n                  <Typography variant="tiny" weight="extraBold" color="#2563EB" uppercase letterSpacing={0.5} mb={4}>Мама</Typography>\n                  <Typography variant="body" weight="black" color="#2563EB">{baby?.mom_name || "Мама"}</Typography>\n               </Surface>'
);
fileContent = fileContent.replace(
  /<Wrapper flex=\{1\} p=\{16\} align="center" radius="xl" bg="#F3E8FF">\s*<Typography variant="tiny" weight="extraBold" color="#8B5CF6" uppercase letterSpacing=\{0\.5\} mb=\{4\}>Папа<\/Typography>\s*<Typography variant="body" weight="black" color="#8B5CF6">\{baby\?\.dad_name \|\| "Папа"\}<\/Typography>\s*<\/Wrapper>/g,
  '<Surface flex={1} p={16} align="center" radius="xl" bg="#F3E8FF">\n                  <Typography variant="tiny" weight="extraBold" color="#8B5CF6" uppercase letterSpacing={0.5} mb={4}>Папа</Typography>\n                  <Typography variant="body" weight="black" color="#8B5CF6">{baby?.dad_name || "Папа"}</Typography>\n               </Surface>'
);

// 3. Edit Profile Touchable
fileContent = fileContent.replace(
  /<TouchableOpacity onPress=\{([^}]+)\} activeOpacity=\{0\.8\}\s*style=\{\{\s*marginTop: 16, width: '100%', borderWidth: 1, borderColor: 'rgba\(255,255,255,0\.3\)',\s*backgroundColor: 'rgba\(255,255,255,0\.1\)', paddingVertical: 12, borderRadius: RADIUS\.lg,\s*flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,\s*\}\}>([\s\S]*?)<\/TouchableOpacity>/,
  '<Surface onPress={$1} activeOpacity={0.8} mt={16} width="100%" borderWidth={1} borderColor="rgba(255,255,255,0.3)" bg="rgba(255,255,255,0.1)" py={12} radius="lg" dir="row" align="center" justify="center" gap={8}>\n$2</Surface>'
);

// 4. Logout button
fileContent = fileContent.replace(
  /<TouchableOpacity onPress=\{([^}]+)\} style=\{\{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginBottom: 8 \}\} activeOpacity=\{0\.8\}>([\s\S]*?)<\/TouchableOpacity>/,
  '<Surface onPress={$1} dir="row" align="center" justify="center" py={16} mb={8} activeOpacity={0.8}>\n$2</Surface>'
);

// 5. Delete Account button
fileContent = fileContent.replace(
  /<TouchableOpacity onPress=\{handleDeleteAccount\} disabled=\{deleting\} activeOpacity=\{0\.8\}\s*style=\{\{\s*flexDirection: 'row', alignItems: 'center', justifyContent: 'center',\s*paddingVertical: 14, marginBottom: 32, marginHorizontal: 32,\s*backgroundColor: '#991B1B', borderRadius: RADIUS\.xl,\s*\}\}>([\s\S]*?)<\/TouchableOpacity>/,
  '<Surface onPress={handleDeleteAccount} disabled={deleting} activeOpacity={0.8} dir="row" align="center" justify="center" py={14} mb={32} mx={32} bg="#991B1B" radius="xl">\n$1</Surface>'
);

// Gender selection Touchable
fileContent = fileContent.replace(
  /<TouchableOpacity key=\{([^}]+)\} onPress=\{([^}]+)\}\s*style=\{\{ flex: 1, paddingVertical: 10, borderRadius: RADIUS\.lg, alignItems: 'center',\s*backgroundColor: ([^}]+)\s*\}\}\s*activeOpacity=\{0\.8\}>([\s\S]*?)<\/TouchableOpacity>/g,
  '<Surface key={$1} onPress={$2} flex={1} py={10} radius="lg" align="center" bg={$3} activeOpacity={0.8}>\n$4</Surface>'
);

// Edit buttons Touchable
fileContent = fileContent.replace(
  /<TouchableOpacity onPress=\{([^}]+)\}\s*style=\{\{ flex: 1, paddingVertical: 12, borderRadius: RADIUS\.lg, alignItems: 'center',\s*backgroundColor: 'rgba\(255,255,255,0\.1\)', borderWidth: 1, borderColor: 'rgba\(255,255,255,0\.2\)' \}\}\s*activeOpacity=\{0\.8\}>([\s\S]*?)<\/TouchableOpacity>/g,
  '<Surface onPress={$1} flex={1} py={12} radius="lg" align="center" bg="rgba(255,255,255,0.1)" borderWidth={1} borderColor="rgba(255,255,255,0.2)" activeOpacity={0.8}>\n$2</Surface>'
);

fileContent = fileContent.replace(
  /<TouchableOpacity onPress=\{([^}]+)\} disabled=\{saving\}\s*style=\{\{ flex: 2, paddingVertical: 12, borderRadius: RADIUS\.lg, backgroundColor: 'white',\s*flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 \}\}\s*activeOpacity=\{0\.8\}>([\s\S]*?)<\/TouchableOpacity>/g,
  '<Surface onPress={$1} disabled={saving} flex={2} py={12} radius="lg" bg="white" dir="row" align="center" justify="center" gap={6} activeOpacity={0.8}>\n$2</Surface>'
);

// Date picker Touchable
fileContent = fileContent.replace(
  /<TouchableOpacity onPress=\{([^}]+)\} style=\{\{ width: '100%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba\(255,255,255,0\.25\)', justifyContent: 'center' \}\}>([\s\S]*?)<\/TouchableOpacity>/g,
  '<Surface onPress={$1} width="100%" radius="lg" px={12} py={10} bg="rgba(255,255,255,0.25)" justify="center">\n$2</Surface>'
);

fs.writeFileSync(SETTINGS_SCREEN_PATH, fileContent, 'utf8');
console.log("Refactoring pass applied to SettingsScreen");
