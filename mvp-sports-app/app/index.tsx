import { Redirect } from 'expo-router';
import { useAuth } from '../store/useAuth';
import { View, ActivityIndicator } from 'react-native';

export default function EntryIndex() {
    const { user, role, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    if (!user) {
        return <Redirect href="/login" />;
    }

    // Solo el Manager tiene acceso al panel administrativo instrumental
    if (role === 'manager') {
        return <Redirect href="/(owner)" />;
    }

    return <Redirect href="/(player)" />;
}
