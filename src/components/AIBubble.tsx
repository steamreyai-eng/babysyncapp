import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, DeviceEventEmitter } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AIScreen from '../screens/AIScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AIBubbleProps = {
    hidden?: boolean;
};

const AIBubble = ({ hidden = false }: AIBubbleProps) => {
    const [open, setOpen] = useState(false);
    const [payload, setPayload] = useState<any>(null);
    const insets = useSafeAreaInsets();

    React.useEffect(() => {
        const listener = DeviceEventEmitter.addListener('openAIBubble', (p) => {
            setPayload(p);
            setOpen(true);
        });
        return () => listener.remove();
    }, []);

    if (hidden) return null;

    return (
        <>
            <TouchableOpacity
                style={[styles.bubble, { bottom: 60 + insets.bottom + 16 }]}
                onPress={() => setOpen(true)}
                activeOpacity={0.8}
            >
                <View style={styles.bubbleInner}>
                    <Sparkles size={20} color="#8B6FD4" strokeWidth={1.5} style={{ marginBottom: 2 }} />
                    <Text style={styles.bubbleText}>AI</Text>
                </View>
            </TouchableOpacity>

            <Modal
                visible={open}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setOpen(false)}
            >
                <View
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { marginTop: insets.top + 40 }]}>
                        <View style={styles.handle} />
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
                             <X size={24} color="#1A1A2E" strokeWidth={1.5} />
                        </TouchableOpacity>
                        <View style={{ flex: 1, overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
                            <AIScreen initialPayload={payload} />
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    bubble: {
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
    },
    bubbleInner: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 26,
    },
    bubbleText: {
        fontSize: 10,
        fontFamily: 'Nunito_800ExtraBold',
        color: '#8B6FD4',
        lineHeight: 10,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
        flex: 1,
        backgroundColor: 'rgba(250, 248, 245, 0.95)',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.15,
        shadowRadius: 32,
        elevation: 10,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#CBD5E1',
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    closeBtn: {
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
    }
});

export default AIBubble;
