import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const AuthScreen = ({ navigation }: any) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const toggleAuthMode = () => setIsLogin(!isLogin);

  const handleAuth = () => {
    if (isLogin) {
      navigation.replace('MainTabs');
    } else {
      navigation.navigate('PersonalDetails', { name });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require('../../assets/auth_bg.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)', '#000']}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.content}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.formContainer}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <LinearGradient
                    colors={['#00FF88', '#007AFF']}
                    style={styles.logoIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={{ fontSize: 24 }}>⚡</Text>
                  </LinearGradient>
                  <Text style={styles.logoText}>CricPulse<Text style={styles.iqText}>IQ</Text></Text>
                </View>
                <Text style={styles.tagline}>Precision Cricket Intelligence</Text>
              </View>

              {/* Form Card */}
              <View style={styles.card}>
                <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
                <Text style={styles.subtitle}>
                  {isLogin ? 'Sign in to continue your journey' : 'Join the elite community of cricket analysts'}
                </Text>

                <View style={styles.inputs}>
                  {!isLogin && (
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputIcon}>👤</Text>
                      <TextInput
                        placeholder="Full Name"
                        placeholderTextColor="#666"
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                      />
                    </View>
                  )}

                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>✉️</Text>
                    <TextInput
                      placeholder="Email Address"
                      placeholderTextColor="#666"
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      placeholder="Password"
                      placeholderTextColor="#666"
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>

                  {isLogin && (
                    <TouchableOpacity style={styles.forgotBtn}>
                      <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity style={styles.mainButton} onPress={handleAuth}>
                  <LinearGradient
                    colors={['#00FF88', '#00A86B']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.buttonText}>{isLogin ? 'SIGN IN' : 'GET STARTED'}</Text>
                    <Text style={{ color: 'white', marginLeft: 8 }}>→</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.line} />
                  <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                  <View style={styles.line} />
                </View>

                <View style={styles.socialButtons}>
                  <TouchableOpacity style={styles.socialBtn}>
                    <Text style={{ fontSize: 20 }}>G</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialBtn}>
                    <Text style={{ fontSize: 20 }}></Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Toggle Auth Mode */}
              <TouchableOpacity onPress={toggleAuthMode} style={styles.toggleContainer}>
                <Text style={styles.toggleText}>
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <Text style={styles.toggleTextBold}>{isLogin ? 'Sign Up' : 'Log In'}</Text>
                </Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  formContainer: {
    paddingHorizontal: 30,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  iqText: {
    color: '#00FF88',
  },
  tagline: {
    color: '#888',
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 30,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 25,
    lineHeight: 20,
  },
  inputs: {
    marginBottom: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 15,
  },
  inputIcon: {
    marginRight: 12,
    fontSize: 18,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    color: '#00FF88',
    fontSize: 14,
  },
  mainButton: {
    marginTop: 10,
    borderRadius: 15,
    overflow: 'hidden',
  },
  buttonGradient: {
    height: 55,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: '#666',
    fontSize: 12,
    marginHorizontal: 15,
    letterSpacing: 1,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialBtn: {
    width: 60,
    height: 55,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 10,
  },
  toggleContainer: {
    marginTop: 25,
    alignItems: 'center',
  },
  toggleText: {
    color: '#888',
    fontSize: 14,
  },
  toggleTextBold: {
    color: '#00FF88',
    fontWeight: 'bold',
  },
});

export default AuthScreen;
