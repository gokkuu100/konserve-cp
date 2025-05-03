import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LocationSelectionModal from './LocationSelectionModal';
import ConstituencyManager from '../supabase/manager/location/ConstituencyManager';
import { useAuth } from '../contexts/AuthContext';

const ConstituencyChangeRequest = ({ visible, onClose, currentConstituency }) => {
  const { user, userId, isAuthenticated } = useAuth();
  const [reason, setReason] = useState('');
  const [newConstituency, setNewConstituency] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  const handleSubmit = async () => {
    if (!newConstituency) {
      Alert.alert('Error', 'Please select a new constituency');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for changing your constituency');
      return;
    }

    setLoading(true);
    try {
      // Check if user is authenticated
      if (!isAuthenticated || !userId) {
        throw new Error('User not authenticated');
      }

      // Submit change request to Supabase using ConstituencyManager
      const { success, error } = await ConstituencyManager.submitConstituencyChangeRequest({
        userId: userId,
        currentConstituency: currentConstituency,
        requestedConstituency: newConstituency,
        reason: reason
      });

      if (!success) {
        throw new Error(error?.message || 'Failed to submit request');
      }

      Alert.alert(
        'Request Submitted',
        'Your constituency change request has been submitted and is pending approval.',
        [{ text: 'OK', onPress: () => {
          setReason('');
          setNewConstituency('');
          onClose(true); // Pass true to indicate successful submission
        }}]
      );
    } catch (error) {
      console.error('Error submitting constituency change request:', error);
      Alert.alert('Error', error.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Constituency Change</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.infoText}>
              Changing your constituency requires approval. Please provide the following information.
            </Text>

            <View style={styles.currentLocationContainer}>
              <Text style={styles.label}>Current Constituency:</Text>
              <Text style={styles.currentLocation}>{currentConstituency}</Text>
            </View>

            <Text style={styles.label}>New Constituency:</Text>
            <TouchableOpacity
              style={styles.locationSelector}
              onPress={() => setLocationModalVisible(true)}
            >
              <Text style={newConstituency ? styles.selectedLocation : styles.placeholderText}>
                {newConstituency || "Select new constituency"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#357002" />
            </TouchableOpacity>

            <Text style={styles.label}>Reason for Change:</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Please explain why you're changing your constituency..."
              value={reason}
              onChangeText={setReason}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      <LocationSelectionModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onSelectCounty={() => {}}
        onSelectConstituency={(constituency) => {
          setNewConstituency(constituency);
          setLocationModalVisible(false);
        }}
        selectedCounty="Nairobi"
        selectedConstituency={newConstituency}
        isCountySelectable={false}
        title="Select New Constituency"
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  currentLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  currentLocation: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  locationSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
  },
  selectedLocation: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#357002',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ConstituencyChangeRequest;
