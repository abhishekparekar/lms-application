const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withAndroidAbiFilters(config) {
  return withAppBuildGradle(config, (modConfig) => {
    const buildGradle = modConfig.modResults.contents;
    
    // Inject abiFilters to compile for all standard Android architectures (preventing crash on emulators and older devices)
    if (!buildGradle.includes('abiFilters')) {
      modConfig.modResults.contents = buildGradle.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {
        ndk {
            abiFilters "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
        }`
      );
    }
    return modConfig;
  });
};
