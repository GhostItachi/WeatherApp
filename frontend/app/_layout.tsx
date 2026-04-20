import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function Layout() {
  return (
    // SafeAreaProvider helps the app respect notches and screen edges.
    <SafeAreaProvider>
      {/* Stack controls navigation between the app screens. */}
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#0f172a",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerShown: false,
        }}
      >
        {/* These are the routes used by Expo Router in this app. */}
        <Stack.Screen name="index" options={{ title: "Login" }} />
        <Stack.Screen name="register" options={{ title: "Registro" }} />
        <Stack.Screen name="home" options={{ title: "Inicio" }} />
        <Stack.Screen name="profile" options={{ title: "Perfil" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
