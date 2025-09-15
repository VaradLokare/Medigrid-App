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
            <StatusBar barStyle="light-content" />
            
            {/* Background Image */}
            <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80' }} 
                style={styles.backgroundImage}
                blurRadius={3}
            />
            
            {/* Overlay */}
            <View style={styles.overlay} />
            
            {/* Initial Image View */}
            <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
                <Image 
                    source={{ uri: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1773&q=80' }} 
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
                                    placeholderTextColor="#aaa"
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
                                    placeholderTextColor="#aaa"
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
        backgroundColor: '#000',
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
        backgroundColor: 'rgba(0,0,0,0.6)',
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
        borderRadius: 100,
        marginBottom: 30,
    },
    welcomeText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    formContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        padding: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    loginTitle: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 5,
        textAlign: 'center',
    },
    loginSubtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 16,
        marginBottom: 30,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 20,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        padding: 15,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    loginButton: {
        backgroundColor: '#4F46E5',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 5,
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
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    signupText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
    },
    signupLink: {
        color: '#4F46E5',
        fontSize: 14,
        fontWeight: 'bold',
    },
});