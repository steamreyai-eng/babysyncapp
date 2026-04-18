import React, { useState } from 'react';
import { TouchableOpacity, Modal, View, ViewStyle } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import AIScreen from '../screens/AIScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeviceEventEmitter } from 'react-native';

import { Wrapper } from './ui/Wrapper';
import { Typography } from './ui/Typography';
import { Surface } from './ui/Surface';
import { COLORS, SHADOWS } from '../lib/theme';

const bubbleStyle: ViewStyle = {
  position: 'absolute',
  left: 16,
  zIndex: 59,
  elevation: 59,
  width: 52,
  height: 52,
  borderRadius: 26,
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.6)',
  shadowColor: '#8B6FD4',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 16,
  alignItems: 'center',
  justifyContent: 'center',
};

const modalContentStyle: ViewStyle = {
  flex: 1,
  backgroundColor: 'rgba(250, 248, 245, 0.95)',
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -8 },
  shadowOpacity: 0.15,
  shadowRadius: 32,
  elevation: 10,
};

const closeBtnStyle: ViewStyle = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 10,
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: '#F1F5F9',
  alignItems: 'center',
  justifyContent: 'center',
};

const AIBubble = () => {
    const [open, setOpen] = useState(false);
    const insets = useSafeAreaInsets();

    React.useEffect(() => {
        const listener = DeviceEventEmitter.addListener('openAIBubble', () => setOpen(true));
        return () => listener.remove();
    }, []);

    return (
        <>
            <TouchableOpacity
                style={[bubbleStyle, { bottom: 60 + insets.bottom + 16 }]}
                onPress={() => setOpen(true)}
                activeOpacity={0.8}
            >
                <Sparkles size={20} color="#8B6FD4" strokeWidth={1.5} style={{ marginBottom: 2 }} />
                <Typography variant="caption" weight="extraBold" color="#8B6FD4" style={{ fontSize: 10, lineHeight: 10 }}>
                  AI
                </Typography>
            </TouchableOpacity>

            <Modal
                visible={open}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setOpen(false)}
            >
                <Wrapper flex={1} justify="flex-end" bg="rgba(0,0,0,0.4)">
                    <View style={[modalContentStyle, { marginTop: insets.top + 40 }]}>
                        <Wrapper width={40} height={5} bg="#CBD5E1" radius="sm" style={{ borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 8 }} />
                        <TouchableOpacity style={closeBtnStyle} onPress={() => setOpen(false)}>
                             <X size={24} color="#1A1A2E" strokeWidth={1.5} />
                        </TouchableOpacity>
                        <View style={{ flex: 1, overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
                            <AIScreen />
                        </View>
                    </View>
                </Wrapper>
            </Modal>
        </>
    );
};

export default AIBubble;
