import 'dotenv/config';

export default {
  expo: {
    name: "konserve",
    slug: "konserve",
    version: "1.0.0",
    scheme: "konserveapp",
    platforms: ["ios", "android"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourcompany.konserve",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription: "This app uses your location to show nearby recycling points.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "This app uses your location to show nearby recycling points.",
        NSLocationAlwaysUsageDescription: "This app uses your location to show nearby recycling points.",
        NSCameraUsageDescription: "The app accesses your camera to let you take profile pictures.",
        NSPhotoLibraryUsageDescription: "The app accesses your photos to let you share them with your friends.",
        NSPhotoLibraryAddUsageDescription: "The app saves images to your photo library.",
      },
      associatedDomains: ["applinks:konserveapp.com"],
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
      intentFilters: [ 
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "konserveapp"
            },
            {
              scheme: "https",
              host: "*.konserveapp.com"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ],
    },
    plugins: [
      [
        "expo-image-picker",
        {
          photosPermission: "The app accesses your photos to let you share them with your friends.",
          cameraPermission: "The app accesses your camera to let you take profile pictures."
        }
      ],
      "expo-secure-store",
      "expo-web-browser"
    ],
    web: {
      favicon: "./assets/favicon.png"
    },
    assetBundlePatterns: [
      "**/*",
      "node_modules/react-native-vector-icons/Fonts/*"
    ],
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_KEY: process.env.SUPABASE_KEY,
      INTASEND_PUBLISHABLE_KEY: process.env.INTASEND_PUBLISHABLE_KEY,
      INTASEND_SECRET_KEY: process.env.INTASEND_SECRET_KEY,
      GOOGLE_MAPS_API_KEY_IOS: process.env.GOOGLE_MAPS_API_KEY_IOS,
      GOOGLE_MAPS_API_KEY_ANDROID: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
      NODE_ENV: process.env.NODE_ENV,
      APP_URL: process.env.APP_URL,
      INTASEND_TEST_MODE: process.env.INTASEND_TEST_MODE,
      PAYSTACK_SECRET_KEY:process.env.PAYSTACK_SECRET_KEY,
      PAYSTACK_PUBLIC_KEY:process.env.PAYSTACK_PUBLIC_KEY,
      GOOGLE_CLOUD_VISION_API_KEY: process.env.GOOGLE_CLOUD_VISION_API_KEY,
      eas: {
        projectId: "ef29d5bb-ca9f-4617-8f9d-0b8593503cb2",
      }
    }
  }
};

