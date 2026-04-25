import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const PersonalDetailsScreen = ({ navigation, route }: any) => {
  const { name } = route.params || { name: 'Player' };
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [role, setRole] = useState('All-rounder');
  const [battingStyle, setBattingStyle] = useState('Right Hand');
  const [bowlingStyle, setBowlingStyle] = useState('Right-arm Fast');

  const handleComplete = () => {
    navigation.replace('MainTabs');
  };

  const roles = ['Batsman', 'Bowler', 'All-rounder', 'Wicketkeeper'];
  const battingStyles = ['Right Hand', 'Left Hand'];
  const bowlingStyles = ['Right-arm Fast', 'Right-arm Spin', 'Left-arm Fast', 'Left-arm Spin'];

  const Selector = ({ label, options, selected, onSelect }: any) => (
    <View style={styles.selectorContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionsGrid}>
        {options.map((opt: string) => (
          <TouchableOpacity
            key={opt}
            style={[styles.option, selected === opt && styles.selectedOption]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.optionText, selected === opt && styles.selectedOptionText]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require('../../assets/auth_bg.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)', '#000']}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                  <Text style={styles.title}>Welcome, {name}!</Text>
                  <Text style={styles.subtitle}>Help us tailor your CricPulseIQ experience</Text>
                </View>

                <View style={styles.formCard}>
                  {/* Basic Info */}
                  <View style={styles.inputSection}>
                    <Text style={styles.label}>Mobile Number</Text>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputIcon}>📞</Text>
                      <TextInput
                        placeholder="+91 98765 43210"
                        placeholderTextColor="#666"
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.inputSection}>
                    <Text style={styles.label}>City / Location</Text>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputIcon}>📍</Text>
                      <TextInput
                        placeholder="e.g. Mumbai, India"
                        placeholderTextColor="#666"
                        style={styles.input}
                        value={city}
                        onChangeText={setCity}
                      />
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Cricket Details */}
                  <Selector
                    label="Primary Role"
                    options={roles}
                    selected={role}
                    onSelect={setRole}
                  />

                  <Selector
                    label="Batting Style"
                    options={battingStyles}
                    selected={battingStyle}
                    onSelect={setBattingStyle}
                  />

                  <Selector
                    label="Bowling Style"
                    options={bowlingStyles}
                    selected={bowlingStyle}
                    onSelect={setBowlingStyle}
                  />

                  <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
                    <LinearGradient
                      colors={['#00FF88', '#00A86B']}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.buttonText}>FINISH SETUP</Text>
                      <Text style={{ color: 'white', marginLeft: 10, fontSize: 18 }}>🎯</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 25,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#AAA',
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 30,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    color: '#00FF88',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 20,
  },
  selectorContainer: {
    marginBottom: 25,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 10,
    marginRight: 8,
  },
  selectedOption: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderColor: '#00FF88',
  },
  optionText: {
    color: '#AAA',
    fontSize: 14,
  },
  selectedOptionText: {
    color: '#00FF88',
    fontWeight: 'bold',
  },
  completeButton: {
    marginTop: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  buttonGradient: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
});

export default PersonalDetailsScreen;
