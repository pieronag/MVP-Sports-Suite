import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    ActivityIndicator, StatusBar, StyleSheet, Modal,
    KeyboardAvoidingView, Platform, Dimensions, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
    ChevronLeft, Mail, AlertCircle, CheckCircle2, 
    Shield, Activity, Sparkles, ArrowRight, Smartphone, User
} from 'lucide-react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../store/useAuth';
import { auditService } from '../../services/auditService';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const COLORS = {
    light: {
        bg: '#F8FAFC',
        card: '#FFFFFF',
        border: '#E2E8F0',
        text: '#0F172A',
        sub: '#64748B',
        inputBg: '#F1F5F9'
    },
    dark: {
        bg: '#020617',
        card: '#0F172A',
        border: '#1E293B',
        text: '#F8FAFC',
        sub: '#94A3B8',
        inputBg: '#1E293B'
    },
    accent: '#10b981' // Verde esmeralda insignia
};

const CATEGORIES = [
    { id: 'Bug', label: 'Error (Bug)', color: '#ef4444' },
    { id: 'Pago', label: 'Pago / Cobros', color: '#3b82f6' },
    { id: 'Sugerencia', label: 'Sugerencia', color: '#ec4899' },
    { id: 'Soporte', label: 'Soporte', color: '#10b981' },
    { id: 'Otro', label: 'Otro', color: '#64748b' }
];

const PRIORITIES = [
    { id: 'Baja', label: 'Baja', color: '#10b981' },
    { id: 'Media', label: 'Media', color: '#f59e0b' },
    { id: 'Alta', label: 'Alta', color: '#f97316' },
    { id: 'Crítica', label: 'Crítica', color: '#ef4444' }
];

