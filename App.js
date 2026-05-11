import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, SafeAreaView, useWindowDimensions, Animated, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { solveMCQ } from './geminiService';

export default function App() {
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [zoom, setZoom] = useState(0);
  const cameraRef = useRef(null);

  // Animations
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Determine if landscape
  const isLandscape = width > height;

  // Responsive scan box dimensions
  const scanBoxWidth = isLandscape ? width * 0.6 : width * 0.85;
  const scanBoxHeight = isLandscape ? height * 0.6 : height * 0.35;

  useEffect(() => {
    // Start scanning line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: scanBoxHeight - 4, // move to bottom
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0, // move to top
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scanBoxHeight, scanLineAnim]);

  useEffect(() => {
    // Fade in results card
    if (answer) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
      triggerHaptic('success');
    } else {
      fadeAnim.setValue(0);
    }
  }, [answer, fadeAnim]);

  const triggerHaptic = (type) => {
    if (Platform.OS !== 'web') {
      if (type === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Still checking/loading permissions
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00E5FF" />
      </View>
    );
  }

  // Permissions not granted yet
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#00E5FF" style={{ marginBottom: 20 }} />
        <Text style={styles.permissionTitle}>Camera Access</Text>
        <Text style={styles.permissionText}>We need your permission to use the camera for intelligent MCQ scanning.</Text>
        <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
          <Text style={styles.grantButtonText}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleScan = async () => {
    if (cameraRef.current && !loading) {
      triggerHaptic('heavy');
      setLoading(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.5, 
        });
        
        const result = await solveMCQ(photo.base64);
        setAnswer(result);
      } catch (error) {
        triggerHaptic('error');
        alert(error.message || "An error occurred during analysis.");
        setLoading(false);
      } finally {
        setLoading(false);
      }
    }
  };

  const clearAnswer = () => {
    triggerHaptic('heavy');
    setAnswer(null);
  };

  const toggleZoom = () => {
    triggerHaptic('heavy');
    if (zoom === 0) setZoom(0.05); // ~2x
    else if (zoom === 0.05) setZoom(0.12); // ~3x
    else setZoom(0); // 1x
  };

  const getZoomLabel = () => {
    if (zoom === 0) return '1x';
    if (zoom === 0.05) return '2x';
    return '3x';
  };

  // Scanner Corners UI Component
  const Corner = ({ top, bottom, left, right }) => (
    <View style={[
      styles.corner, 
      top !== undefined && { top: -2, borderTopWidth: 4 },
      bottom !== undefined && { bottom: -2, borderBottomWidth: 4 },
      left !== undefined && { left: -2, borderLeftWidth: 4 },
      right !== undefined && { right: -2, borderRightWidth: 4 },
    ]} />
  );

  return (
    <SafeAreaView style={styles.container}>
      <CameraView style={styles.camera} facing="back" autofocus="on" zoom={zoom} ref={cameraRef}>
        
        {/* Darkened Overlay around the Scan Box */}
        <View style={styles.overlayContainer}>
          <View style={[styles.darkOverlay, { height: (height - scanBoxHeight) / 2 }]} />
          <View style={{ flexDirection: 'row', height: scanBoxHeight }}>
            <View style={[styles.darkOverlay, { width: (width - scanBoxWidth) / 2 }]} />
            
            {/* The Transparent Scan Box */}
            <View style={{ width: scanBoxWidth, height: scanBoxHeight, position: 'relative' }}>
              <Corner top left />
              <Corner top right />
              <Corner bottom left />
              <Corner bottom right />
              
              <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineAnim }] }]} />
            </View>
            
            <View style={[styles.darkOverlay, { width: (width - scanBoxWidth) / 2 }]} />
          </View>
          <View style={[styles.darkOverlay, { height: (height - scanBoxHeight) / 2, alignItems: 'center', paddingTop: 20 }]}>
             <Text style={styles.instructionText}>Align the MCQ within the brackets</Text>
          </View>
        </View>

        {/* Loading Glassmorphism Overlay */}
        {loading && (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00E5FF" />
              <Text style={styles.loadingText}>Gemini 2.5 Flash Analyzing...</Text>
            </View>
          </BlurView>
        )}

        {/* Premium Animated Results Sheet */}
        {answer && (
          <Animated.View style={[
            styles.resultSheetContainer, 
            { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }
          ]}>
            <BlurView intensity={90} tint="dark" style={styles.resultSheet}>
              <View style={styles.resultHeader}>
                <Ionicons name="sparkles" size={20} color="#00E5FF" />
                <Text style={styles.resultTitle}> AI Solution</Text>
              </View>
              <Text style={styles.resultText}>{answer}</Text>
              <TouchableOpacity style={styles.clearButton} onPress={clearAnswer}>
                <Ionicons name="refresh-outline" size={20} color="#fff" />
                <Text style={styles.clearButtonText}>Scan Another</Text>
              </TouchableOpacity>
            </BlurView>
          </Animated.View>
        )}

        {/* Floating Action Buttons */}
        {!loading && !answer && (
          <View style={[styles.bottomControlsContainer, isLandscape ? { right: 40, bottom: 'auto', top: '50%', transform: [{translateY: -70}] } : { bottom: 50 }]}>
            
            {/* Zoom Toggle Button */}
            <TouchableOpacity style={[styles.zoomButton, isLandscape && { marginBottom: 20 }]} onPress={toggleZoom} activeOpacity={0.7}>
              <Text style={styles.zoomButtonText}>{getZoomLabel()}</Text>
            </TouchableOpacity>

            {/* Main Scan Button */}
            <TouchableOpacity style={[styles.scanButton, isLandscape && { width: 70, height: 70, borderRadius: 35, paddingHorizontal: 0, justifyContent: 'center' }]} onPress={handleScan} activeOpacity={0.7}>
              <Ionicons name="scan-outline" size={isLandscape ? 32 : 28} color="#000" />
              {!isLandscape && <Text style={styles.scanButtonText}>Scan & Solve</Text>}
            </TouchableOpacity>
          </View>
        )}

      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', padding: 30 },
  permissionTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 15, letterSpacing: 1 },
  permissionText: { color: '#A0A0A0', fontSize: 16, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  grantButton: { backgroundColor: '#00E5FF', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 30, shadowColor: '#00E5FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10 },
  grantButtonText: { color: '#000', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },
  camera: { flex: 1 },
  overlayContainer: { ...StyleSheet.absoluteFillObject },
  darkOverlay: { backgroundColor: 'rgba(0,0,0,0.6)' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#00E5FF' },
  scanLine: { width: '100%', height: 2, backgroundColor: '#00E5FF', shadowColor: '#00E5FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 5 },
  instructionText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '500', letterSpacing: 0.5 },
  bottomControlsContainer: { position: 'absolute', width: '100%', alignItems: 'center', zIndex: 10, flexDirection: 'column' },
  zoomButton: { backgroundColor: 'rgba(0,0,0,0.5)', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#00E5FF' },
  zoomButtonText: { color: '#00E5FF', fontWeight: '800', fontSize: 14 },
  scanButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00E5FF', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 50, shadowColor: '#00E5FF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 15, elevation: 8 },
  scanButtonText: { color: '#000', fontSize: 18, fontWeight: '800', marginLeft: 10, letterSpacing: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#00E5FF', marginTop: 20, fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  resultSheetContainer: { position: 'absolute', bottom: 30, left: 20, right: 20, zIndex: 20 },
  resultSheet: { borderRadius: 24, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  resultTitle: { color: '#00E5FF', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  resultText: { color: '#ffffff', fontSize: 18, lineHeight: 28, marginBottom: 25, fontWeight: '500' },
  clearButton: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  clearButtonText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 },
});
