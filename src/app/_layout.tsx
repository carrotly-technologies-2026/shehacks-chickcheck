import {
  Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts,
} from '@expo-google-fonts/inter';
import { HostGrotesk_500Medium } from '@expo-google-fonts/host-grotesk';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PhoneFrame } from '../components/PhoneFrame';
import { colors } from '../theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, HostGrotesk_500Medium,
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.bottom }} />;

  return (
    <SafeAreaProvider>
      <PhoneFrame>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.bottom } }} />
      </PhoneFrame>
    </SafeAreaProvider>
  );
}
