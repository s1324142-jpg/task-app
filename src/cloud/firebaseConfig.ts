// FirebaseのWebクライアント設定は公開情報であり、WebとAndroidで同じ
// Firebaseプロジェクトを参照するために使用する。秘密鍵はここへ置かない。
export const bundledFirebaseConfig = {
  apiKey: 'AIzaSyBaWi7hf5JNEn9NiJshS0tAxNEQ1vpNNd4',
  authDomain: 'project-kadai-fd50e.firebaseapp.com',
  projectId: 'project-kadai-fd50e',
  storageBucket: 'project-kadai-fd50e.firebasestorage.app',
  messagingSenderId: '78215000883',
  appId: '1:78215000883:web:d3bca5c228226927410446',
  measurementId: 'G-R60MEZFYBS',
} as const;

export const bundledAndroidFirebaseConfig = {
  ...bundledFirebaseConfig,
  apiKey: 'AIzaSyDQtHD7ulI6ZzQUARfiTCLzphqeDMjB1XU',
  appId: '1:78215000883:android:c3e2a8a7b75c6985410446',
} as const;

export const bundledGoogleWebClientId = '78215000883-uavrmmnsk3i838mtjura6idsnr0536as.apps.googleusercontent.com';
