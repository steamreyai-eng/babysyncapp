const fs = require('fs');

let content = fs.readFileSync('src/screens/AIScreen.tsx', 'utf8');

// 1. Consent Screen replacing
content = content.replace(/<View style=\{styles\.consentContainer\}>([\s\S]*?)<\/View>\s*<\/View>\s*\);/g, 
  `<Wrapper flex={1} bg="#FAFBFC" justify="center" px={24}>
        <Surface bg="white" radius="xl" p={28} borderWidth={1.5} borderColor="#F0ECE8" variant="elevated" align="center">
          <Wrapper width={72} height={72} radius="card" bg="#EEF2FF" align="center" justify="center" mb={16}>
            <Ionicons name="shield-checkmark" size={40} color="#6366F1" />
          </Wrapper>
          <Wrapper mb={4}><Typography variant="h2" weight="black" color="textPrimary">AI-ассистент</Typography></Wrapper>
          <Wrapper mb={20}><Typography variant="body" weight="bold" color="textMuted">Согласие на обработку данных</Typography></Wrapper>

          <Surface width="100%" bg="#F8FAFC" radius="lg" p={16} mb={24} variant="flat">
            <Typography variant="body" weight="bold" color="#334155" style={{ lineHeight: 20 }}>
              AI-ассистент BabySync использует OpenAI для анализа данных вашего ребёнка и предоставления персонализированных рекомендаций.
            </Typography>
            <Typography variant="body" weight="bold" color="#334155" style={{ lineHeight: 20 }} mt={12}>
              <Typography variant="body" weight="black">Что передаётся:</Typography>
              {'\\n'}• Возраст ребёнка (в месяцах) и пол
              {'\\n'}• Статистика кормлений, сна, подгузников
              {'\\n'}• Данные роста и веса
            </Typography>
            <Typography variant="body" weight="bold" color="#334155" style={{ lineHeight: 20 }} mt={12}>
              <Typography variant="body" weight="black" color="#059669">Что НЕ передаётся:</Typography>
              {'\\n'}• Имя ребёнка и родителей
              {'\\n'}• Дата рождения и город
              {'\\n'}• Email и другие личные данные
            </Typography>
            <Typography variant="tiny" weight="bold" color="textMuted" mt={12}>
              Данные обрабатываются через серверную функцию Supabase и не сохраняются на серверах OpenAI.
              Советы AI не являются медицинским диагнозом.
            </Typography>
          </Surface>

          <Surface as={TouchableOpacity} width="100%" dir="row" align="center" justify="center" gap={8} bg="#6366F1" radius="lg" py={16} mb={12} variant="elevated" onPress={handleAcceptConsent}>
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Typography variant="body" weight="black" color="white">Согласен, начать</Typography>
          </Surface>

          <TouchableOpacity onPress={handleDeclineConsent} style={{ paddingVertical: 12 }}>
            <Typography variant="body" weight="bold" color="textMuted">Не сейчас</Typography>
          </TouchableOpacity>
        </Surface>
      </Wrapper>
    );`);

// 2. Header
content = content.replace(/<View style=\{styles\.header\}>([\s\S]*?)<\/View>\s*<\/View>\s*<\/View>/g,
  `<Wrapper dir="row" align="center" gap={12} px={16} pt={16} pb={12} bg="rgba(255,255,255,0.75)">
          <LinearGradient
              colors={['#F0E8FF', '#DBCDF0']}
              start={{x:0,y:0}} end={{x:1,y:1}}
              style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' }}
          >
              <Ionicons name="sparkles" size={22} color="#8B6FD4" />
          </LinearGradient>
          <Wrapper>
              <Typography variant="h2" weight="black" color="textPrimary" letterSpacing={-0.5}>AI-Ассистент</Typography>
              <Wrapper dir="row" align="center" gap={6} mt={2}>
                  <Wrapper width={8} height={8} radius="xs" bg="#3DBFAA" />
                  <Typography variant="tiny" weight="bold" color="#3DBFAA">Онлайн · знает малыша</Typography>
              </Wrapper>
          </Wrapper>
      </Wrapper>`);

// 3. Offline Banner
content = content.replace(/\{!isOnline && \([\s\S]*?<View style=\{styles\.offlineBanner\}>[\s\S]*?<Ionicons name="wifi" size=\{18\} color="#D94F4F" \/>[\s\S]*?<Text style=\{styles\.offlineText\}>Интернета нет\. AI-функции недоступны\.<\/Text>[\s\S]*?<\/View>[\s\S]*?\)\}/g,
  `{!isOnline && (
          <Wrapper mx={16} mb={8} px={16} py={12} bg="#FFF0F0" radius="lg" borderWidth={1} borderColor="rgba(217, 79, 79, 0.2)" dir="row" align="center" gap={8}>
              <Ionicons name="wifi" size={18} color="#D94F4F" />
              <Typography variant="body" weight="bold" color="#D94F4F">Интернета нет. AI-функции недоступны.</Typography>
          </Wrapper>
      )}`);

// 4. Quick Actions
content = content.replace(/<View>\s*<ScrollView horizontal showsHorizontalScrollIndicator=\{false\} contentContainerStyle=\{styles\.quickActionsContainer\}>([\s\S]*?)<\/ScrollView>\s*<\/View>/g,
  `<Wrapper>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
              {quickPrompts.map((qp, i) => (
                  <Surface as={TouchableOpacity} key={i} bg="rgba(255,255,255,0.7)" radius="card" px={16} py={10} borderWidth={1} borderColor="#F0ECE8" variant="elevated" onPress={() => sendMessage(qp)}>
                      <Typography variant="tiny" weight="extraBold" color="#8B6FD4">{qp}</Typography>
                  </Surface>
              ))}
          </ScrollView>
      </Wrapper>`);

