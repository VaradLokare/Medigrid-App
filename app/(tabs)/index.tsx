import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import GoogleFit, { Scopes } from "react-native-google-fit";
import { useAuth } from "../contexts/AuthContext";
import { signInWithGoogle } from "../firebase";
import useGoogleFit from "../hooks/useGoogleFit";



// Types
type HealthData = {
  heartRate: number;
  systolic: number;
  diastolic: number;
  steps: number;
  calories: number;
  distance: number;
  sleep: number;
  oxygen: number;
  lastUpdated: Date;
};

type SleepEntry = {
  startDate: string;
  endDate: string;
  [key: string]: any; // optional → allows extra fields from Google Fit
};

interface HealthAnalysis {
  status: "good" | "warning" | "bad";
  message: string;
}

interface HealthCardProps {
  title: string;
  value: string | number;
  unit: string;
  status?: "good" | "warning" | "bad";
  message?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  delay: number;
}

const { width } = Dimensions.get("window");

export default function HospitalDashboard() {
  const [sleepData, setSleepData] = useState<SleepEntry[]>([]);
  const { user, login } = useAuth();
const { steps, heartRate} = useGoogleFit();
  const [healthData, setHealthData] = useState<HealthData>({
    heartRate: 0,
    systolic: 0,
    diastolic: 0,
    steps: 0,
    calories: 0,
    distance: 0,
    sleep: 0,
    oxygen: 0,
    lastUpdated: new Date(),
  });

  useEffect(() => {
  let totalSleep = 0;

  if (Array.isArray(sleepData) && sleepData.length > 0) {
    totalSleep = sleepData.reduce((acc, entry) => {
      const start = new Date(entry.startDate).getTime();
      const end = new Date(entry.endDate).getTime();
      return acc + (end - start) / (1000 * 60 * 60); // convert ms → hours
    }, 0);
  }

  setHealthData((prev) => ({
    ...prev,
    heartRate:
      Array.isArray(heartRate) && heartRate.length > 0
        ? (heartRate[0] as any).value ?? prev.heartRate
        : typeof heartRate === "number"
        ? heartRate
        : prev.heartRate,
    steps: steps || prev.steps,
    sleep: totalSleep || prev.sleep,
    calories: Math.round((steps || 0) * 0.04),
    distance: parseFloat(((steps || 0) * 0.0008).toFixed(2)),
    lastUpdated: new Date(),
  }));
}, [steps, heartRate, sleepData]);


  const [analyses, setAnalyses] = useState<Record<string, HealthAnalysis>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initial animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  // Check if already connected to Google Fit
  useEffect(() => {
    if (Platform.OS === "android") {
      checkGoogleFitConnection();
    }
  }, []);

  const checkGoogleFitConnection = async () => {
  try {
    const isAuthorized = GoogleFit.isAuthorized; // ✅ no ()
    setIsConnected(isAuthorized);

    if (isAuthorized) {
      fetchGoogleFitData();
    }
  } catch (error) {
    console.log("Error checking Google Fit connection:", error);
  }
};

  // Connect to Google Fit with Firebase user
  const connectGoogleFit = async () => {
    if (Platform.OS !== "android") {
      Alert.alert("Info", "Google Fit is only available on Android devices.");
      return;
    }

    if (!user) {
      Alert.alert("Error", "Please sign in first.");
      return;
    }

    setIsLoading(true);
    try {
      // Authorize Google Fit
      const authResult = await GoogleFit.authorize({
        scopes: [
          Scopes.FITNESS_ACTIVITY_READ,
          Scopes.FITNESS_HEART_RATE_READ,
          Scopes.FITNESS_BODY_READ,
          Scopes.FITNESS_SLEEP_READ,
        ],
      });

      if (authResult.success) {
        console.log("✅ Google Fit connected");
        setIsConnected(true);
        Alert.alert("Success", "Google Fit connected successfully!");
        fetchGoogleFitData();
      } else {
        console.log("❌ Google Fit auth failed", authResult.message);
        Alert.alert("Connection Failed", "Could not connect to Google Fit.");
      }
    } catch (error) {
      console.log("Google Fit connection error:", error);
      Alert.alert("Error", "Failed to connect to Google Fit.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Google Fit data
  const fetchGoogleFitData = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date();
      
      // Get steps data
      const stepsData = await GoogleFit.getDailyStepCountSamples({
        startDate: todayStart.toISOString(),
        endDate: todayEnd.toISOString(),
      });
      
      let steps = 0;
      if (stepsData.length > 0 && stepsData[0].steps.length > 0) {
        steps = stepsData[0].steps[0].value;
      }

      // Get calories data
      const caloriesData = await GoogleFit.getDailyCalorieSamples({
        startDate: todayStart.toISOString(),
        endDate: todayEnd.toISOString(),
      });
      
      let calories = 0;
      if (caloriesData.length > 0) {
        calories = Math.round(caloriesData[0].calorie);
      }

      // Get distance data
      const distanceData = await GoogleFit.getDailyDistanceSamples({
        startDate: todayStart.toISOString(),
        endDate: todayEnd.toISOString(),
      });
      
      let distance = 0;
      if (distanceData.length > 0) {
        distance = Math.round(distanceData[0].distance * 10) / 10;
      }

      // Get heart rate data
      const heartRateData = await GoogleFit.getHeartRateSamples({
        startDate: new Date(Date.now() - 3600000).toISOString(),
        endDate: todayEnd.toISOString(),
      });
      
      let heartRate = 72;
      if (heartRateData.length > 0) {
        const latestReading = heartRateData.reduce((latest, current) => 
          new Date(current.endDate) > new Date(latest.endDate) ? current : latest
        );
        heartRate = Math.round(latestReading.value);
      }

      // Get sleep data
      const sleepData = await GoogleFit.getSleepSamples(
  {
    startDate: new Date(Date.now() - 86400000).toISOString(), // Last 24 hours
    endDate: todayEnd.toISOString(),
  },
  true // ✅ use true for local time zone, false if you want UTC
);

      
      let sleep = 6.5;
      if (sleepData.length > 0) {
        const totalSleepMs = sleepData.reduce((total, session) => {
          const start = new Date(session.startDate);
          const end = new Date(session.endDate);
          return total + (end.getTime() - start.getTime());
        }, 0);
        
        sleep = Math.round(totalSleepMs / 3600000 * 10) / 10;
      }

      // Update health data with Google Fit values
      setHealthData(prev => ({
        ...prev,
        heartRate,
        steps,
        calories,
        distance,
        sleep,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.log("Error fetching Google Fit data:", error);
    }
  };

  // Handle Google Sign-In
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { user: firebaseUser } = await signInWithGoogle();
      login(firebaseUser);
      
      // After successful login, connect to Google Fit
      if (Platform.OS === "android") {
        await connectGoogleFit();
      }
    } catch (err) {
      console.log("Google login error:", err);
      Alert.alert("Error", "Failed to sign in with Google.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch new data
  const fetchData = async () => {
    setRefreshing(true);
    
    if (isConnected) {
      await fetchGoogleFitData();
    } else {
      // Fallback to mock data if Google Fit not available
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const mockData: HealthData = {
        heartRate: Math.floor(Math.random() * 40) + 60,
        systolic: Math.floor(Math.random() * 40) + 110,
        diastolic: Math.floor(Math.random() * 20) + 70,
        steps: Math.floor(Math.random() * 5000) + 5000,
        calories: Math.floor(Math.random() * 500) + 300,
        distance: Math.floor(Math.random() * 10) + 2,
        sleep: Math.floor(Math.random() * 4) + 5,
        oxygen: Math.floor(Math.random() * 5) + 95,
        lastUpdated: new Date()
      };
      setHealthData(mockData);
    }
    
    setRefreshing(false);
  };

  // Auto refresh every 5 minutes
  useEffect(() => {
    if (isConnected) {
      fetchData();
      const interval = setInterval(fetchData, 300000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  // Analyze metrics
  useEffect(() => {
    const newAnalyses: Record<string, HealthAnalysis> = {};

    // Heart Rate
    if (healthData.heartRate < 60) {
      newAnalyses.heartRate = {
        status: "warning",
        message: "Low heart rate. Consult doctor if dizzy."
      };
    } else if (healthData.heartRate > 100) {
      newAnalyses.heartRate = {
        status: "warning",
        message: "Elevated heart rate. Try deep breathing."
      };
    } else {
      newAnalyses.heartRate = { status: "good", message: "Heart rate normal." };
    }

    // Blood Pressure
    if (healthData.systolic > 140 || healthData.diastolic > 90) {
      newAnalyses.bloodPressure = {
        status: "bad",
        message: "High blood pressure. Monitor & consult doctor."
      };
    } else if (healthData.systolic < 90 || healthData.diastolic < 60) {
      newAnalyses.bloodPressure = {
        status: "warning",
        message: "Low blood pressure. Stay hydrated."
      };
    } else {
      newAnalyses.bloodPressure = {
        status: "good",
        message: "Blood pressure normal."
      };
    }

    // Steps
    if (healthData.steps < 5000) {
      newAnalyses.steps = { status: "warning", message: "Walk more today." };
    } else if (healthData.steps < 10000) {
      newAnalyses.steps = { status: "good", message: "Good step count." };
    } else {
      newAnalyses.steps = { status: "good", message: "Step goal achieved!" };
    }

    // Sleep
    if (healthData.sleep < 6) {
      newAnalyses.sleep = {
        status: "bad",
        message: "Too little sleep. Need 7–9 hours."
      };
    } else if (healthData.sleep < 7) {
      newAnalyses.sleep = {
        status: "warning",
        message: "Slightly less sleep. Aim for 7+ hours."
      };
    } else {
      newAnalyses.sleep = { status: "good", message: "Great sleep duration." };
    }

    // Oxygen
    if (healthData.oxygen < 92) {
      newAnalyses.oxygen = {
        status: "bad",
        message: "Low oxygen. Consult doctor."
      };
    } else if (healthData.oxygen < 95) {
      newAnalyses.oxygen = {
        status: "warning",
        message: "Slightly low oxygen. Rest if needed."
      };
    } else {
      newAnalyses.oxygen = { status: "good", message: "Oxygen level normal." };
    }

    setAnalyses(newAnalyses);
  }, [healthData]);

  // Status dot
  const StatusIndicator = ({ status }: { status: "good" | "warning" | "bad" }) => {
    const color =
      status === "good" ? "#10B981" : status === "warning" ? "#F59E0B" : "#EF4444";
    return <View style={[styles.statusIndicator, { backgroundColor: color }]} />;
  };

  // Card Component
  const HealthCard = ({
    title,
    value,
    unit,
    status,
    message,
    icon,
    color,
    delay
  }: HealthCardProps) => {
    const [cardAnim] = useState(new Animated.Value(0));

    useEffect(() => {
      setTimeout(() => {
        Animated.spring(cardAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true
        }).start();
      }, delay);
    }, []);

    const cardStyle = {
      transform: [
        {
          scale: cardAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1]
          })
        }
      ],
      opacity: cardAnim
    };

    return (
      <Animated.View style={[styles.healthCard, cardStyle]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            {status && <StatusIndicator status={status} />}
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          <View style={[styles.iconContainer, { backgroundColor: color }]}>
            <Ionicons name={icon} size={20} color="white" />
          </View>
        </View>

        <View style={styles.valueContainer}>
          <Text style={[styles.valueText, { color }]}>{value}</Text>
          <Text style={styles.unitText}>{unit}</Text>
        </View>

        {message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Initializing Health Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchData} />
        }
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.headerAnimated,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Health Dashboard</Text>
              <Text style={styles.subtitle}>
                Last updated: {healthData.lastUpdated.toLocaleTimeString()}
                {isConnected ? " • Connected to Google Fit" : ""}
              </Text>
            </View>
            <TouchableOpacity style={styles.avatar}>
              <Ionicons name="person" size={24} color="#4F46E5" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {!user ? (
          <TouchableOpacity style={styles.connectButton} onPress={handleGoogleLogin}>
            <Ionicons name="logo-google" size={20} color="white" />
            <Text style={styles.connectButtonText}>Sign in with Google</Text>
          </TouchableOpacity>
        ) : !isConnected && Platform.OS === 'android' ? (
          <TouchableOpacity style={styles.connectButton} onPress={connectGoogleFit}>
            <Ionicons name="fitness" size={20} color="white" />
            <Text style={styles.connectButtonText}>Connect Google Fit</Text>
          </TouchableOpacity>
        ) : null}

        {/* Overview */}
        <Animated.View
          style={[
            styles.overviewAnimated,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={styles.overviewGradient}>
            <View style={styles.overviewHeader}>
              <View>
                <Text style={styles.overviewTitle}>Today's Overview</Text>
                <Text style={styles.overviewSubtitle}>Keep up the good work!</Text>
              </View>
              <View style={styles.overviewIcon}>
                <Ionicons name="pulse" size={24} color="white" />
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{healthData.steps.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Steps</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{healthData.calories}</Text>
                <Text style={styles.statLabel}>Calories</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{healthData.distance} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Grid */}
        <View style={styles.healthGrid}>
          <HealthCard
            title="Heart Rate"
            value={healthData.heartRate}
            unit="bpm"
            status={analyses.heartRate?.status}
            message={analyses.heartRate?.message}
            icon="heart"
            color="#EF4444"
            delay={100}
          />
          <HealthCard
            title="Blood Pressure"
            value={`${healthData.systolic}/${healthData.diastolic}`}
            unit="mmHg"
            status={analyses.bloodPressure?.status}
            message={analyses.bloodPressure?.message}
            icon="water"
            color="#3B82F6"
            delay={200}
          />
          <HealthCard
            title="Steps"
            value={healthData.steps.toLocaleString()}
            unit=""
            status={analyses.steps?.status}
            message={analyses.steps?.message}
            icon="walk"
            color="#10B981"
            delay={300}
          />
          <HealthCard
            title="Calories Burned"
            value={healthData.calories}
            unit="kcal"
            icon="flame"
            color="#F59E0B"
            delay={400}
          />
          <HealthCard
            title="Distance"
            value={healthData.distance}
            unit="km"
            icon="navigate"
            color="#6366F1"
            delay={500}
          />
          <HealthCard
            title="Sleep"
            value={healthData.sleep}
            unit="hours"
            status={analyses.sleep?.status}
            message={analyses.sleep?.message}
            icon="moon"
            color="#8B5CF6"
            delay={600}
          />
          <HealthCard
            title="Blood Oxygen"
            value={healthData.oxygen}
            unit="%"
            status={analyses.oxygen?.status}
            message={analyses.oxygen?.message}
            icon="fitness"
            color="#EC4899"
            delay={700}
          />
        </View>

        {/* Summary */}
        <Animated.View
          style={[
            styles.summaryAnimated,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <LinearGradient colors={["#0EA5E9", "#3B82F6"]} style={styles.summaryGradient}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIcon}>
                <Ionicons name="medkit" size={24} color="white" />
              </View>
              <Text style={styles.summaryTitle}>Health Summary</Text>
            </View>

            <View style={styles.summaryContent}>
              <Text style={styles.summaryText}>
                {isConnected 
                  ? `Your health data is being pulled from Google Fit. Your heart rate is ${healthData.heartRate} BPM, you've taken ${healthData.steps} steps today, and slept ${healthData.sleep} hours.`
                  : user
                    ? "Connect to Google Fit to get real-time health data from your device."
                    : "Sign in with Google to access your health data."}
              </Text>
            </View>

            <TouchableOpacity style={styles.reportButton}>
              <Text style={styles.reportButtonText}>View Detailed Report</Text>
              <Ionicons name="arrow-forward" size={18} color="#3B82F6" />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F0F9FF" 
  },
  scrollView: { 
    flex: 1, 
    padding: 16 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#F0F9FF"
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563'
  },
  headerAnimated: { 
    marginBottom: 16 
  },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: "#111827" 
  },
  subtitle: { 
    fontSize: 14, 
    color: "#6B7280", 
    marginTop: 4 
  },
  avatar: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  connectButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8
  },
  connectButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  },
  overviewAnimated: { 
    marginBottom: 24 
  },
  overviewGradient: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5
  },
  overviewHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  overviewTitle: { 
    fontSize: 18, 
    fontWeight: "600", 
    color: "white" 
  },
  overviewSubtitle: { 
    fontSize: 14, 
    color: "rgba(255,255,255,0.8)", 
    marginTop: 4 
  },
  overviewIcon: { 
    backgroundColor: "rgba(255,255,255,0.2)", 
    padding: 8, 
    borderRadius: 100 
  },
  statsContainer: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginTop: 24 
  },
  statItem: { 
    alignItems: "center" 
  },
  statValue: { 
    fontSize: 22, 
    fontWeight: "bold", 
    color: "white", 
    marginBottom: 4 
  },
  statLabel: { 
    fontSize: 14, 
    color: "rgba(255,255,255,0.8)" 
  },
  healthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24
  },
  healthCard: {
    width: width > 500 ? "48%" : "100%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6"
  },
  cardHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 16 
  },
  cardTitleContainer: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  statusIndicator: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    marginRight: 8 
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#374151" 
  },
  iconContainer: { 
    padding: 8, 
    borderRadius: 100 
  },
  valueContainer: { 
    flexDirection: "row", 
    alignItems: "flex-end", 
    justifyContent: "center", 
    marginBottom: 8 
  },
  valueText: { 
    fontSize: 32, 
    fontWeight: "bold" 
  },
  unitText: { 
    fontSize: 16, 
    color: "#6B7280", 
    marginLeft: 4, 
    marginBottom: 4 
  },
  messageContainer: { 
    marginTop: 12, 
    padding: 12, 
    backgroundColor: "#F9FAFB", 
    borderRadius: 12 
  },
  messageText: { 
    fontSize: 14, 
    color: "#4B5563" 
  },
  summaryAnimated: { 
    marginBottom: 40 
  },
  summaryGradient: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5
  },
  summaryHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 16 
  },
  summaryIcon: { 
    backgroundColor: "rgba(255,255,255,0.2)", 
    padding: 8, 
    borderRadius: 100, 
    marginRight: 12 
  },
  summaryTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "white" 
  },
  summaryContent: { 
    backgroundColor: "rgba(255,255,255,0.2)", 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 16 
  },
  summaryText: { 
    fontSize: 14, 
    color: "white", 
    lineHeight: 20 
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12
  },
  reportButtonText: {
    color: "#3B82F6",
    fontWeight: "600",
    marginRight: 8
  }
});