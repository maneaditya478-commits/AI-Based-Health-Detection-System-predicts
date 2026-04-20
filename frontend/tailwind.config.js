/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0b1220',
                card: '#1f2937',
                border: 'rgba(255,255,255,0.14)',
                green: '#22c55e',
                yellow: '#fbbf24',
                red: '#ef4444'
            }
        },
    },
    plugins: [],
}
