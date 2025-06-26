import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../ThemeContext';

const InitialOfferForm = ({ onSubmit, initialData, isAgency }) => {
  const { isDarkMode, theme } = useTheme();
  
  const [price, setPrice] = useState(initialData?.price || '');
  const [serviceScope, setServiceScope] = useState({
    wasteTypes: initialData?.serviceScope?.wasteTypes || [],
    collectionFrequency: initialData?.serviceScope?.collectionFrequency || '',
    estimatedVolume: initialData?.serviceScope?.estimatedVolume || '',
    additionalServices: initialData?.serviceScope?.additionalServices || [],
  });
  
  const [timeline, setTimeline] = useState({
    startDate: initialData?.timeline?.startDate || '',
    endDate: initialData?.timeline?.endDate || '',
    contractDuration: initialData?.timeline?.contractDuration || '3', // Default 3 months
  });
  
  const [additionalTerms, setAdditionalTerms] = useState({
    paymentTerms: initialData?.additionalTerms?.paymentTerms || 'Monthly billing, 14-day payment window',
    cancellationPolicy: initialData?.additionalTerms?.cancellationPolicy || '30-day written notice required',
    specialRequirements: initialData?.additionalTerms?.specialRequirements || '',
  });

  // Waste type options
  const wasteTypeOptions = [
    'General Waste', 'Recyclables', 'Organic Waste', 'Hazardous Waste', 
    'E-waste', 'Construction Waste', 'Medical Waste'
  ];
  
  // Collection frequency options
  const frequencyOptions = [
    'Daily', 'Twice a week', 'Weekly', 'Bi-weekly', 'Monthly', 'On-demand'
  ];
  
  // Contract duration options
  const durationOptions = [
    '1', '3', '6', '12', '24'
  ];

  // Additional services options
  const additionalServicesOptions = [
    'Waste Sorting', 'Recycling Services', 'Waste Audits', 
    'Container Rental', 'Hazardous Waste Handling', 'On-site Compacting'
  ];

  const toggleWasteType = (type) => {
    const updatedTypes = [...serviceScope.wasteTypes];
    if (updatedTypes.includes(type)) {
      const index = updatedTypes.indexOf(type);
      updatedTypes.splice(index, 1);
    } else {
      updatedTypes.push(type);
    }
    setServiceScope({ ...serviceScope, wasteTypes: updatedTypes });
  };

  const toggleAdditionalService = (service) => {
    const updatedServices = [...serviceScope.additionalServices];
    if (updatedServices.includes(service)) {
      const index = updatedServices.indexOf(service);
      updatedServices.splice(index, 1);
    } else {
      updatedServices.push(service);
    }
    setServiceScope({ ...serviceScope, additionalServices: updatedServices });
  };

  const handleSubmit = () => {
    // Validate form
    if (!price) {
      Alert.alert('Error', 'Please enter a price');
      return;
    }
    
    if (serviceScope.wasteTypes.length === 0) {
      Alert.alert('Error', 'Please select at least one waste type');
      return;
    }
    
    if (!serviceScope.collectionFrequency) {
      Alert.alert('Error', 'Please select a collection frequency');
      return;
    }
    
    if (!timeline.contractDuration) {
      Alert.alert('Error', 'Please select a contract duration');
      return;
    }
    
    // Submit the form
    onSubmit({
      responseType: 'initial',
      price: parseFloat(price),
      serviceScope,
      timeline,
      additionalTerms
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <Text style={[styles.formTitle, { color: isDarkMode ? theme.text : '#333' }]}>
            {isAgency ? 'Create Service Offer' : 'Request Waste Collection Service'}
          </Text>
          
          {/* Price Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Price Details
            </Text>
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Monthly Price (KES)
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5',
                  color: isDarkMode ? theme.text : '#333',
                  borderColor: isDarkMode ? theme.border : '#e0e0e0'
                }]}
                value={price}
                onChangeText={setPrice}
                placeholder="Enter price"
                placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                keyboardType="numeric"
              />
            </View>
          </View>
          
          {/* Service Scope Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Service Scope
            </Text>
            
            {/* Waste Types */}
            <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              Waste Types
            </Text>
            <View style={styles.optionsContainer}>
              {wasteTypeOptions.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.optionButton,
                    serviceScope.wasteTypes.includes(type) ? 
                      styles.optionButtonSelected : 
                      { backgroundColor: isDarkMode ? theme.cardBackground : '#f5f5f5' }
                  ]}
                  onPress={() => toggleWasteType(type)}
                >
                  <Text style={[
                    styles.optionText,
                    serviceScope.wasteTypes.includes(type) ? 
                      styles.optionTextSelected : 
                      { color: isDarkMode ? theme.text : '#666' }
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Collection Frequency */}
            <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666', marginTop: 16 }]}>
              Collection Frequency
            </Text>
            <View style={styles.optionsContainer}>
              {frequencyOptions.map((frequency) => (
                <TouchableOpacity
                  key={frequency}
                  style={[
                    styles.optionButton,
                    serviceScope.collectionFrequency === frequency ? 
                      styles.optionButtonSelected : 
                      { backgroundColor: isDarkMode ? theme.cardBackground : '#f5f5f5' }
                  ]}
                  onPress={() => setServiceScope({ ...serviceScope, collectionFrequency: frequency })}
                >
                  <Text style={[
                    styles.optionText,
                    serviceScope.collectionFrequency === frequency ? 
                      styles.optionTextSelected : 
                      { color: isDarkMode ? theme.text : '#666' }
                  ]}>
                    {frequency}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Estimated Volume */}
            <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666', marginTop: 16 }]}>
              Estimated Volume (kg per collection)
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5',
                color: isDarkMode ? theme.text : '#333',
                borderColor: isDarkMode ? theme.border : '#e0e0e0'
              }]}
              value={serviceScope.estimatedVolume}
              onChangeText={(text) => setServiceScope({ ...serviceScope, estimatedVolume: text })}
              placeholder="e.g., 100"
              placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
              keyboardType="numeric"
            />
            
            {/* Additional Services */}
            <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666', marginTop: 16 }]}>
              Additional Services (Optional)
            </Text>
            <View style={styles.optionsContainer}>
              {additionalServicesOptions.map((service) => (
                <TouchableOpacity
                  key={service}
                  style={[
                    styles.optionButton,
                    serviceScope.additionalServices.includes(service) ? 
                      styles.optionButtonSelected : 
                      { backgroundColor: isDarkMode ? theme.cardBackground : '#f5f5f5' }
                  ]}
                  onPress={() => toggleAdditionalService(service)}
                >
                  <Text style={[
                    styles.optionText,
                    serviceScope.additionalServices.includes(service) ? 
                      styles.optionTextSelected : 
                      { color: isDarkMode ? theme.text : '#666' }
                  ]}>
                    {service}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Timeline Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Timeline
            </Text>
            
            {/* Contract Duration */}
            <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              Contract Duration (months)
            </Text>
            <View style={styles.optionsContainer}>
              {durationOptions.map((duration) => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.optionButton,
                    timeline.contractDuration === duration ? 
                      styles.optionButtonSelected : 
                      { backgroundColor: isDarkMode ? theme.cardBackground : '#f5f5f5' }
                  ]}
                  onPress={() => setTimeline({ ...timeline, contractDuration: duration })}
                >
                  <Text style={[
                    styles.optionText,
                    timeline.contractDuration === duration ? 
                      styles.optionTextSelected : 
                      { color: isDarkMode ? theme.text : '#666' }
                  ]}>
                    {duration} {parseInt(duration) === 1 ? 'month' : 'months'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Additional Terms Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Additional Terms
            </Text>
            
            {/* Payment Terms */}
            <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              Payment Terms
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5',
                color: isDarkMode ? theme.text : '#333',
                borderColor: isDarkMode ? theme.border : '#e0e0e0'
              }]}
              value={additionalTerms.paymentTerms}
              onChangeText={(text) => setAdditionalTerms({ ...additionalTerms, paymentTerms: text })}
              placeholder="e.g., Monthly billing, 14-day payment window"
              placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
            />
            
            {/* Cancellation Policy */}
            <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666', marginTop: 16 }]}>
              Cancellation Policy
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5',
                color: isDarkMode ? theme.text : '#333',
                borderColor: isDarkMode ? theme.border : '#e0e0e0'
              }]}
              value={additionalTerms.cancellationPolicy}
              onChangeText={(text) => setAdditionalTerms({ ...additionalTerms, cancellationPolicy: text })}
              placeholder="e.g., 30-day written notice required"
              placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
            />
            
            {/* Special Requirements */}
            <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666', marginTop: 16 }]}>
              Special Requirements (Optional)
            </Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5',
                color: isDarkMode ? theme.text : '#333',
                borderColor: isDarkMode ? theme.border : '#e0e0e0',
                textAlignVertical: 'top'
              }]}
              value={additionalTerms.specialRequirements}
              onChangeText={(text) => setAdditionalTerms({ ...additionalTerms, specialRequirements: text })}
              placeholder="Enter any special requirements or notes"
              placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Submit Offer</Text>
          <MaterialIcons name="send" size={20} color="#fff" />
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
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
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
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 100,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  optionButtonSelected: {
    backgroundColor: '#4CAF50',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default InitialOfferForm;
