import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function Layout() {
  return (
    // SafeAreaProvider keeps content inside safe screen areas.
    <SafeAreaProvider>
      {/* The stack registers all app screens used by Expo Router. */}
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
        {/* Each screen name matches a file inside the app folder. */}
        <Stack.Screen name="index" options={{ title: "Login" }} />
        <Stack.Screen name="register" options={{ title: "Registro" }} />
        <Stack.Screen name="home" options={{ title: "Inicio" }} />
        <Stack.Screen name="profile" options={{ title: "Perfil" }} />
        <Stack.Screen name="settings" options={{ title: "Configuración" }} />
        <Stack.Screen name="edit-profile" options={{ title: "Editar Perfil" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
