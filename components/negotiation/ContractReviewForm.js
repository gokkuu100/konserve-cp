import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../ThemeContext';

const ContractReviewForm = ({ onSubmit, contractData }) => {
  const { isDarkMode, theme } = useTheme();
  const [hasReviewed, setHasReviewed] = useState(false);
  
  const handleToggleReviewed = () => {
    setHasReviewed(!hasReviewed);
  };

  const handleSubmit = () => {
    if (!hasReviewed) {
      Alert.alert(
        'Confirmation Required',
        'Please confirm that you have reviewed all contract terms before proceeding.',
        [{ text: 'OK' }]
      );
      return;
    }

    onSubmit({
      responseType: 'accept',
      contractReviewed: true
    });
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Contract',
      'Are you sure you want to reject this contract? This will end the negotiation process.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive', 
          onPress: () => onSubmit({ 
            responseType: 'reject',
            rejectionReason: 'Contract terms not acceptable'
          }) 
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <Text style={[styles.formTitle, { color: isDarkMode ? theme.text : '#333' }]}>
            Contract Review
          </Text>
          
          <Text style={[styles.formDescription, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            Please review the final contract terms carefully before proceeding to signature.
          </Text>
          
          {/* Contract Summary */}
          <View style={[styles.section, { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Contract Summary
            </Text>
            
            <View style={styles.contractDetail}>
              <Text style={[styles.contractDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Contract Title:
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
                {contractData.business?.business_name || 'Business'} (Client)
              </Text>
            </View>
            
            <View style={styles.contractDetail}>
              <Text style={[styles.contractDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                And:
              </Text>
              <Text style={[styles.contractDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                {contractData.agency?.name || 'Agency'} (Service Provider)
              </Text>
            </View>
            
            <View style={styles.contractDetail}>
              <Text style={[styles.contractDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Contract Duration:
              </Text>
              <Text style={[styles.contractDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                {contractData.timeline?.contractDuration || '3'} {parseInt(contractData.timeline?.contractDuration || '3') === 1 ? 'month' : 'months'}
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
          </View>
          
          {/* Service Details */}
          <View style={[styles.section, { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Service Details
            </Text>
            
            <View style={styles.contractDetail}>
              <Text style={[styles.contractDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Waste Types:
              </Text>
              <Text style={[styles.contractDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                {contractData.serviceScope?.wasteTypes?.join(', ') || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.contractDetail}>
              <Text style={[styles.contractDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Collection Frequency:
              </Text>
              <Text style={[styles.contractDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                {contractData.serviceScope?.collectionFrequency || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.contractDetail}>
              <Text style={[styles.contractDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Estimated Volume:
              </Text>
              <Text style={[styles.contractDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                {contractData.serviceScope?.estimatedVolume || 'N/A'} kg per collection
              </Text>
            </View>
            
            <View style={styles.contractDetail}>
              <Text style={[styles.contractDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Additional Services:
              </Text>
              <Text style={[styles.contractDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                {contractData.serviceScope?.additionalServices?.join(', ') || 'None'}
              </Text>
            </View>
          </View>
          
          {/* Terms and Conditions */}
          <View style={[styles.section, { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Terms and Conditions
            </Text>
            
            <View style={styles.contractDetail}>
              <Text style={[styles.contractDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Payment Terms:
              </Text>
              <Text style={[styles.contractDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                {contractData.additionalTerms?.paymentTerms || 'Monthly billing, 14-day payment window'}
              </Text>
            </View>
            
            <View style={styles.contractDetail}>
              <Text style={[styles.contractDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Cancellation Policy:
              </Text>
              <Text style={[styles.contractDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                {contractData.additionalTerms?.cancellationPolicy || '30-day written notice required'}
              </Text>
            </View>
            
            {contractData.additionalTerms?.specialRequirements && (
              <View style={styles.contractDetail}>
                <Text style={[styles.contractDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                  Special Requirements:
                </Text>
                <Text style={[styles.contractDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                  {contractData.additionalTerms.specialRequirements}
                </Text>
              </View>
            )}
            
            <View style={styles.standardTerms}>
              <Text style={[styles.standardTermsTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                Standard Terms:
              </Text>
              <View style={styles.standardTermsList}>
                <View style={styles.standardTermItem}>
                  <MaterialIcons name="check" size={16} color="#4CAF50" />
                  <Text style={[styles.standardTermText, { color: isDarkMode ? theme.text : '#333' }]}>
                    The Service Provider will collect waste according to the agreed schedule.
                  </Text>
                </View>
                <View style={styles.standardTermItem}>
                  <MaterialIcons name="check" size={16} color="#4CAF50" />
                  <Text style={[styles.standardTermText, { color: isDarkMode ? theme.text : '#333' }]}>
                    The Client will ensure waste is properly sorted and accessible for collection.
                  </Text>
                </View>
                <View style={styles.standardTermItem}>
                  <MaterialIcons name="check" size={16} color="#4CAF50" />
                  <Text style={[styles.standardTermText, { color: isDarkMode ? theme.text : '#333' }]}>
                    The Service Provider will dispose of waste in compliance with environmental regulations.
                  </Text>
                </View>
                <View style={styles.standardTermItem}>
                  <MaterialIcons name="check" size={16} color="#4CAF50" />
                  <Text style={[styles.standardTermText, { color: isDarkMode ? theme.text : '#333' }]}>
                    The contract will automatically renew unless terminated by either party.
                  </Text>
                </View>
                <View style={styles.standardTermItem}>
                  <MaterialIcons name="check" size={16} color="#4CAF50" />
                  <Text style={[styles.standardTermText, { color: isDarkMode ? theme.text : '#333' }]}>
                    Disputes will be resolved through negotiation or mediation before legal action.
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Confirmation Checkbox */}
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={handleToggleReviewed}
          >
            <View style={[
              styles.checkbox, 
              hasReviewed ? 
                { backgroundColor: '#4CAF50', borderColor: '#4CAF50' } : 
                { backgroundColor: 'transparent', borderColor: isDarkMode ? theme.border : '#e0e0e0' }
            ]}>
              {hasReviewed && <MaterialIcons name="check" size={16} color="#fff" />}
            </View>
            <Text style={[styles.checkboxLabel, { color: isDarkMode ? theme.text : '#333' }]}>
              I have reviewed and accept all the terms and conditions of this contract
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.rejectButton]}
          onPress={handleReject}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.footerButton, 
            styles.acceptButton,
            !hasReviewed && styles.disabledButton
          ]}
          onPress={handleSubmit}
          disabled={!hasReviewed}
        >
          <Text style={styles.acceptButtonText}>Proceed to Signature</Text>
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
  standardTerms: {
    marginTop: 16,
  },
  standardTermsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  standardTermsList: {
    marginLeft: 8,
  },
  standardTermItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  standardTermText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 16,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  footerButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    flex: 1,
  },
  rejectButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    flex: 2,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
});

export default ContractReviewForm;
