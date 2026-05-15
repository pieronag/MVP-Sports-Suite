export const LEVEL_SYSTEM = {
    CANTERANO: {
        key: 'CANTERANO',
        name: 'Canterano',
        minReservations: 0,
        maxReservations: 5,
        monthlyTokens: 1,
        discountPercentage: 10,
        color: '#9E9E9E',
        gradient: ['#9E9E9E', '#757575'],
        icon: '🌱',
        badge: 'rookie',
        description: 'Comienza tu viaje deportivo',
        benefits: ['1 token mensual', '10% descuento'],
        nextLevelAt: 6
    },
    TITULAR: {
        key: 'TITULAR',
        name: 'Titular',
        minReservations: 6,
        maxReservations: 15,
        monthlyTokens: 2,
        discountPercentage: 15,
        color: '#4CAF50',
        gradient: ['#4CAF50', '#388E3C'],
        icon: '⭐',
        badge: 'regular',
        description: 'Jugador regular, siempre en la cancha',
        benefits: ['2 tokens mensuales', '15% descuento', 'Reservas prioritarias'],
        nextLevelAt: 16
    },
    CAPITAN: {
        key: 'CAPITAN',
        name: 'Capitán',
        minReservations: 16,
        maxReservations: 30,
        monthlyTokens: 3,
        discountPercentage: 20,
        color: '#2196F3',
        gradient: ['#2196F3', '#1976D2'],
        icon: '👑',
        badge: 'leader',
        description: 'Líder natural, organiza los partidos',
        benefits: ['3 tokens mensuales', '20% descuento', 'Reservas grupales'],
        nextLevelAt: 31
    },
    ESTRELLA: {
        key: 'ESTRELLA',
        name: 'Estrella',
        minReservations: 31,
        maxReservations: 50,
        monthlyTokens: 4,
        discountPercentage: 25,
        color: '#FF9800',
        gradient: ['#FF9800', '#F57C00'],
        icon: '🌟',
        badge: 'star',
        description: 'Destacado en todas las canchas',
        benefits: ['4 tokens mensuales', '25% descuento', 'Acceso VIP'],
        nextLevelAt: 51
    },
    MVP: {
        key: 'MVP',
        name: 'MVP',
        minReservations: 51,
        maxReservations: 75,
        monthlyTokens: 5,
        discountPercentage: 30,
        color: '#9C27B0',
        gradient: ['#9C27B0', '#7B1FA2'],
        icon: '🏅',
        badge: 'mvp',
        description: 'Jugador Más Valioso de la plataforma',
        benefits: ['5 tokens mensuales', '30% descuento', 'Soporte premium'],
        nextLevelAt: 76
    },
    CAMPEON: {
        key: 'CAMPEON',
        name: 'Campeón',
        minReservations: 76,
        maxReservations: 100,
        monthlyTokens: 6,
        discountPercentage: 35,
        color: '#FF5722',
        gradient: ['#FF5722', '#D84315'],
        icon: '🏆',
        badge: 'champion',
        description: 'Campeón indiscutible de las reservas',
        benefits: ['6 tokens mensuales', '35% descuento', 'Invitados gratis'],
        nextLevelAt: 101
    },
    BALON_DE_ORO: {
        key: 'BALON_DE_ORO',
        name: 'Balón de Oro',
        minReservations: 101,
        maxReservations: 150,
        monthlyTokens: 8,
        discountPercentage: 40,
        color: '#FFD700',
        gradient: ['#FFD700', '#FFC107'],
        icon: '⚽',
        badge: 'golden_ball',
        description: 'Élite absoluta del deporte',
        benefits: ['8 tokens mensuales', '40% descuento', 'Reservas ilimitadas'],
        nextLevelAt: 151
    },
    LEYENDA: {
        key: 'LEYENDA',
        name: 'Leyenda',
        minReservations: 151,
        maxReservations: 9999,
        monthlyTokens: 10,
        discountPercentage: 50,
        color: '#E91E63',
        gradient: ['#E91E63', '#C2185B'],
        icon: '⚡',
        badge: 'legend',
        description: 'Leyenda viviente de la plataforma',
        benefits: ['10 tokens mensuales', '50% descuento', 'Todos los beneficios VIP']
    }
};

export const COLORS = {
    PRIMARY: '#007AFF',
    PRIMARY_DARK: '#0056CC',
    SECONDARY: '#5856D6',
    SUCCESS: '#34C759',
    WARNING: '#FF9500',
    ERROR: '#FF3B30',
    INFO: '#5AC8FA',

    // Deportes
    FOOTBALL: '#1E88E5',
    TENNIS: '#43A047',
    BASKETBALL: '#E53935',
    PADDLE: '#FB8C00'
};

export const ELO_SYSTEM = {
    BRONZE: { name: 'Bronce', min: 0, max: 1000, color: '#CD7F32', gradient: ['#CD7F32', '#8B4513'] },
    SILVER: { name: 'Plata', min: 1001, max: 1500, color: '#C0C0C0', gradient: ['#C0C0C0', '#808080'] },
    GOLD: { name: 'Oro', min: 1501, max: 2000, color: '#FFD700', gradient: ['#FFD700', '#DAA520'] },
    PLATINUM: { name: 'Platino', min: 2001, max: 2500, color: '#E5E4E2', gradient: ['#E5E4E2', '#A9A9A9'] },
    DIAMOND: { name: 'Diamante', min: 2501, max: 3000, color: '#B9F2FF', gradient: ['#B9F2FF', '#00CED1'] },
    MASTER: { name: 'Maestro', min: 3001, max: 9999, color: '#FF0000', gradient: ['#FF0000', '#8B0000'] }
};
