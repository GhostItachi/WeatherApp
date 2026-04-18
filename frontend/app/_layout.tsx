import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function Layout() {
  return (
    <SafeAreaProvider>
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
        <Stack.Screen name="index" options={{ title: "Login" }} />
        <Stack.Screen name="register" options={{ title: "Registro" }} />
        <Stack.Screen name="home" options={{ title: "Inicio" }} />
        <Stack.Screen name="profile" options={{ title: "Perfil" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
