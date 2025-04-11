import 'dotenv/config';

export default {
  expo: {
    name: "konserve",
    slug: "konserve",
    version: "1.0.0",
    sdkVersion: "52.0.0",
    platforms: ["ios", "android"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourcompany.konserve",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app uses your location to show nearby recycling points.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "This app uses your location to show nearby recycling points.",
        NSLocationAlwaysUsageDescription: "This app uses your location to show nearby recycling points.",
        NSCameraUsageDescription: "The app accesses your camera to let you take profile pictures.",
        NSPhotoLibraryUsageDescription: "The app accesses your photos to let you share them with your friends.",
        NSPhotoLibraryAddUsageDescription: "The app saves images to your photo library.",
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS,
      },
    },
    android: {
      package: "com.yourcompany.konserve",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION", 
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE" ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
        },
      },
    },
    plugins: [
      [
        "expo-image-picker",
        {
          photosPermission: "The app accesses your photos to let you share them with your friends.",
          cameraPermission: "The app accesses your camera to let you take profile pictures."
        }
      ]
    ],
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_KEY: process.env.SUPABASE_KEY,
    }
  }
};