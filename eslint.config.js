const eslintConfig = require("@akashic/eslint-config");

module.exports = [
    ...eslintConfig,
    {
        files: ["src/**/*.ts", "spec/**/*.ts"],
        languageOptions: {
            sourceType: "module",
            parserOptions: {
                project: "tsconfig.eslint.json",
            },
        },
        ignores: ["**/*.js"]
    }
];
