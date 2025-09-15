// app/hooks/useGoogleFit.js
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import GoogleFit, { Scopes } from 'react-native-google-fit';

const useGoogleFit = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps] = useState(0);
  const [heartRate, setHeartRate] = useState([]);
  const [sleepData, setSleepData] = useState([]);
  const [weight, setWeight] = useState([]);

  const GoogleFitConfig = {
    scopes: [
      Scopes.FITNESS_ACTIVITY_READ,
      Scopes.FITNESS_HEART_RATE_READ,
      Scopes.FITNESS_BODY_READ,
      Scopes.FITNESS_SLEEP_READ,
    ],
  };

  // ✅ Connect to Google Fit
  const connectGoogleFit = useCallback(async () => {
    if (Platform.OS !== "android") {
      console.log("Google Fit works only on Android. Use Apple HealthKit on iOS.");
      return;
    }

    setIsLoading(true);
    try {
      const authResult = await GoogleFit.authorize(GoogleFitConfig);

      if (authResult.success) {
        console.log("✅ Google Fit connected");
        setIsConnected(true);
        await fetchAllData();
      } else {
        console.log("❌ Google Fit auth failed", authResult.message);
        setIsConnected(false);
      }
    } catch (err) {
      console.log("Google Fit Error:", err);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ✅ Check connection status without forcing re-auth
  const checkAuthStatus = useCallback(() => {
    const status = GoogleFit.isAuthorized;
    setIsConnected(status);
    return status;
  }, []);

  // 📊 Fetch All Health Data
  const fetchAllData = useCallback(async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // last 7 days
    const endDate = new Date();

    try {
      // Steps
      const stepsRes = await GoogleFit.getDailyStepCountSamples({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      if (stepsRes.length > 0) {
        const dailySteps = stepsRes.find(d => d.source === "com.google.android.gms:estimated_steps");
        setSteps(dailySteps?.steps?.reduce((acc, cur) => acc + cur.value, 0) || 0);
      }

      // Heart Rate
      const hrRes = await GoogleFit.getHeartRateSamples({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bucketUnit: "MINUTE",
        bucketInterval: 1,
      });
      setHeartRate(hrRes);

      // Sleep
      const sleepRes = await GoogleFit.getSleepSamples({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      setSleepData(sleepRes);

      // Weight
      const weightRes = await GoogleFit.getWeightSamples({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      setWeight(weightRes);
    } catch (err) {
      console.log("Error fetching health data:", err);
    }
  }, []);

  // 🔄 Auto-connect on mount
  useEffect(() => {
    connectGoogleFit();
  }, [connectGoogleFit]);

  return {
    isConnected,
    isLoading,
    steps,
    heartRate,
    sleepData,
    weight,
    connectGoogleFit,
    checkAuthStatus,
  };
};

export default useGoogleFit;
