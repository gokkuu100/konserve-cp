import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import ConstituencyManager from '../supabase/manager/constituencychange/ConstituencyManager';
import LocationSelectionModal from './LocationSelectionModal';

const ConstituencyChangeRequest = ({ visible, onClose, currentConstituency }) => {
  const { userId } = useAuth();
  const [reason, setReason] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setReason('');
      setSelectedConstituency('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!selectedConstituency) {
      Alert.alert('Missing Field', 'Please select a new constituency');
      return;
    }
    
    if (selectedConstituency === currentConstituency) {
      Alert.alert('Same Constituency', 'Please select a different constituency than your current one');
      return;
    }
    
    if (!reason.trim()) {
      Alert.alert('Missing Field', 'Please provide a reason for your change request');
      return;
    }
    
    try {
      setLoading(true);
      
      const { success, error } = await ConstituencyManager.submitChangeRequest({
        userId, 
        currentConstituency, 
        requestedConstituency: selectedConstituency, 
        reason: reason.trim()
      });
      
      if (!success) {
        throw new Error(error?.message || 'Failed to submit request');
      }
      
      Alert.alert(
        'Request Submitted',
        'Your constituency change request has been submitted successfully and is pending approval.',
        [{ text: 'OK', onPress: () => onClose(true) }]
      );
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => onClose(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Constituency Change</Text>
            <TouchableOpacity onPress={() => onClose(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.formContainer}>
            <Text style={styles.label}>Current Constituency</Text>
            <View style={styles.inputField}>
              <Text style={styles.currentValue}>{currentConstituency}</Text>
            </View>
            
            <Text style={styles.label}>New Constituency</Text>
            <TouchableOpacity 
              style={styles.constituencySelector}
              onPress={() => setLocationModalVisible(true)}
            >
              <Text style={selectedConstituency ? styles.constituencyText : styles.constituencyPlaceholder}>
                {selectedConstituency || "Select constituency"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#555" />
            </TouchableOpacity>
            
            <Text style={styles.label}>Reason for Change</Text>
            <TextInput
              style={styles.reasonInput}
              multiline={true}
              numberOfLines={4}
              placeholder="Please provide a reason for your constituency change request..."
              value={reason}
              onChangeText={setReason}
              textAlignVertical="top"
            />
            
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.disabledButton]}
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
        onSelectCounty={() => {}} // No county selection
        onSelectConstituency={(constituency) => {
          setSelectedConstituency(constituency);
          setLocationModalVisible(false);
        }}
        selectedCounty="Nairobi County"
        selectedConstituency={selectedConstituency}
        isCountySelectable={false}
        title="Select New Constituency"
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
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
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
  },
  inputField: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  currentValue: {
    fontSize: 16,
    color: '#333',
  },
  constituencySelector: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  constituencyText: {
    fontSize: 16,
    color: '#333',
  },
  constituencyPlaceholder: {
    fontSize: 16,
    color: '#aaa',
  },
  reasonInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 120,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#357002',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: '#aaa',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ConstituencyChangeRequest;
