import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

function RootNavigator() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      // Navigate to main tabs after login
      router.replace({
        pathname: "/(tabs)",
        params: { userId: user.uid }, // make sure your auth object has uid
      });
    } else {
      // Navigate to login if no user
      router.replace("/auth/Login");
    }
  }, [user]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Main tabs */}
      <Stack.Screen name="(tabs)" />
      {/* Auth screens */}
      <Stack.Screen name="auth/Login" options={{ title: "Sign In" }} />
      <Stack.Screen name="auth/SignUp" options={{ title: "Create Account" }} />
      <Stack.Screen
        name="auth/ForgotPassword"
        options={{ title: "Reset Password" }}
      />
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
