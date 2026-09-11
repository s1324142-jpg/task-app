import { NativeStackNavigationProp } from '@react-navigation/native-stack';
export type RootStackParams = {
  Main: undefined;
  Detail: { id: string };
  Editor: { id?: string } | undefined;
  ManabaLogin: { baseUrl: string; authenticatedOrigin?: string; mode: 'login' | 'sessionCheck' };
};
export type RootNavigation = NativeStackNavigationProp<RootStackParams>;
export type TabParams = { Home: undefined; Today: undefined; Calendar: undefined; Assignments: undefined; Settings: undefined };
