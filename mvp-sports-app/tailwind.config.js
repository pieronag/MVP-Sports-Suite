/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        "./app/**/*.{js,jsx,ts,tsx}", 
        "./components/**/*.{js,jsx,ts,tsx}",
        "./src/**/*.{js,jsx,ts,tsx}"
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                regular: ['Inter', 'sans-serif'],
                medium: ['Inter', 'sans-serif'],
                semibold: ['Inter', 'sans-serif'],
                bold: ['Inter', 'sans-serif'],
                extrabold: ['Inter', 'sans-serif'],
                black: ['Inter', 'sans-serif'],
            },
            colors: {
                neon: {
                    emerald: '#10b981',
                    dark: '#0B0F19',
                    volt: '#ccff00',
                    cyan: '#00e0ff',
                },
                premium: {
                    deep: '#020617',
                    surface: '#0B0F19',
                    gray: '#64748B',
                    light: '#F8FAFC'
                }
            }
        },
    },
    plugins: [],
}
