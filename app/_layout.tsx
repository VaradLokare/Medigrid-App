import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

function RootNavigator() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      // ✅ Navigate to tabs with user.id after login
      router.replace({
        pathname: "/(tabs)",
        params: { userId: user.uid }, // make sure you have `uid` or `id` in your auth object
      });
    } else {
      // ✅ Default: go to login
      router.replace("/auth/Login");
    }
  }, [user]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
