const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Enable Tailwind CSS support
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;