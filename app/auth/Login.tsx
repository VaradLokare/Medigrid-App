import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from "../contexts/AuthContext";
import { auth } from '../firebase';

const { width, height } = Dimensions.get('window');

export default function Login() {
    const router = useRouter();
    const [fadeAnim] = useState(new Animated.Value(1));
    const [slideAnim] = useState(new Animated.Value(0));
    const [formAnim] = useState(new Animated.Value(0));
    const [showLogin, setShowLogin] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { user, login } = useAuth();

    useEffect(() => {
        // If user is already logged in, redirect to tabs
        if (user) {
            router.replace('/(tabs)');
            return;
        }

        // Initial animation - show image first
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
        }).start(() => {
            // After image is shown, transition to login form
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                    Animated.timing(formAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    })
                ]).start(() => {
                    setShowLogin(true);
                });
            }, 2000);
        });
    }, [user]);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }
        
        setIsLoading(true);
        try {
            // Sign in with Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            if (userCredential.user) {
                console.log("Login successful");
                
                // Update auth context
                login(userCredential.user);
                
                // Navigate to tabs using router.replace to prevent going back to login
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            console.error("Login failed:", error);
            
            // Handle specific Firebase auth errors
            let errorMessage = 'Login failed. Please try again.';
            if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address format.';
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = 'This account has been disabled.';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password. Please try again.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your internet connection.';
            }
            
            Alert.alert('Error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const slideUp = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [100, 0]
    });

    const formOpacity = formAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1]
    });

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            
            {/* Background Image */}
            source={require('../Images/Download premium vector of Clean medical background vector by Tang about backgrounds, hospital, medicine, pattern, and pharmacy 2292444.jpeg')}
            
            {/* Overlay */}
            <View style={styles.overlay} />
            
            {/* Initial Image View */}
            <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
                          <Image 
                            source={require('../Images/ChatGPT_Image_Aug_27__2025__12_51_12_PM-removebg-preview.png')}
                            style={styles.logoImage}
                          />
                <Text style={styles.welcomeText}>Welcome to MediGrid</Text>
            </Animated.View>
            
            {/* Login Form */}
            {showLogin && (
                <Animated.View style={[
                    styles.formOuterContainer,
                    { 
                        opacity: formOpacity,
                        transform: [{ translateY: slideUp }] 
                    }
                ]}>
                    <ScrollView 
                        contentContainerStyle={styles.scrollContainer}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.formContainer}>
                            <Text style={styles.loginTitle}>Sign In</Text>
                            <Text style={styles.loginSubtitle}>Access your health dashboard</Text>
                            
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email Address"
                                    placeholderTextColor="#888"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    editable={!isLoading}
                                    autoComplete="email"
                                />
                            </View>
                            
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    placeholderTextColor="#888"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    editable={!isLoading}
                                    autoComplete="password"
                                />
                            </View>
                            
                            <TouchableOpacity 
                                style={[styles.loginButton, isLoading && styles.disabledButton]} 
                                onPress={handleLogin}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.loginButtonText}>Sign In</Text>
                                )}
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.forgotButton, isLoading && styles.disabledButton]}
                                onPress={() => router.push('/auth/ForgotPassword')}
                                disabled={isLoading}
                            >
                                <Text style={styles.forgotText}>Forgot Password?</Text>
                            </TouchableOpacity>
                            
                            <View style={styles.signupContainer}>
                                <Text style={styles.signupText}>Don't have an account? </Text>
                                <TouchableOpacity
                                    onPress={() => router.push("/auth/SignUp")}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.signupLink}>Sign Up</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </Animated.View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    formOuterContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    backgroundImage: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    logoImage: {
        width: 200,
        height: 200,
        borderRadius: 50,
        marginBottom: 30,
    },
    welcomeText: {
        color: '#007BFF',
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 20,
    },
    formContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    loginTitle: {
        color: '#007BFF',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 5,
        textAlign: 'center',
    },
    loginSubtitle: {
        color: '#666',
        fontSize: 16,
        marginBottom: 30,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 15,
        color: '#333',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    loginButton: {
        backgroundColor: '#007BFF',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#007BFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    disabledButton: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    forgotButton: {
        alignSelf: 'center',
        marginBottom: 20,
    },
    forgotText: {
        color: '#007BFF',
        fontSize: 14,
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    signupText: {
        color: '#666',
        fontSize: 14,
    },
    signupLink: {
        color: '#28A745',
        fontSize: 14,
        fontWeight: 'bold',
    },
});