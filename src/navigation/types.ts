import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';
export type TabParams = { Home: undefined; Today: undefined; Calendar: undefined; Assignments: undefined; Settings: undefined };
export type RootStackParams = {
  Main: NavigatorScreenParams<TabParams> | undefined;
  Detail: { id: string };
  Editor: { id?: string } | undefined;
  Theme: undefined;
  ManabaLogin: { baseUrl: string; authenticatedOrigin?: string; mode: 'login' | 'sessionCheck' | 'sync'; autoStart?: boolean };
};
export type RootNavigation = NativeStackNavigationProp<RootStackParams>;
