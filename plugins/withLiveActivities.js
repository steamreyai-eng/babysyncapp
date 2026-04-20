const { withInfoPlist, withEntitlementsPlist } = require('@expo/config-plugins');

const withLiveActivities = (config) => {
  // Update Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.NSSupportsLiveActivities = true;
    config.modResults.NSSupportsLiveActivitiesFrequentUpdates = true;
    return config;
  });

  // Example entry to allow proper background capabilities for iOS if needed
  config = withEntitlementsPlist(config, (config) => {
    return config;
  });

  return config;
};

module.exports = withLiveActivities;
