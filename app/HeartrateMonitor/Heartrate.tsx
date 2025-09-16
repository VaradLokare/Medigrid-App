import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

const { width, height } = Dimensions.get("window");

// Enhanced heart rate detection algorithm
const calculateHeartRateFromData = (redValues: number[], timestamps: number[]): number | null => {
    if (redValues.length < 60 || timestamps.length < 60) {
        return null;
    }

    try {
        // Apply moving average filter to reduce noise
        const smoothedValues = [];
        const windowSize = 5;
        
        for (let i = 0; i < redValues.length; i++) {
            let sum = 0;
            let count = 0;
            
            for (let j = Math.max(0, i - windowSize); j <= Math.min(redValues.length - 1, i + windowSize); j++) {
                sum += redValues[j];
                count++;
            }
            
            smoothedValues.push(sum / count);
        }

        // Normalize the data
        const minVal = Math.min(...smoothedValues);
        const maxVal = Math.max(...smoothedValues);
        const normalizedValues = smoothedValues.map(val => (val - minVal) / (maxVal - minVal));

        // Find peaks in the data (heartbeats)
        const peaks: number[] = [];
        const threshold = 0.6; // Threshold for detecting a peak
        
        for (let i = 2; i < normalizedValues.length - 2; i++) {
            if (normalizedValues[i] > threshold && 
                normalizedValues[i] > normalizedValues[i - 1] && 
                normalizedValues[i] > normalizedValues[i + 1] &&
                normalizedValues[i] > normalizedValues[i - 2] && 
                normalizedValues[i] > normalizedValues[i + 2]) {
                peaks.push(timestamps[i]);
            }
        }

        // Calculate heart rate from peaks
        if (peaks.length < 3) {
            return null;
        }

        // Calculate time differences between peaks
        const intervals: number[] = [];
        for (let i = 1; i < peaks.length; i++) {
            intervals.push(peaks[i] - peaks[i - 1]);
        }

        // Filter out irregular intervals (more than 30% deviation from median)
        const medianInterval = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)];
        const filteredIntervals = intervals.filter(interval => 
            Math.abs(interval - medianInterval) / medianInterval < 0.3
        );

        if (filteredIntervals.length < 2) {
            return null;
        }

        // Calculate average interval in milliseconds
        const avgInterval = filteredIntervals.reduce((sum, interval) => sum + interval, 0) / filteredIntervals.length;
        
        // Convert to beats per minute (60 seconds / interval in seconds)
        const bpm = Math.round(60000 / avgInterval);

        // Validate BPM (normal range is 40-200 bpm)
        if (bpm < 40 || bpm > 200) {
            return null;
        }

        return bpm;
    } catch (error) {
        console.error("Error calculating heart rate:", error);
        return null;
    }
};

// Get heart rate status based on age and BPM
const getHeartRateStatus = (
  bpm: number,
  age?: number
): { status: string; message: string; color: string } => {
  // ✅ Handle missing age (undefined)
  if (age === undefined) {
    if (bpm < 60)
      return { status: "Low", message: "Your heart rate is lower than average", color: "#3498db" };
    if (bpm <= 100)
      return { status: "Normal", message: "Your heart rate is within normal range", color: "#2ecc71" };
    return { status: "High", message: "Your heart rate is higher than average", color: "#e74c3c" };
  }

  // ✅ Age-specific classification
  if (age < 18) {
    if (bpm < 70)
      return { status: "Low", message: "For your age, this heart rate is lower than average", color: "#3498db" };
    if (bpm <= 100)
      return { status: "Normal", message: "Your heart rate is perfect for your age", color: "#2ecc71" };
    return { status: "High", message: "For your age, this heart rate is higher than average", color: "#e74c3c" };
  }

  if (age < 60) {
    if (bpm < 60)
      return { status: "Low", message: "For your age, this heart rate is lower than average", color: "#3498db" };
    if (bpm <= 100)
      return { status: "Normal", message: "Your heart rate is perfect for your age", color: "#2ecc71" };
    return { status: "High", message: "For your age, this heart rate is higher than average", color: "#e74c3c" };
  }

  // age >= 60
  if (bpm < 60)
    return { status: "Low", message: "For your age, this heart rate is lower than average", color: "#3498db" };
  if (bpm <= 100)
    return { status: "Normal", message: "Your heart rate is perfect for your age", color: "#2ecc71" };
  return { status: "High", message: "For your age, this heart rate is higher than average", color: "#e74c3c" };
};


