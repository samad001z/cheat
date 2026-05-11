import { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, SafeAreaView, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { solveMCQ } from './geminiService';

export default function App() {
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const cameraRef = useRef(null);

  // Still checking/loading permissions
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4F8EF7" />
      </View>
    );
  }

  // Permissions not granted yet
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need your permission to use the camera to scan MCQs.</Text>
        <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
          <Text style={styles.grantButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleScan = async () => {
    if (cameraRef.current) {
      setLoading(true);
      try {
        // Capture frame as base64
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 1, // Maximum quality for best text recognition
        });
        
        // Pass base64 image to Gemini Service
        const result = await solveMCQ(photo.base64);
        setAnswer(result);
      } catch (error) {
        alert(error.message || "An error occurred during analysis.");
      } finally {
        setLoading(false);
      }
    }
  };

  const clearAnswer = () => {
    setAnswer(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView style={styles.camera} facing="back" autofocus="on" ref={cameraRef}>
        
        {/* Scanning Area Visualizer */}
        <View style={styles.overlay}>
          <View style={[styles.scanBox, { width: width * 0.85, height: height * 0.35 }]} />
          <Text style={styles.instructionText}>Position the MCQ inside the frame</Text>
        </View>

        {/* Loading State Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Analyzing logic...</Text>
          </View>
        )}

        {/* Bottom Results Sheet */}
        {answer && (
          <View style={styles.resultSheet}>
            <Text style={styles.resultTitle}>Analysis Complete</Text>
            <Text style={styles.resultText}>{answer}</Text>
            <TouchableOpacity style={styles.clearButton} onPress={clearAnswer}>
              <Text style={styles.clearButtonText}>Clear / Next Question</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Button */}
        {!loading && !answer && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.scanButton} onPress={handleScan}>
              <Text style={styles.scanButtonText}>Scan & Solve</Text>
            </TouchableOpacity>
          </View>
        )}

      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Dark mode background
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  grantButton: {
    backgroundColor: '#4F8EF7',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  grantButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBox: {
    borderWidth: 2,
    borderColor: '#4F8EF7',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    marginBottom: 20,
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#4F8EF7',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: '#4F8EF7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  resultSheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(25, 25, 25, 0.95)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    paddingBottom: 50,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  resultTitle: {
    color: '#4F8EF7',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  resultText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 24,
  },
  clearButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
