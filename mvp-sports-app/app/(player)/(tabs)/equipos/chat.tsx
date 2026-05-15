import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput, Image,
    StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator,
    StyleSheet, Dimensions, BackHandler
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
    ChevronLeft, Send, User, Shield, MessageCircle, Users, Smile
} from 'lucide-react-native';
import { useAuth } from '../../../../store/useAuth';
import { chatService, ChatMessage } from '../../../../services/chatService';
import { teamService } from '../../../../services/teamService';

const { width } = Dimensions.get('window');

const COLORS = {
    light: {
        bg: '#F8FAFC',
        card: '#FFFFFF',
        border: '#E2E8F0',
        text: '#0F172A',
        sub: '#64748B'
    },
    dark: {
        bg: '#020617',
        card: '#0F172A',
        border: '#1E293B',
        text: '#F8FAFC',
        sub: '#94A3B8'
    },
    accent: '#f97316', // Orange for Team Identity
    success: '#10b981'
};

export default function ChatEquiposScreen() {
    const { teamId, teamName } = useLocalSearchParams();
    const router = useRouter();
    const { user, profile, theme } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? COLORS.dark : COLORS.light;
    const scrollRef = useRef<ScrollView>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [team, setTeam] = useState<any>(null);

    useFocusEffect(
        React.useCallback(() => {
            if (!teamId) return;

            teamService.getTeamById(teamId as string).then(t => setTeam(t));

            const unsubscribe = chatService.subscribeToMessages(
                teamId as string,
                (msgs) => {
                    setMessages(msgs);
                    setLoading(false);
                    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
                }
            );

            const backAction = () => { router.back(); return true; };
            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

            return () => {
                unsubscribe();
                backHandler.remove();
            };
        }, [teamId])
    );

    const handleSend = useCallback(async () => {
        if (!newMessage.trim() || !user || sending) return;
        const text = newMessage.trim();
        setNewMessage('');
        setSending(true);
        try {
            await chatService.sendMessage(teamId as string, {
                senderId: user.uid,
                senderName: profile?.displayName || user.displayName || 'Jugador',
                senderPhoto: profile?.photoURL || user.photoURL || undefined,
                text,
            });
        } catch (error) {
            setNewMessage(text);
        } finally {
            setSending(false);
        }
    }, [newMessage, user, teamId, sending, profile]);

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* HEADER PRO */}
            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <ChevronLeft color={COLORS.accent} size={24} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 20 }}>
                    <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', textTransform: 'uppercase' }} numberOfLines={1}>{teamName || team?.name || 'Sala de Chat'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success, marginRight: 6 }} />
                        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{team?.members?.length || 0} Jugadores en Línea</Text>
                    </View>
                </View>
                <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: COLORS.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield color={COLORS.accent} size={22} />
                </View>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color={COLORS.accent} size="large" />
                    </View>
                ) : (
                    <ScrollView ref={scrollRef} style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingVertical: 30 }} showsVerticalScrollIndicator={false}>
                        {messages.length === 0 ? (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 }}>
                                <View style={{ width: 80, height: 80, borderRadius: 30, backgroundColor: COLORS.accent + '11', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                    <MessageCircle color={COLORS.accent} size={35} />
                                </View>
                                <Text style={{ color: C.sub, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', textAlign: 'center', letterSpacing: 2 }}>Sala de estrategia lista.{'\n'}Inicia el chat con tu equipo.</Text>
                            </View>
                        ) : (
                            messages.map((msg, i) => {
                                const isMe = msg.senderId === user?.uid;
                                return (
                                    <View key={msg.id || i} style={{ flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 15 }}>
                                        {!isMe && (
                                            <View style={{ width: 35, height: 35, borderRadius: 12, overflow: 'hidden', backgroundColor: C.border, marginRight: 10 }}>
                                                {msg.senderPhoto ? <Image source={{ uri: msg.senderPhoto }} style={{ width: '100%', height: '100%' }} /> : <User color="white" size={20} />}
                                            </View>
                                        )}
                                        <View style={{ maxWidth: width * 0.7 }}>
                                            {!isMe && <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4, marginLeft: 5 }}>{msg.senderName}</Text>}
                                            <View style={{ 
                                                backgroundColor: isMe ? COLORS.accent : (isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'),
                                                padding: 15, borderRadius: 20, borderBottomRightRadius: isMe ? 4 : 20, borderBottomLeftRadius: isMe ? 20 : 4,
                                                borderWidth: isMe ? 0 : 1, borderColor: C.border
                                            }}>
                                                <Text style={{ color: isMe ? 'white' : C.text, fontSize: 15, fontWeight: '600', lineHeight: 20 }}>{msg.text}</Text>
                                            </View>
                                            <Text style={{ color: C.sub, fontSize: 8, fontWeight: '800', marginTop: 5, textAlign: isMe ? 'right' : 'left' }}>{formatTime(msg.createdAt)}</Text>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
                )}

                {/* INPUT BAR */}
                <View style={{ padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 25, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 20, paddingHorizontal: 20, height: 55, justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                            <TextInput 
                                value={newMessage} 
                                onChangeText={setNewMessage} 
                                placeholder="Escribe un mensaje..." 
                                placeholderTextColor={C.sub}
                                style={{ color: C.text, fontSize: 16, fontWeight: '600' }}
                                multiline
                            />
                        </View>
                        <TouchableOpacity 
                            onPress={handleSend}
                            disabled={!newMessage.trim() || sending}
                            style={{ width: 55, height: 55, borderRadius: 20, backgroundColor: newMessage.trim() ? COLORS.accent : (isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9'), alignItems: 'center', justifyContent: 'center', marginLeft: 15, shadowColor: COLORS.accent, shadowOpacity: newMessage.trim() ? 0.3 : 0, shadowRadius: 10 }}
                        >
                            {sending ? <ActivityIndicator color="white" /> : <Send color={newMessage.trim() ? 'white' : C.sub} size={20} />}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}
