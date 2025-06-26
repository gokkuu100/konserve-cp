import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert, TextInput, Image
} from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../ThemeContext';

const PaymentForm = ({ onSubmit, contractData }) => {
  const { isDarkMode, theme } = useTheme();
  const [paymentMethod, setPaymentMethod] = useState('mpesa'); // mpesa, credit_card
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = () => {
    // Validate payment details
    if (paymentMethod === 'mpesa') {
      if (!phoneNumber.trim() || phoneNumber.length < 10) {
        Alert.alert('Invalid Phone Number', 'Please enter a valid M-Pesa phone number.');
        return;
      }
    } else if (paymentMethod === 'credit_card') {
      if (!cardNumber.trim() || cardNumber.length < 16) {
        Alert.alert('Invalid Card Number', 'Please enter a valid credit card number.');
        return;
      }
      if (!cardExpiry.trim() || !cardExpiry.includes('/')) {
        Alert.alert('Invalid Expiry Date', 'Please enter a valid expiry date (MM/YY).');
        return;
      }
      if (!cardCVC.trim() || cardCVC.length < 3) {
        Alert.alert('Invalid CVC', 'Please enter a valid CVC code.');
        return;
      }
    }

    // Show processing state
    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      
      // Submit payment details
      onSubmit({
        responseType: 'payment',
        paymentMethod,
        paymentDetails: paymentMethod === 'mpesa' 
          ? { phoneNumber } 
          : { cardNumber, cardExpiry, cardCVC },
        paymentStatus: 'paid'
      });
    }, 2000);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <Text style={[styles.formTitle, { color: isDarkMode ? theme.text : '#333' }]}>
            Complete Payment
          </Text>
          
          <Text style={[styles.formDescription, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            Please complete the payment to activate your contract.
          </Text>
          
          {/* Payment Summary */}
          <View style={[styles.section, { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Payment Summary
            </Text>
            
            <View style={styles.paymentDetail}>
              <Text style={[styles.paymentDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Contract:
              </Text>
              <Text style={[styles.paymentDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                {contractData.title || 'Waste Collection Service Agreement'}
              </Text>
            </View>
            
            <View style={styles.paymentDetail}>
              <Text style={[styles.paymentDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Service Provider:
              </Text>
              <Text style={[styles.paymentDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                {contractData.agency?.name || 'Agency'}
              </Text>
            </View>
            
            <View style={styles.paymentDetail}>
              <Text style={[styles.paymentDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Monthly Fee:
              </Text>
              <Text style={[styles.paymentDetailValue, { color: isDarkMode ? theme.text : '#333' }]}>
                KES {contractData.price?.toLocaleString() || '0'}
              </Text>
            </View>
            
            <View style={styles.paymentDetail}>
              <Text style={[styles.paymentDetailLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                First Payment:
              </Text>
              <Text style={[styles.paymentDetailValue, { color: isDarkMode ? theme.text : '#333', fontWeight: '700' }]}>
                KES {contractData.price?.toLocaleString() || '0'}
              </Text>
            </View>
            
            <View style={[styles.divider, { backgroundColor: isDarkMode ? theme.border : '#e0e0e0' }]} />
            
            <View style={styles.paymentTotal}>
              <Text style={[styles.paymentTotalLabel, { color: isDarkMode ? theme.text : '#333' }]}>
                Total Due Today:
              </Text>
              <Text style={[styles.paymentTotalValue, { color: '#4CAF50' }]}>
                KES {contractData.price?.toLocaleString() || '0'}
              </Text>
            </View>
          </View>
          
          {/* Payment Method Selection */}
          <View style={[styles.section, { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Payment Method
            </Text>
            
            <View style={styles.paymentMethodsContainer}>
              <TouchableOpacity
                style={[
                  styles.paymentMethodButton,
                  paymentMethod === 'mpesa' && styles.paymentMethodButtonSelected,
                  { backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5' }
                ]}
                onPress={() => setPaymentMethod('mpesa')}
              >
                <Image
                  source={require('../../assets/mpesa-logo.png')}
                  style={styles.paymentMethodIcon}
                  resizeMode="contain"
                />
                <Text style={[
                  styles.paymentMethodText,
                  { color: isDarkMode ? theme.text : '#333' }
                ]}>
                  M-Pesa
                </Text>
                {paymentMethod === 'mpesa' && (
                  <MaterialIcons name="check-circle" size={20} color="#4CAF50" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.paymentMethodButton,
                  paymentMethod === 'credit_card' && styles.paymentMethodButtonSelected,
                  { backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5' }
                ]}
                onPress={() => setPaymentMethod('credit_card')}
              >
                <FontAwesome name="credit-card" size={24} color="#2196F3" />
                <Text style={[
                  styles.paymentMethodText,
                  { color: isDarkMode ? theme.text : '#333' }
                ]}>
                  Credit Card
                </Text>
                {paymentMethod === 'credit_card' && (
                  <MaterialIcons name="check-circle" size={20} color="#4CAF50" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Payment Details */}
          {paymentMethod === 'mpesa' ? (
            <View style={[styles.section, { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' }]}>
              <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                M-Pesa Details
              </Text>
              
              <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                  Phone Number:
                </Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5',
                    color: isDarkMode ? theme.text : '#333',
                    borderColor: isDarkMode ? theme.border : '#e0e0e0'
                  }]}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Enter M-Pesa phone number"
                  placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                  keyboardType="phone-pad"
                />
              </View>
              
              <Text style={[styles.mpesaInstructions, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                You will receive an M-Pesa prompt on your phone to complete the payment.
              </Text>
            </View>
          ) : (
            <View style={[styles.section, { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' }]}>
              <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                Credit Card Details
              </Text>
              
              <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                  Card Number:
                </Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5',
                    color: isDarkMode ? theme.text : '#333',
                    borderColor: isDarkMode ? theme.border : '#e0e0e0'
                  }]}
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                  keyboardType="number-pad"
                  maxLength={19}
                />
              </View>
              
              <View style={styles.cardExtraDetailsRow}>
                <View style={styles.cardExpiryContainer}>
                  <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                    Expiry Date:
                  </Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5',
                      color: isDarkMode ? theme.text : '#333',
                      borderColor: isDarkMode ? theme.border : '#e0e0e0'
                    }]}
                    value={cardExpiry}
                    onChangeText={setCardExpiry}
                    placeholder="MM/YY"
                    placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
                
                <View style={styles.cardCVCContainer}>
                  <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                    CVC:
                  </Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5',
                      color: isDarkMode ? theme.text : '#333',
                      borderColor: isDarkMode ? theme.border : '#e0e0e0'
                    }]}
                    value={cardCVC}
                    onChangeText={setCardCVC}
                    placeholder="123"
                    placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>
            </View>
          )}
          
          {/* Payment Terms */}
          <View style={[styles.disclaimerContainer, { backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)' }]}>
            <MaterialIcons name="info" size={20} color="#2196F3" />
            <Text style={[styles.disclaimerText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              By completing this payment, you agree to the contract terms. This payment covers the first month of service.
              Subsequent payments will be due according to the payment terms specified in the contract.
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => Alert.alert(
            'Cancel Payment',
            'Are you sure you want to cancel? Your contract will not be activated until payment is completed.',
            [
              { text: 'No', style: 'cancel' },
              { text: 'Yes', onPress: () => onSubmit({ responseType: 'cancel' }) }
            ]
          )}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.payButton,
            isProcessing && styles.processingButton
          ]}
          onPress={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Text style={styles.payButtonText}>Processing...</Text>
          ) : (
            <>
              <Text style={styles.payButtonText}>Pay KES {contractData.price?.toLocaleString() || '0'}</Text>
              <MaterialIcons name="lock" size={20} color="#fff" />
            </>
          )}
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
  paymentDetail: {
    marginBottom: 12,
  },
  paymentDetailLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  paymentDetailValue: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  paymentTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentTotalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    position: 'relative',
  },
  paymentMethodButtonSelected: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  paymentMethodIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
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
  cardExtraDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardExpiryContainer: {
    flex: 1,
    marginRight: 8,
  },
  cardCVCContainer: {
    flex: 1,
    marginLeft: 8,
  },
  mpesaInstructions: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
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
  payButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  processingButton: {
    backgroundColor: '#BDBDBD',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default PaymentForm;
