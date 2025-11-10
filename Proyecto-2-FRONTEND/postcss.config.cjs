// PostCSS config: use tailwindcss + autoprefixer (CommonJS .cjs to avoid ESM/CommonJS conflicts)
module.exports = {
    plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
    ],
};
