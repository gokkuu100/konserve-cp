import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert, TextInput
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../ThemeContext';
import SignatureScreen from 'react-native-signature-canvas';

const SignatureForm = ({ onSubmit, contractData }) => {
  const { isDarkMode, theme } = useTheme();
  const [signature, setSignature] = useState(null);
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const signatureRef = useRef();

  const handleSignature = (signature) => {
    setSignature(signature);
  };

  const handleClear = () => {
    signatureRef.current.clearSignature();
    setSignature(null);
  };

  const handleSubmit = () => {
    if (!signature) {
      Alert.alert('Signature Required', 'Please sign the contract before proceeding.');
      return;
    }

    if (!fullName.trim()) {
      Alert.alert('Name Required', 'Please enter your full name before proceeding.');
      return;
    }

    onSubmit({
      responseType: 'signature',
      signature,
      signatureDetails: {
        fullName,
        title,
        date
      }
    });
  };

  const style = `.m-signature-pad {
    box-shadow: none;
    border: 1px solid ${isDarkMode ? '#444' : '#e0e0e0'};
    margin-bottom: 16px;
  }
  .m-signature-pad--body {
    border: none;
  }
  .m-signature-pad--footer {
    display: none;
  }
  body {
    background-color: ${isDarkMode ? '#333' : '#f5f5f5'};
  }`;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <Text style={[styles.formTitle, { color: isDarkMode ? theme.text : '#333' }]}>
            Sign Contract
          </Text>
          
          <Text style={[styles.formDescription, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            Please review the contract details and sign below to finalize the agreement.
          </Text>
          
          {/* Contract Summary */}
          <View style={[styles.section, { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Contract Summary
            </Text>
            
            <View style={styles.contractDetail}>
              <Text style={[styles.contractDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Contract:
              </Text>
              <Text style={[styles.contractDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                {contractData.title || 'Waste Collection Service Agreement'}
              </Text>
            </View>
            
            <View style={styles.contractDetail}>
              <Text style={[styles.contractDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Between:
              </Text>
              <Text style={[styles.contractDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                {contractData.business?.business_name || 'Business'} and {contractData.agency?.name || 'Agency'}
              </Text>
            </View>
            
            <View style={styles.contractDetail}>
              <Text style={[styles.contractDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Monthly Fee:
              </Text>
              <Text style={[styles.contractDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                KES {contractData.price?.toLocaleString() || '0'}
              </Text>
            </View>
            
            <View style={styles.contractDetail}>
              <Text style={[styles.contractDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Duration:
              </Text>
              <Text style={[styles.contractDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                {contractData.timeline?.contractDuration || '3'} {parseInt(contractData.timeline?.contractDuration || '3') === 1 ? 'month' : 'months'}
              </Text>
            </View>
          </View>
          
          {/* Signature Section */}
          <View style={[styles.section, { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Electronic Signature
            </Text>
            
            <Text style={[styles.signatureInstructions, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              By signing below, you agree to all the terms and conditions outlined in this contract.
            </Text>
            
            <View style={styles.signatureContainer}>
              <SignatureScreen
                ref={signatureRef}
                onOK={handleSignature}
                webStyle={style}
                backgroundColor={isDarkMode ? '#333' : '#f5f5f5'}
                penColor={isDarkMode ? '#fff' : '#000'}
              />
            </View>
            
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
            >
              <Text style={styles.clearButtonText}>Clear Signature</Text>
            </TouchableOpacity>
            
            <View style={styles.signatureInfoContainer}>
              <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                  Full Name:
                </Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5',
                    color: isDarkMode ? theme.text : '#333',
                    borderColor: isDarkMode ? theme.border : '#e0e0e0'
                  }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                  Title/Position:
                </Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5',
                    color: isDarkMode ? theme.text : '#333',
                    borderColor: isDarkMode ? theme.border : '#e0e0e0'
                  }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter your title or position"
                  placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                  Date:
                </Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5',
                    color: isDarkMode ? theme.text : '#333',
                    borderColor: isDarkMode ? theme.border : '#e0e0e0'
                  }]}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                  editable={false}
                />
              </View>
            </View>
          </View>
          
          {/* Legal Disclaimer */}
          <View style={[styles.disclaimerContainer, { backgroundColor: isDarkMode ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.05)' }]}>
            <MaterialIcons name="info" size={20} color="#FF9800" />
            <Text style={[styles.disclaimerText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              This electronic signature is legally binding. By signing this contract, you acknowledge that you have read, 
              understood, and agree to all terms and conditions. After signing, the contract will proceed to payment to become active.
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => Alert.alert(
            'Cancel Signing',
            'Are you sure you want to cancel? Your progress will not be saved.',
            [
              { text: 'No', style: 'cancel' },
              { text: 'Yes', onPress: () => onSubmit({ responseType: 'cancel' }) }
            ]
          )}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Sign & Continue</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  formDescription: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  contractDetail: {
    marginBottom: 12,
  },
  contractDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  contractDetailValue: {
    fontSize: 16,
  },
  signatureInstructions: {
    fontSize: 14,
    marginBottom: 16,
  },
  signatureContainer: {
    height: 200,
    marginBottom: 16,
  },
  clearButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    marginBottom: 16,
  },
  clearButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '500',
  },
  signatureInfoContainer: {
    marginTop: 16,
  },
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  disclaimerText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default SignatureForm;
