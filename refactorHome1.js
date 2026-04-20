const fs = require('fs');
const path = require('path');

const HOME_SCREEN_PATH = path.join(__dirname, 'src', 'screens', 'HomeScreen.tsx');
let fileContent = fs.readFileSync(HOME_SCREEN_PATH, 'utf8');

// 1. We will increase the paddingBottom of the ScrollView
fileContent = fileContent.replace(
  /contentContainerStyle=\{\{ paddingBottom: 120 \}\}/,
  'contentContainerStyle={{ paddingBottom: 160 }}'
);

// 2. We will replace all basic style props with Wrapper / Surface
fileContent = fileContent.replace(
  /<ScrollView \n\s*style=\{\{ flex: 1 \}\} /g,
  '<ScrollView style={{ flex: 1 }} '
);

// Replace inline style for Baby Avatar
fileContent = fileContent.replace(
  /<View style=\{\{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#3DBFAA', borderColor: '#F6F2EB', borderWidth: 2 \}\} \/>/,
  '<Wrapper position="absolute" bottom={-2} right={-2} width={16} height={16} radius={8} bg="#3DBFAA" borderColor="#F6F2EB" borderWidth={2} />'
);

// Replace Notification dot
fileContent = fileContent.replace(
  /<View style=\{\{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 3\.5, backgroundColor: '#D94F4F', borderColor: 'white', borderWidth: 1\.5 \}\} \/>/,
  '<Wrapper position="absolute" top={8} right={8} width={7} height={7} radius={3.5} bg="#D94F4F" borderColor="white" borderWidth={1.5} />'
);

// Replace Shift Panel "Передать" button
fileContent = fileContent.replace(
  /<View style=\{\{ backgroundColor: 'rgba\(255,255,255,0\.15\)', borderColor: 'rgba\(255,255,255,0\.4\)', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 \}\}>/g,
  '<Surface tone="transparent" bg="rgba(255,255,255,0.15)" borderColor="rgba(255,255,255,0.4)" borderWidth={1} px={16} py={8} radius="lg">'
);
fileContent = fileContent.replace(
  /<\/View>\n\s*<\/Wrapper>\n\s*<\/TouchableOpacity>/,
  '</Surface>\n            </Wrapper>\n          </TouchableOpacity>'
);


// Replace QuickCard width width=120
fileContent = fileContent.replace(
  /width=\{110\}/g,
  'width={120}'
);

// Replace QuickCard dot
fileContent = fileContent.replace(
  /<View style=\{\{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: card\.signalColor\.dot \}\} \/>/g,
  '<Wrapper position="absolute" top={10} right={10} width={8} height={8} radius={4} bg={card.signalColor.dot} />'
);

// Replace QuickCard dot map
fileContent = fileContent.replace(
  /<View key=\{i\} style=\{\{ width: activeDot === i \? 16 : 5, height: 5, borderRadius: 2\.5, backgroundColor: activeDot === i \? '#2563EB' : '#D1D5DB' \}\} \/>/g,
  '<Wrapper key={i} width={activeDot === i ? 16 : 5} height={5} radius={2.5} bg={activeDot === i ? "#2563EB" : "#D1D5DB"} />'
);

// Replace AI Bubble decoration
fileContent = fileContent.replace(
  /<View style=\{\{ position: 'absolute', top: -48, right: -48, width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba\(99, 102, 241, 0\.15\)', transform: \[\{ scale: 2 \}\] \}\} \/>/g,
  '<Wrapper position="absolute" top={-48} right={-48} width={128} height={128} radius={64} bg="rgba(99, 102, 241, 0.15)" />' // Removed transform scale: 2, instead we just make it bigger if needed, or Wrapper supports rest.style internally so it doesn't crash
);

fs.writeFileSync(HOME_SCREEN_PATH, fileContent, 'utf8');
console.log("Refactoring pass 1 applied to HomeScreen");
