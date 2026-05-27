const { FlatCompat } = require("@eslint/eslintrc");
const reactNative = require("eslint-plugin-react-native");

// Initialize compatibility tool
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  {
    languageOptions: {
      globals: {
        __dirname: "readonly",
      },
    },
  },
  // Define target files for the analysis
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
  },
  // Translate the old Expo configuration to Flat Config format
  ...compat.extends("eslint-config-expo"),
  {
    plugins: {
      "react-native": reactNative,
    },
    rules: {
      // Main rule to detect unused styles in your home.tsx
      "react-native/no-unused-styles": "error",
      "react-native/no-inline-styles": "warn",
      "react-native/no-color-literals": "off",
    },
  },
  {
    // Define directory exclusions
    ignores: [
      "**/node_modules/**",
      "**/.expo/**",
      "**/web-build/**",
      "babel.config.js",
      "metro.config.js",
    ],
  },
];