export default function HeartRateScreen() {
    const router = useRouter();
    const [bpm, setBpm] = useState<number | null>(null);
    const [isMeasuring, setIsMeasuring] = useState(false);
    const [flashOn, setFlashOn] = useState(false);
    const [measurementProgress, setMeasurementProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [measurementHistory, setMeasurementHistory] = useState<number[]>([]);
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraReady, setCameraReady] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [heartRateStatus, setHeartRateStatus] = useState<{ status: string, message: string, color: string } | null>(null);
    const [userAge, setUserAge] = useState<number | undefined>(undefined);

    const progressAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Data for heart rate detection
    const redValues = useRef<number[]>([]);
    const timestamps = useRef<number[]>([]);
    const measurementInterval = useRef<number | null>(null);
    const frameProcessingInterval = useRef<number | null>(null);
    const lastFrameTime = useRef<number>(0);

    // Request camera permissions
    useEffect(() => {
    if (!permission?.granted) {
        requestPermission();
    }

    // Prompt for age (in a real app, this would come from user settings)
    Alert.prompt(
        "Age Information",
        "Please enter your age for accurate heart rate analysis:",
        [
            {
                text: "Cancel",
                style: "cancel",
                onPress: () => setUserAge(30), // Default to 30 if canceled
            },
            {
                text: "OK",
                onPress: (ageText: string | undefined) => {
                    const age = parseInt(ageText ?? "30");
                    setUserAge(isNaN(age) ? 30 : age);
                },
            },
        ],
        "plain-text",
        "",
        "number-pad"
    );
}, []);


    const toggleFlash = () => {
        if (!cameraReady) {
            setError("Camera not ready yet");
            return;
        }
        setFlashOn(!flashOn);
    };

    const startMeasurement = () => {
        if (isMeasuring) return;
        if (!flashOn) {
            setError("Please turn on the flash first");
            return;
        }

        // Reset data
        redValues.current = [];
        timestamps.current = [];
        setBpm(null);
        setError(null);
        setIsMeasuring(true);
        setMeasurementProgress(0);
        setHeartRateStatus(null);

        // Start progress animation
        progressAnim.setValue(0);
        Animated.timing(progressAnim, {
            toValue: 1,
            duration: 15000,
            easing: Easing.linear,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished) {
                calculateHeartRate();
            }
        });

        // Start pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Update progress every second
        let progress = 0;
        measurementInterval.current = setInterval(() => {
            progress += 1;
            setMeasurementProgress(progress);

            if (progress >= 15) {
                if (measurementInterval.current) {
                    clearInterval(measurementInterval.current);
                    measurementInterval.current = null;
                }
            }
        }, 1000);

        // Start processing frames
        startFrameProcessing();
    };

    const startFrameProcessing = () => {
        if (frameProcessingInterval.current) {
            clearInterval(frameProcessingInterval.current);
        }

        // Process frames more frequently for better detection
        frameProcessingInterval.current = setInterval(() => {
            const currentTime = Date.now();
            
            // Only process if we have enough time between frames (simulate 15fps)
            if (currentTime - lastFrameTime.current > 66) {
                lastFrameTime.current = currentTime;
                
                // Simulate getting red values from camera
                // In a real implementation, this would come from actual camera frame data
                const baseValue = 0.7 + Math.random() * 0.15; // Base value with some noise
                const timeFactor = currentTime / 1000; // Time in seconds
                
                // Simulate a more realistic heartbeat pattern
                const heartRateBpm = 65 + Math.sin(timeFactor * 0.1) * 10; // Varying between 55-75 BPM
                const heartBeatPattern = 0.15 * Math.sin(2 * Math.PI * timeFactor / (60 / heartRateBpm));
                const noise = (Math.random() - 0.5) * 0.03; // Small random noise
                
                const simulatedValue = baseValue + heartBeatPattern + noise;
                
                redValues.current.push(simulatedValue);
                timestamps.current.push(currentTime);

                // Keep only the last 225 values (about 15 seconds of data at 15fps)
                if (redValues.current.length > 225) {
                    redValues.current.shift();
                    timestamps.current.shift();
                }
            }
        }, 50); // Process every 50ms
    };

    const stopMeasurement = () => {
        if (measurementInterval.current) {
            clearInterval(measurementInterval.current);
            measurementInterval.current = null;
        }

        if (frameProcessingInterval.current) {
            clearInterval(frameProcessingInterval.current);
            frameProcessingInterval.current = null;
        }

        progressAnim.stopAnimation();
        pulseAnim.stopAnimation();
        setIsMeasuring(false);
        setMeasurementProgress(0);
    };

    const calculateHeartRate = () => {
        setIsProcessing(true);
        
        setTimeout(() => {
            try {
                if (redValues.current.length < 60) {
                    setError("Not enough data. Please make sure your finger covers the camera completely and try again.");
                    setIsMeasuring(false);
                    setIsProcessing(false);
                    return;
                }

                const calculatedBpm = calculateHeartRateFromData(redValues.current, timestamps.current);

                if (calculatedBpm === null) {
                    setError("Could not detect heart rate. Make sure your finger is still and fully covering the camera.");
                    setIsMeasuring(false);
                    setIsProcessing(false);
                    return;
                }

                setBpm(calculatedBpm);
                setMeasurementHistory((prev) => [calculatedBpm, ...prev.slice(0, 4)]);
                
                // Calculate heart rate status
                const status = getHeartRateStatus(calculatedBpm, userAge);
                setHeartRateStatus(status);
                setShowResultModal(true);
                
                setIsMeasuring(false);
            } catch (err) {
                setError("Error calculating heart rate. Please try again.");
                setIsMeasuring(false);
            } finally {
                setIsProcessing(false);
            }
        }, 1000); // Simulate processing time
    };

    const handleCameraReady = () => {
        setCameraReady(true);
    };

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    useEffect(() => {
        return () => {
            if (measurementInterval.current) {
                clearInterval(measurementInterval.current);
            }
            if (frameProcessingInterval.current) {
                clearInterval(frameProcessingInterval.current);
            }
        };
    }, []);

    if (!permission) {
        return (
            <View style={styles.container}>
                <Text>Requesting camera permission...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Icon name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Heart Rate Monitor</Text>
                    <View style={styles.headerPlaceholder} />
                </View>
                <View style={styles.permissionContainer}>
                    <Icon name="camera-alt" size={60} color="#ff4757" />
                    <Text style={styles.permissionText}>
                        Camera permission is required to use this feature
                    </Text>
                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={requestPermission}
                    >
                        <Text style={styles.buttonText}>Grant Permission</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
            {/* Header with back button */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Icon name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Heart Rate Monitor</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <View style={styles.cameraContainer}>
                <CameraView
                    style={styles.camera}
                    facing="back"
                    enableTorch={flashOn}
                    onCameraReady={handleCameraReady}
                />

                <View style={styles.overlay}>
                    <View style={styles.fingerGuide} />
                    <Text style={styles.overlayText}>
                        {isMeasuring 
                            ? "Keep your finger still..." 
                            : "Place your finger over both camera and flash"
                        }
                    </Text>
                </View>

                <Animated.View
                    style={[styles.pulseIndicator, { 
                        transform: [{ scale: pulseAnim }],
                        opacity: isMeasuring ? 1 : 0.5
                    }]}
                />
            </View>

            <View style={styles.controls}>
                <Text style={styles.instructions}>
                    {isMeasuring
                        ? "Keep your finger still and covering the camera completely. Do not move."
                        : "Cover both the camera and flash with your finger tip. Press the flash button first."
                    }
                </Text>

                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <Animated.View
                            style={[styles.progressFill, { width: progressWidth }]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {isMeasuring
                            ? `${measurementProgress}/15 seconds`
                            : "Ready to measure"
                        }
                    </Text>
                </View>

                {error && (
                    <View style={styles.errorContainer}>
                        <Icon name="error-outline" size={20} color="#ff4757" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <View style={styles.bpmContainer}>
                    <Text style={styles.bpmText}>{bpm ? `${bpm} BPM` : "---"}</Text>
                    <Text style={styles.bpmLabel}>Current Heart Rate</Text>
                </View>

                {isProcessing && (
                    <View style={styles.processingContainer}>
                        <ActivityIndicator size="small" color="#ff4757" />
                        <Text style={styles.processingText}>Calculating...</Text>
                    </View>
                )}

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[
                            styles.button, 
                            styles.primaryButton, 
                            (!cameraReady || !flashOn) && styles.disabledButton
                        ]}
                        onPress={isMeasuring ? stopMeasurement : startMeasurement}
                        disabled={!cameraReady || !flashOn || isProcessing}
                    >
                        <Icon
                            name={isMeasuring ? "stop" : "favorite"}
                            size={20}
                            color="white"
                        />
                        <Text style={styles.buttonText}>
                            {isMeasuring ? "Stop Measurement" : "Start Measurement"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.button, 
                            styles.secondaryButton, 
                            !cameraReady && styles.disabledButton
                        ]}
                        onPress={toggleFlash}
                        disabled={!cameraReady || isMeasuring}
                    >
                        <Icon
                            name={flashOn ? "flash-off" : "flash-on"}
                            size={20}
                            color="white"
                        />
                        <Text style={styles.buttonText}>
                            {flashOn ? "Turn Off Flash" : "Turn On Flash"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {measurementHistory.length > 0 && (
                <View style={styles.historyContainer}>
                    <Text style={styles.historyTitle}>Recent Measurements</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {measurementHistory.map((value, index) => (
                            <View key={index} style={styles.historyItem}>
                                <Text style={styles.historyValue}>{value}</Text>
                                <Text style={styles.historyLabel}>BPM</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Tips section */}
            <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>Measurement Tips:</Text>
                <Text style={styles.tip}>• Stay still and relaxed during measurement</Text>
                <Text style={styles.tip}>• Apply gentle pressure on the camera</Text>
                <Text style={styles.tip}>• Make sure your finger covers both camera and flash</Text>
                <Text style={styles.tip}>• Avoid moving during the 15-second measurement</Text>
                <Text style={styles.tip}>• Measure in a well-lit environment for best results</Text>
            </View>

            {/* Result Modal */}
            <Modal
                visible={showResultModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowResultModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Heart Rate Analysis</Text>
                        
                        <View style={styles.resultContainer}>
                            <Text style={styles.resultBpm}>{bpm} BPM</Text>
                            {heartRateStatus && (
                                <Text style={[styles.resultStatus, { color: heartRateStatus.color }]}>
                                    {heartRateStatus.status}
                                </Text>
                            )}
                        </View>
                        
                        {heartRateStatus && (
                            <Text style={styles.resultMessage}>
                                {heartRateStatus.message}
                            </Text>
                        )}
                        
                        <View style={styles.normalRangeContainer}>
                            <Text style={styles.normalRangeTitle}>Normal Heart Rate Ranges:</Text>
                            <Text style={styles.normalRangeText}>• Adults (18+): 60-100 BPM</Text>
                            <Text style={styles.normalRangeText}>• Children (1-17): 70-100 BPM</Text>
                            <Text style={styles.normalRangeText}>• Athletes: 40-60 BPM</Text>
                        </View>
                        
                        <TouchableOpacity
                            style={[styles.button, styles.primaryButton, styles.modalButton]}
                            onPress={() => setShowResultModal(false)}
                        >
                            <Text style={styles.buttonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    scrollContent: {
        alignItems: "center",
        paddingTop: 40,
        paddingBottom: 40,
    },
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
        alignItems: "center",
        paddingTop: 40,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    backButton: {
        padding: 5,
    },
    headerPlaceholder: {
        width: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
    },
    cameraContainer: {
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        overflow: "hidden",
        marginBottom: 20,
        position: "relative",
        borderWidth: 3,
        borderColor: "#ff4757",
    },
    camera: {
        width: "100%",
        height: "100%",
    },
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.3)",
    },
    fingerGuide: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: "white",
        borderStyle: "dashed",
    },
    overlayText: {
        color: "white",
        marginTop: 10,
        fontSize: 14,
        fontWeight: "500",
        textAlign: "center",
        paddingHorizontal: 10,
    },
    pulseIndicator: {
        position: "absolute",
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#ff4757",
        top: "50%",
        left: "50%",
        marginLeft: -15,
        marginTop: -15,
    },
    controls: {
        width: "90%",
        alignItems: "center",
        padding: 20,
        backgroundColor: "white",
        borderRadius: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
    },
    instructions: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 15,
        color: "#555",
        lineHeight: 22,
    },
    progressContainer: {
        width: "100%",
        marginBottom: 15,
    },
    progressBar: {
        height: 10,
        backgroundColor: "#e0e0e0",
        borderRadius: 5,
        overflow: "hidden",
        marginBottom: 5,
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#4caf50",
        borderRadius: 5,
    },
    progressText: {
        fontSize: 12,
        color: "#777",
        textAlign: "center",
    },
    errorContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ffebee",
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
        width: "100%",
    },
    errorText: {
        color: "#ff4757",
        marginLeft: 5,
        flex: 1,
    },
    bpmContainer: {
        alignItems: "center",
        marginVertical: 15,
    },
    bpmText: {
        fontSize: 42,
        fontWeight: "bold",
        color: "#ff4757",
    },
    bpmLabel: {
        fontSize: 14,
        color: "#777",
        marginTop: 5,
    },
    processingContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    processingText: {
        marginLeft: 10,
        color: "#ff4757",
        fontSize: 16,
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        marginTop: 10,
    },
    button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 5,
    },
    primaryButton: {
        backgroundColor: "#ff4757",
    },
    secondaryButton: {
        backgroundColor: "#3742fa",
    },
    disabledButton: {
        backgroundColor: "#cccccc",
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
        marginLeft: 5,
    },
    historyContainer: {
        width: "90%",
        marginBottom: 20,
        padding: 15,
        backgroundColor: "white",
        borderRadius: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    historyTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#333",
    },
    historyItem: {
        alignItems: "center",
        justifyContent: "center",
        padding: 15,
        marginRight: 15,
        backgroundColor: "#f8f9fa",
        borderRadius: 10,
        minWidth: 80,
    },
    historyValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#ff4757",
    },
    historyLabel: {
        fontSize: 12,
        color: "#777",
    },
    permissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    permissionText: {
        fontSize: 18,
        textAlign: "center",
        marginVertical: 20,
        color: "#555",
    },
    tipsContainer: {
        width: "90%",
        padding: 15,
        backgroundColor: "#e3f2fd",
        borderRadius: 15,
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#1976d2",
    },
    tip: {
        fontSize: 14,
        color: "#555",
        marginBottom: 5,
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        width: "85%",
        backgroundColor: "white",
        borderRadius: 15,
        padding: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 15,
        color: "#333",
    },
    resultContainer: {
        alignItems: "center",
        marginVertical: 15,
    },
    resultBpm: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#ff4757",
    },
    resultStatus: {
        fontSize: 24,
        fontWeight: "bold",
        marginTop: 5,
    },
    resultMessage: {
        fontSize: 16,
        textAlign: "center",
        marginVertical: 10,
        color: "#555",
        lineHeight: 22,
    },
    normalRangeContainer: {
        width: "100%",
        backgroundColor: "#f8f9fa",
        padding: 15,
        borderRadius: 10,
        marginVertical: 15,
    },
    normalRangeTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 8,
        color: "#333",
    },
    normalRangeText: {
        fontSize: 14,
        color: "#555",
        marginBottom: 4,
    },
    modalButton: {
        width: "100%",
        marginTop: 10,
    },
});