export default function ReporteScreen() {
    const router = useRouter();
    const { user, theme, profile } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? COLORS.dark : COLORS.light;
    const accent = COLORS.accent;

    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Form states
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState('Bug');
    const [priority, setPriority] = useState('Media');
    const [screen, setScreen] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState('');

    // Focus states for premium border highlighting
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!subject.trim()) {
            setErrorMsg('El asunto principal es requerido.');
            return;
        }
        if (!description.trim()) {
            setErrorMsg('Por favor describe detalladamente la incidencia.');
            return;
        }

        setSubmitting(true);
        setErrorMsg('');

        try {
            const actorName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Jugador';
            const deviceDetails = `OS: ${Platform.OS} ${Platform.Version}, Brand/Model: ${Platform.select({ ios: 'Apple Device', android: 'Android Device' })}, App Version: 1.0.0`;

            const reportData = {
                subject: subject.trim(),
                category,
                priority,
                screen: screen.trim() || 'No especificada',
                description: description.trim(),
                stepsToReproduce: steps.trim() || 'No especificados',
                status: 'Abierto',
                // Actor Info
                userId: user?.uid || 'anonimo',
                userEmail: user?.email || 'anonimo@mvpsports.cl',
                userName: actorName,
                userRole: 'player',
                // Tenant Info (for mobile players this is global)
                tenantId: 'system_player',
                tenantName: 'App Móvil - Jugador',
                // Technical Info (Device/Environment Info)
                userAgent: deviceDetails,
                browser: 'React Native Engine',
                os: Platform.OS === 'ios' ? 'iOS' : 'Android',
                screenResolution: `${Dimensions.get('screen').width}x${Dimensions.get('screen').height}`,
                windowSize: `${Dimensions.get('window').width}x${Dimensions.get('window').height}`,
                originUrl: 'app://(player)/reporte',
                device: 'Mobile App',
                sla: 100, // SLA inicial
                createdAt: serverTimestamp()
            };

            // 1. Guardar ticket en /reports
            const reportsRef = collection(db, 'reports');
            const docRef = await addDoc(reportsRef, reportData);

            // 2. Registrar en la bitácora de auditoría
            await auditService.logAuditEvent({
                action: 'REPORTE_INCIDENCIA_CREADO',
                module: 'Soporte Técnico',
                details: `Ticket N° ${docRef.id} creado desde App Móvil: "${subject.trim()}" (${priority})`,
                severity: priority === 'Crítica' ? 'HIGH' : 'LOW',
                status: 'SUCCESS',
                actor: actorName,
                role: 'player',
                email: user?.email || 'anonimo@mvpsports.cl'
            });

            setSuccess(true);
            setSubject('');
            setScreen('');
            setDescription('');
            setSteps('');
        } catch (error: any) {
            console.error("Error al enviar el reporte en móvil:", error);
            setErrorMsg('Hubo un problema al enviar el reporte. Por favor, reintenta.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            style={{ flex: 1, backgroundColor: C.bg }}
        >
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* HEADER */}
            <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : C.card, borderColor: C.border }]}
                >
                    <ChevronLeft color={accent} size={24} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: C.text }]}>Reportar Problema</Text>
                <View style={{ width: 44 }} />
            </View>

            {success ? (
                <View style={[styles.successContainer, { backgroundColor: C.bg }]}>
                    <View style={[styles.successIconWrapper, { backgroundColor: accent + '15', borderColor: accent + '30' }]}>
                        <CheckCircle2 color={accent} size={64} strokeWidth={1.5} />
                    </View>
                    <Text style={[styles.successTitle, { color: C.text }]}>¡Reporte Recibido!</Text>
                    <View style={[styles.successPill, { backgroundColor: accent }]}>
                        <Text style={styles.successPillText}>SOPORTE ACTIVO</Text>
                    </View>
                    <Text style={[styles.successDescription, { color: C.sub }]}>
                        Tu ticket se ha ingresado con éxito en nuestra central técnica. Nuestro equipo de soporte lo atenderá con prioridad según la urgencia indicada.
                    </Text>
                    <TouchableOpacity
                        onPress={() => setSuccess(false)}
                        style={[styles.successButton, { backgroundColor: accent }]}
                    >
                        <Text style={styles.successButtonText}>Reportar otro Problema</Text>
                        <ArrowRight color="white" size={16} style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={[styles.backHomeButton, { borderColor: C.border, backgroundColor: C.card }]}
                    >
                        <Text style={[styles.backHomeButtonText, { color: C.text }]}>Volver a Ajustes</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {errorMsg ? (
                        <View style={[styles.errorBox, { backgroundColor: isDark ? '#ef444415' : '#fef2f2', borderColor: '#ef444430' }]}>
                            <AlertCircle color="#ef4444" size={20} />
                            <Text style={styles.errorText}>{errorMsg}</Text>
                        </View>
                    ) : null}

                    {/* INTRO BANNER */}
                    <LinearGradient
                        colors={[accent, '#059669']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.banner}
                    >
                        <View style={styles.bannerHeader}>
                            <View style={styles.bannerIconContainer}>
                                <Mail color="white" size={20} />
                            </View>
                            <Text style={styles.bannerBadge}>SLA GARANTIZADO</Text>
                        </View>
                        <Text style={styles.bannerTitle}>Centro de Ayuda MVP</Text>
                        <Text style={styles.bannerSubtitle}>Reporta bugs o incidencias en la app directamente a nuestro equipo de desarrollo.</Text>
                    </LinearGradient>

                    {/* CATEGORY SELECTOR */}
                    <Text style={[styles.sectionTitle, { color: accent }]}>Categoría del Problema</Text>
                    <View style={styles.pillsContainer}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => setCategory(cat.id)}
                                style={[
                                    styles.pill,
                                    { 
                                        backgroundColor: category === cat.id ? cat.color : C.card,
                                        borderColor: category === cat.id ? cat.color : C.border 
                                    }
                                ]}
                            >
                                <Text 
                                    style={[
                                        styles.pillText, 
                                        { color: category === cat.id ? 'white' : C.text }
                                    ]}
                                >
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* PRIORITY SELECTOR */}
                    <Text style={[styles.sectionTitle, { color: accent }]}>Gravedad / Prioridad</Text>
                    <View style={styles.pillsContainer}>
                        {PRIORITIES.map((prio) => (
                            <TouchableOpacity
                                key={prio.id}
                                onPress={() => setPriority(prio.id)}
                                style={[
                                    styles.pill,
                                    { 
                                        backgroundColor: priority === prio.id ? prio.color : C.card,
                                        borderColor: priority === prio.id ? prio.color : C.border
                                    }
                                ]}
                            >
                                <Text 
                                    style={[
                                        styles.pillText, 
                                        { color: priority === prio.id ? 'white' : C.text }
                                    ]}
                                >
                                    {prio.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ASUNTO INPUT */}
                    <Text style={[styles.inputLabel, { color: C.sub }]}>ASUNTO PRINCIPAL *</Text>
                    <View style={[
                        styles.inputWrapper, 
                        { 
                            backgroundColor: C.card, 
                            borderColor: focusedField === 'subject' ? accent : C.border 
                        }
                    ]}>
                        <TextInput
                            placeholder="EJ. ERROR AL CONFIRMAR PARTIDO"
                            placeholderTextColor={C.sub + '80'}
                            value={subject}
                            onChangeText={setSubject}
                            onFocus={() => setFocusedField('subject')}
                            onBlur={() => setFocusedField(null)}
                            style={[styles.textInput, { color: C.text }]}
                            autoCapitalize="characters"
                        />
                    </View>

                    {/* PANTALLA INPUT */}
                    <Text style={[styles.inputLabel, { color: C.sub }]}>PANTALLA O SECCIÓN DONDE OCURRIÓ (OPCIONAL)</Text>
                    <View style={[
                        styles.inputWrapper, 
                        { 
                            backgroundColor: C.card, 
                            borderColor: focusedField === 'screen' ? accent : C.border 
                        }
                    ]}>
                        <TextInput
                            placeholder="EJ. ESTADISTICAS / MENU PRINCIPAL"
                            placeholderTextColor={C.sub + '80'}
                            value={screen}
                            onChangeText={setScreen}
                            onFocus={() => setFocusedField('screen')}
                            onBlur={() => setFocusedField(null)}
                            style={[styles.textInput, { color: C.text }]}
                            autoCapitalize="characters"
                        />
                    </View>

                    {/* DESCRIPCION INPUT */}
                    <Text style={[styles.inputLabel, { color: C.sub }]}>DESCRIPCIÓN DETALLADA *</Text>
                    <View style={[
                        styles.inputWrapper, 
                        styles.textAreaWrapper,
                        { 
                            backgroundColor: C.card, 
                            borderColor: focusedField === 'description' ? accent : C.border 
                        }
                    ]}>
                        <TextInput
                            placeholder="EXPLICA AQUÍ DETALLADAMENTE QUÉ SUCEDIÓ..."
                            placeholderTextColor={C.sub + '80'}
                            value={description}
                            onChangeText={setDescription}
                            onFocus={() => setFocusedField('description')}
                            onBlur={() => setFocusedField(null)}
                            style={[styles.textArea, { color: C.text }]}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    {/* PASOS INPUT */}
                    <Text style={[styles.inputLabel, { color: C.sub }]}>PASOS PARA REPRODUCIR EL BUG (OPCIONAL)</Text>
                    <View style={[
                        styles.inputWrapper, 
                        styles.textAreaWrapper,
                        { 
                            backgroundColor: C.card, 
                            borderColor: focusedField === 'steps' ? accent : C.border 
                        }
                    ]}>
                        <TextInput
                            placeholder="EJ: 1. IR A JUGAR, 2. CLICK EN EDITAR, 3. DAR CLICK EN GUARDAR Y VER ERROR..."
                            placeholderTextColor={C.sub + '80'}
                            value={steps}
                            onChangeText={setSteps}
                            onFocus={() => setFocusedField('steps')}
                            onBlur={() => setFocusedField(null)}
                            style={[styles.textArea, { color: C.text }]}
                            multiline
                            numberOfLines={3}
                            autoCapitalize="characters"
                        />
                    </View>

                    {/* DIAGNOSTIC METADATA BOX */}
                    <View style={[styles.diagnosticsBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F1F5F9', borderColor: C.border }]}>
                        <View style={styles.diagnosticsHeader}>
                            <Smartphone color={accent} size={16} />
                            <Text style={[styles.diagnosticsTitle, { color: C.text }]}>Información de Diagnóstico</Text>
                        </View>
                        <Text style={[styles.diagnosticsSubtitle, { color: C.sub }]}>
                            Los siguientes metadatos se enviarán automáticamente en segundo plano para asistir al equipo técnico:
                        </Text>

                        <View style={styles.diagRow}>
                            <View style={styles.diagLabelContainer}>
                                <Activity color={C.sub} size={12} />
                                <Text style={[styles.diagLabel, { color: C.sub }]}>Sistema Operativo</Text>
                            </View>
                            <Text style={[styles.diagVal, { color: C.text }]}>{Platform.OS} {Platform.Version}</Text>
                        </View>

                        <View style={styles.diagRow}>
                            <View style={styles.diagLabelContainer}>
                                <User color={C.sub} size={12} />
                                <Text style={[styles.diagLabel, { color: C.sub }]}>Usuario Reportante</Text>
                            </View>
                            <Text style={[styles.diagVal, { color: C.text }]} numberOfLines={1}>{profile?.displayName || user?.displayName || user?.email || 'Jugador'}</Text>
                        </View>

                        <View style={styles.diagRow}>
                            <View style={styles.diagLabelContainer}>
                                <Shield color={C.sub} size={12} />
                                <Text style={[styles.diagLabel, { color: C.sub }]}>Rol de Cuenta</Text>
                            </View>
                            <Text style={[styles.diagVal, { color: accent }]}>PLAYER</Text>
                        </View>
                    </View>

                    {/* SUBMIT BUTTON */}
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={submitting}
                        activeOpacity={0.8}
                        style={[styles.submitButton, { backgroundColor: accent, opacity: submitting ? 0.6 : 1 }]}
                    >
                        {submitting ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <>
                                <Text style={styles.submitButtonText}>Enviar Reporte Técnico</Text>
                                <ArrowRight color="white" size={18} style={{ marginLeft: 10 }} />
                            </>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: -0.5
    },
    scrollContent: {
        padding: 30,
        paddingBottom: 60
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 18,
        borderWidth: 1,
        marginBottom: 20
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 10,
        flex: 1
    },
    banner: {
        borderRadius: 30,
        padding: 25,
        marginBottom: 30,
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 6
    },
    bannerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15
    },
    bannerIconContainer: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    bannerBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        color: 'white',
        fontSize: 8,
        fontWeight: '900',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        letterSpacing: 0.5
    },
    bannerTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5
    },
    bannerSubtitle: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 6,
        lineHeight: 16
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginTop: 5,
        marginBottom: 12
    },
    pillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 25
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    pillText: {
        fontSize: 12,
        fontWeight: '800'
    },
    inputLabel: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 5
    },
    inputWrapper: {
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 16,
        height: 52,
        justifyContent: 'center',
        marginBottom: 20
    },
    textAreaWrapper: {
        height: 100,
        paddingVertical: 12,
        justifyContent: 'flex-start'
    },
    textInput: {
        fontSize: 15,
        fontWeight: '700',
        padding: 0
    },
    textArea: {
        fontSize: 15,
        fontWeight: '700',
        padding: 0,
        height: '100%',
        textAlignVertical: 'top'
    },
    diagnosticsBox: {
        borderRadius: 25,
        borderWidth: 1,
        padding: 20,
        marginBottom: 35,
    },
    diagnosticsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    diagnosticsTitle: {
        fontSize: 13,
        fontWeight: '900',
        marginLeft: 8,
        textTransform: 'uppercase',
        letterSpacing: -0.2
    },
    diagnosticsSubtitle: {
        fontSize: 11,
        fontWeight: '600',
        lineHeight: 15,
        marginBottom: 15
    },
    diagRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(100, 116, 139, 0.08)'
    },
    diagLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    diagLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginLeft: 6
    },
    diagVal: {
        fontSize: 11,
        fontWeight: '800',
        maxWidth: width * 0.4
    },
    submitButton: {
        height: 60,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 6
    },
    submitButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40
    },
    successIconWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        borderWidth: 2
    },
    successTitle: {
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 12
    },
    successPill: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
        marginBottom: 20
    },
    successPillText: {
        color: 'white',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1.5
    },
    successDescription: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 300,
        marginBottom: 35
    },
    successButton: {
        height: 60,
        width: '100%',
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: 15
    },
    successButtonText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    backHomeButton: {
        height: 60,
        width: '100%',
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1
    },
    backHomeButtonText: {
        fontWeight: '900',
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    }
});
