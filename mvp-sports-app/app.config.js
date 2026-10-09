export default ({ config }) => ({
  ...config,
  "expo": {
    "name": "MVP Sports Chile",
    "slug": "mvp-sports-app",
    "version": "1.19.9",
    "updates": {
      "url": "https://u.expo.dev/9190ee5c-d6b5-49e4-b455-3e1e533d4eef"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "mvpdeportes",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/images/icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.mvp.deportes",
      "buildNumber": "199",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Esta app usa tu ubicación para encontrar canchas deportivas cercanas",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Esta app necesita acceso continuo a tu ubicación para notificarte sobre reservas cercanas",
        "NSCameraUsageDescription": "Esta app usa la cámara para escanear códigos QR",
        "NSPhotoLibraryUsageDescription": "Permite a MVP Sports acceder a tu galería para guardar tu carta de jugador.",
        "NSPhotoLibraryAddUsageDescription": "Permite a MVP Sports guardar tu MVP Card en tu carrete."
      },
      "config": {
        "googleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      }
    },
    "android": {
      "package": "com.mvp.deportes",
      "versionCode": 199,
      "adaptiveIcon": {
        "backgroundColor": "#0F172A",
        "foregroundImage": "./assets/images/adaptive-icon.png"
      },
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "INTERNET",
        "CAMERA",
        "VIBRATE",
        "WRITE_EXTERNAL_STORAGE",
        "READ_EXTERNAL_STORAGE",
        "READ_MEDIA_IMAGES",
        "READ_MEDIA_VIDEO"
      ],
      "softwareKeyboardLayoutMode": "pan",
      "config": {
        "googleMaps": {
          "apiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      }
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "MVP Deportes necesita acceso a tu ubicación para mostrarte canchas cercanas."
        }
      ],
      [
        "expo-media-library",
        {
          "photosPermission": "Permite a MVP Sports acceder a tu galería.",
          "savePhotosPermission": "Permite a MVP Sports guardar tu MVP Card.",
          "isAccessMediaLocationEnabled": true
        }
      ],
      "@react-native-community/datetimepicker"
    ],
    "extra": {
      "eas": {
        "projectId": "9190ee5c-d6b5-49e4-b455-3e1e533d4eef"
      },
      "firebase": {
        "apiKey": process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        "authDomain": process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        "projectId": process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        "storageBucket": process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        "messagingSenderId": process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        "appId": process.env.EXPO_PUBLIC_FIREBASE_APP_ID
      }
    }
  }
});
