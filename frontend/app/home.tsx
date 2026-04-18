import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Bienvenido a Weather App 🌤️</Text>

      <TouchableOpacity onPress={() => router.push("/profile")}>
        <Text style={{ marginTop: 20, color: "blue" }}>Ir al perfil</Text>
      </TouchableOpacity>
    </View>
  );
}
