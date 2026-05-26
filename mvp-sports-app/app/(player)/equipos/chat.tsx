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
import { useAuth } from '../../../store/useAuth';
import { chatService, ChatMessage } from '../../../services/chatService';
import { teamService } from '../../../services/teamService';
import { userService } from '../../../services/userService';

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
            if (!teamId || !user) return;

            teamService.getTeamById(teamId as string).then(t => setTeam(t));
            userService.markChatAsRead(user.uid, teamId as string);

            const unsubscribe = chatService.subscribeToMessages(
                teamId as string,
                (msgs) => {
                    setMessages(msgs);
                    setLoading(false);
                    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
                    userService.markChatAsRead(user.uid, teamId as string);
                }
            );

            return () => {
                unsubscribe();
            };
        }, [teamId, user])
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

    const groupMessagesByDate = (msgs: ChatMessage[]) => {
        const groups: { dateLabel: string, messages: ChatMessage[] }[] = [];
        let currentLabel = '';
        msgs.forEach(msg => {
            if (!msg.createdAt) return;
            let date;
            try {
                date = msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
            } catch { return; }
            
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let label = date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
            if (date.toDateString() === today.toDateString()) label = 'Hoy';
            else if (date.toDateString() === yesterday.toDateString()) label = 'Ayer';

            if (label !== currentLabel) {
                groups.push({ dateLabel: label, messages: [msg] });
                currentLabel = label;
            } else {
                groups[groups.length - 1].messages.push(msg);
            }
        });
        return groups;
    };

    const groupedMessages = groupMessagesByDate(messages);

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
                        {groupedMessages.length === 0 ? (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 }}>
                                <View style={{ width: 80, height: 80, borderRadius: 30, backgroundColor: COLORS.accent + '11', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                    <MessageCircle color={COLORS.accent} size={35} />
                                </View>
                                <Text style={{ color: C.sub, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', textAlign: 'center', letterSpacing: 2 }}>Sala de estrategia lista.{'\n'}Inicia el chat con tu equipo.</Text>
                            </View>
                        ) : (
                            groupedMessages.map((group, gIdx) => (
                                <View key={`group-${gIdx}`}>
                                    {/* SEPARADOR DE FECHA TIPO WHATSAPP */}
                                    <View style={{ alignItems: 'center', marginVertical: 15 }}>
                                        <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 }}>
                                            <Text style={{ color: C.sub, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{group.dateLabel}</Text>
                                        </View>
                                    </View>
                                    
                                    {group.messages.map((msg, i) => {
                                        const isMe = msg.senderId === user?.uid;
                                        return (
                                            <View key={msg.id || i} style={{ flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                                                {!isMe && (
                                                    <View style={{ width: 30, height: 30, borderRadius: 10, overflow: 'hidden', backgroundColor: C.border, marginRight: 8, alignSelf: 'flex-end' }}>
                                                        {msg.senderPhoto ? <Image source={{ uri: msg.senderPhoto }} style={{ width: '100%', height: '100%' }} /> : <User color="white" size={18} />}
                                                    </View>
                                                )}
                                                <View style={{ maxWidth: width * 0.75 }}>
                                                    {!isMe && <Text style={{ color: C.sub, fontSize: 10, fontWeight: '800', marginBottom: 2, marginLeft: 2 }}>{msg.senderName}</Text>}
                                                    <View style={{ 
                                                        backgroundColor: isMe ? COLORS.accent : (isDark ? '#1E293B' : '#FFFFFF'),
                                                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, 
                                                        borderBottomRightRadius: isMe ? 4 : 16, borderBottomLeftRadius: isMe ? 16 : 4,
                                                        borderWidth: isDark || isMe ? 0 : 1, borderColor: '#E2E8F0',
                                                        flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap'
                                                    }}>
                                                        <Text style={{ color: isMe ? 'white' : C.text, fontSize: 15, fontWeight: '500', lineHeight: 20, marginRight: 10, marginBottom: 2 }}>{msg.text}</Text>
                                                        <Text style={{ color: isMe ? 'rgba(255,255,255,0.7)' : C.sub, fontSize: 9, fontWeight: '700', alignSelf: 'flex-end' }}>{formatTime(msg.createdAt)}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            ))
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
