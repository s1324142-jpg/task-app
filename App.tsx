import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AppProvider, useApp } from './src/state/AppContext';
import { RootStackParams, TabParams } from './src/navigation/types';
import { HomeScreen } from './src/screens/HomeScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { ListScreen } from './src/screens/ListScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { EditorScreen } from './src/screens/EditorScreen';
import { ManabaLoginScreen } from './src/screens/ManabaLoginScreen';
import { ThemeScreen } from './src/screens/ThemeScreen';
import { Button, ThemeBackground } from './src/ui/components';
import { ThemeProvider, useTheme } from './src/themes/ThemeContext';
import { AuthProvider } from './src/cloud/AuthContext';

const Stack = createNativeStackNavigator<RootStackParams>();
const Tabs = createBottomTabNavigator<TabParams>();
const navigation = createNavigationContainerRef<RootStackParams>();
const icons: Record<keyof TabParams, React.ComponentProps<typeof Feather>['name']> = { Home: 'home', Today: 'check-square', Calendar: 'calendar', Assignments: 'list', Settings: 'settings' };
function MainTabs() {
  const { theme, styles: s } = useTheme(); const colors = theme.colors;
  return <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}><Tabs.Navigator screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.navigation, borderTopColor: colors.border, paddingTop: 8, ...(theme.id === 'sparklePink' ? { height: 68, paddingBottom: 8, borderTopLeftRadius: 22, borderTopRightRadius: 22 } : {}) },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
    tabBarIcon: ({ color, size }) => <Feather name={icons[route.name]} size={size - 2} color={color} />,
  })}>
    <Tabs.Screen name="Home" component={HomeScreen} options={{ title: 'ホーム' }} />
    <Tabs.Screen name="Today" component={TodayScreen} options={{ title: theme.id === 'sparklePink' ? '今日' : 'TODO' }} />
    <Tabs.Screen name="Calendar" component={CalendarScreen} options={{ title: 'カレンダー' }} />
    <Tabs.Screen name="Assignments" component={ListScreen} options={{ title: theme.id === 'sparklePink' ? '課題' : '課題一覧' }} />
    <Tabs.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
  </Tabs.Navigator></SafeAreaView>;
}
function Root() {
  const { data, error, retry } = useApp();
  const { theme, styles: s } = useTheme(); const colors = theme.colors;
  const pending = React.useRef<string | null>(null);
  const handleResponse = React.useCallback((response: Notifications.NotificationResponse | null) => {
    const id = response?.notification.request.content.data?.assignmentId;
    if (typeof id !== 'string') return;
    if (navigation.isReady()) navigation.navigate('Detail', { id }); else pending.current = id;
    void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  }, []);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void Notifications.getLastNotificationResponseAsync().then(handleResponse).catch(() => undefined);
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, [handleResponse]);
  if (error) return <SafeAreaView style={[s.screen, s.content, { justifyContent: 'center' }]}><Text style={s.heading}>読み込みに失敗しました</Text><Text style={s.text}>{error}</Text><Button title="再試行" onPress={() => { void retry(); }} /></SafeAreaView>;
  if (!data) return <View style={[s.screen, { alignItems: 'center', justifyContent: 'center', gap: 20 }]}><Text style={s.title}>suke</Text><ActivityIndicator color={colors.green} accessibilityLabel="読み込み中" /></View>;
  return <ThemeBackground><NavigationContainer ref={navigation} theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.green, background: theme.decoration === 'sparkle' ? 'transparent' : colors.background, card: colors.paper, text: colors.ink, border: colors.border } }} onReady={() => {
    if (pending.current) { navigation.navigate('Detail', { id: pending.current }); pending.current = null; }
  }}>
    <Stack.Navigator screenOptions={{ headerTintColor: colors.green, headerShadowVisible: false, headerStyle: { backgroundColor: colors.background }, contentStyle: { backgroundColor: theme.decoration === 'sparkle' ? 'transparent' : colors.background } }}>
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Detail" component={DetailScreen} options={{ title: '課題詳細' }} />
      <Stack.Screen name="Editor" component={EditorScreen} options={({ route }) => ({ title: route.params?.id ? '課題を編集' : '課題を追加' })} />
      <Stack.Screen name="Theme" component={ThemeScreen} options={{ title: 'テーマ・壁紙' }} />
      <Stack.Screen name="ManabaLogin" component={ManabaLoginScreen} options={({ route }) => ({ title: route.params.mode === 'sync' ? 'manaba課題を同期' : 'manabaにログイン', gestureEnabled: false })} />
    </Stack.Navigator>
  </NavigationContainer></ThemeBackground>;
}
export default function App() {
  return <SafeAreaProvider><StatusBar style="dark" /><ThemeProvider><AuthProvider><AppProvider><Root /></AppProvider></AuthProvider></ThemeProvider></SafeAreaProvider>;
}