// 5. Input Bar
content = content.replace(/<View style=\{styles\.inputBar\}>([\s\S]*?)<\/View>/g,
  `<Wrapper dir="row" align="flex-end" gap={8} px={16} pb={8} pt={4}>
        <TextInput
          style={{ flex: 1, backgroundColor: 'white', borderRadius: 24, paddingLeft: 20, paddingRight: 48, paddingTop: 14, paddingBottom: 14, fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#1A1A2E', maxHeight: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 2, borderWidth: 1, borderColor: '#F5F0E6' }}
          value={input}
          onChangeText={setInput}
          placeholder="Ваш вопрос..."
          placeholderTextColor="#A8A8B6"
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage(input)}
          blurOnSubmit
        />
        <Surface as={TouchableOpacity} width={38} height={38} radius="card" align="center" justify="center" variant="elevated"
          bg={(!input.trim() || loading) ? '#A8A8B6' : '#8B6FD4'}
          style={{ position: 'absolute', right: 24, bottom: 14, zIndex: 10, opacity: (!input.trim() || loading) ? 0.5 : 1 }}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={16} color="white" />
        </Surface>
      </Wrapper>`);

content = content.replace(/<Text style=\{styles\.disclaimerText\}>([\s\S]*?)<\/Text>/g,
  `<Wrapper pb={12} align="center">
      <Typography variant="tiny" weight="extraBold" color="textMuted" align="center">
          <Ionicons name="sparkles" size={10} color="#6B6B80" /> Не заменяет консультацию врача
      </Typography>
   </Wrapper>`);

// 6. Messages list containers and bubbles
content = content.replace(/style=\{styles\.messages\}/g, "style={{ flex: 1 }}");
content = content.replace(/style=\{\[styles\.bubbleWrap, msg\.role === 'user' \? styles\.userWrap : styles\.aiWrap\]\}/g,
  "style={[{ flexDirection: 'row', marginBottom: 16, maxWidth: '90%', alignItems: 'flex-end' }, msg.role === 'user' ? { alignSelf: 'flex-end', justifyContent: 'flex-end' } : { alignSelf: 'flex-start' }] }");

// user bubble
content = content.replace(/style=\{\[styles\.bubble, styles\.userBubble\]\}/g, "style={{ paddingHorizontal: 16, paddingVertical: 12, zIndex: 1, borderRadius: 20, borderBottomRightRadius: 4, shadowColor: '#764BA2', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 }}");
content = content.replace(/<Text style=\{\[styles\.bubbleText, styles\.userBubbleText\]\}>\{msg\.text\}<\/Text>/g, "<Typography variant=\"body\" weight=\"extraBold\" color=\"white\" style={{ lineHeight: 20 }}>{msg.text}</Typography>");

// ai bubble
content = content.replace(/style=\{\[styles\.bubble, styles\.aiBubble\]\}/g, "style={{ paddingHorizontal: 16, paddingVertical: 12, zIndex: 1, borderRadius: 20, borderBottomLeftRadius: 4, backgroundColor: 'rgba(255,255,255,0.9)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 2, borderWidth: 1, borderColor: '#F0ECE8' }}");
content = content.replace(/<Text style=\{\[styles\.bubbleText, styles\.aiBubbleText\]\}>\{msg\.text\}<\/Text>/g, "<Typography variant=\"body\" weight=\"bold\" color=\"textPrimary\" style={{ lineHeight: 20 }}>{msg.text}</Typography>");

// Loading bubble
content = content.replace(/style=\{\[styles\.bubbleWrap, styles\.aiWrap\]\}/g, "style={{ flexDirection: 'row', marginBottom: 16, maxWidth: '90%', alignItems: 'flex-end', alignSelf: 'flex-start' }}");
content = content.replace(/style=\{\[styles\.bubble, styles\.aiBubble, \{ flexDirection: 'row', alignItems: 'center' \}\]\}/g, "style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, zIndex: 1, borderRadius: 20, borderBottomLeftRadius: 4, backgroundColor: 'rgba(255,255,255,0.9)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 2, borderWidth: 1, borderColor: '#F0ECE8' }}");

content = content.replace(/style=\{styles\.aiAvatar\}/g, "style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8, zIndex: 2, borderWidth: 1.5, borderColor: 'white', shadowColor: '#8B6FD4', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 }}");

content = content.replace(/style=\{styles\.container\}/g, 'style={{ flex: 1, backgroundColor: "#FAFBFC" }}');
content = content.replace(/style=\{styles\.keyboardView\}/g, 'style={{ flex: 1 }}');

// Delete StyleSheet
content = content.replace(/const styles = StyleSheet\.create\(\{[\s\S]*?\}\);/g, '');

if (!content.includes('import { Wrapper }')) {
   content = content.replace(/import \{ LinearGradient \} from 'expo-linear-gradient';/g, "import { LinearGradient } from 'expo-linear-gradient';\nimport { Wrapper } from '../components/ui/Wrapper';\nimport { Surface } from '../components/ui/Surface';\nimport { Typography } from '../components/ui/Typography';");
}

fs.writeFileSync('src/screens/AIScreen.tsx', content);

