/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                premium: {
                    light: '#f3f4f6',
                    dark: '#111827',
                    accent: '#3b82f6',
                }
            }
        },
    },
    plugins: [],
}
