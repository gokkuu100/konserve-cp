import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, 
  StyleSheet, ActivityIndicator, Alert, Switch, Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../ThemeContext';
import BusinessProfileManager from '../supabase/manager/business/BusinessProfileManager';

const BusinessProfileCreationScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [step, setStep] = useState(1); // 1 = Business Details, 2 = Waste Details
  
  // Business Profile Form State
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessConstituency, setBusinessConstituency] = useState('');
  const [businessCounty, setBusinessCounty] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [numberOfEmployees, setNumberOfEmployees] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  
  // Waste Details Form State
  const [wasteGeneratedKgPerWeek, setWasteGeneratedKgPerWeek] = useState('');
  const [wasteTypes, setWasteTypes] = useState([]);
  const [currentDisposalMethod, setCurrentDisposalMethod] = useState('');
  const [sortingCapability, setSortingCapability] = useState(false);
  const [recyclingInterest, setRecyclingInterest] = useState(false);
  const [collectionFrequencyPreference, setCollectionFrequencyPreference] = useState('weekly');
  const [specialRequirements, setSpecialRequirements] = useState('');
  
  // Available waste types
  const availableWasteTypes = [
    'General Waste', 'Organic/Food Waste', 'Paper/Cardboard', 
    'Plastic', 'Glass', 'Metal', 'E-waste', 'Hazardous Waste'
  ];
  
  // Collection frequency options
  const frequencyOptions = [
    { label: 'Daily', value: 'daily' },
    { label: 'Twice a week', value: 'twice_weekly' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Bi-weekly', value: 'bi_weekly' },
    { label: 'Monthly', value: 'monthly' }
  ];
  
  useEffect(() => {
    const loadBusinessTypes = async () => {
      try {
        const types = await BusinessProfileManager.getBusinessTypes();
        setBusinessTypes(types);
        if (types.length > 0) {
          setBusinessType(types[0].type_name);
        }
      } catch (error) {
        console.error('Error loading business types:', error);
        Alert.alert('Error', 'Failed to load business types. Please try again.');
      }
    };
    
    loadBusinessTypes();
  }, []);
  
  const toggleWasteType = (wasteType) => {
    if (wasteTypes.includes(wasteType)) {
      setWasteTypes(wasteTypes.filter(type => type !== wasteType));
    } else {
      setWasteTypes([...wasteTypes, wasteType]);
    }
  };
  
  const validateBusinessDetails = () => {
    if (!businessName.trim()) return 'Business name is required';
    if (!businessType.trim()) return 'Business type is required';
    if (!businessAddress.trim()) return 'Business address is required';
    if (!businessConstituency.trim()) return 'Constituency is required';
    if (!businessCounty.trim()) return 'County is required';
    if (!contactPerson.trim()) return 'Contact person is required';
    if (!contactPhone.trim()) return 'Contact phone is required';
    if (contactEmail && !contactEmail.includes('@')) return 'Valid email is required';
    if (!numberOfEmployees || isNaN(numberOfEmployees)) return 'Valid number of employees is required';
    
    return null;
  };
  
  const validateWasteDetails = () => {
    if (!wasteGeneratedKgPerWeek || isNaN(wasteGeneratedKgPerWeek)) 
      return 'Valid waste amount in kg is required';
    if (wasteTypes.length === 0) 
      return 'At least one waste type must be selected';
    if (!currentDisposalMethod.trim()) 
      return 'Current disposal method is required';
    if (!collectionFrequencyPreference) 
      return 'Collection frequency preference is required';
    
    return null;
  };
  
  const handleNextStep = () => {
    const error = validateBusinessDetails();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }
    
    setStep(2);
  };
  
  const handlePreviousStep = () => {
    setStep(1);
  };
  
  const handleSubmit = async () => {
    const error = validateWasteDetails();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }
    
    setLoading(true);
    
    try {
      const profileData = {
        userId: user.id,
        businessName,
        businessType,
        businessAddress,
        businessConstituency,
        businessCounty,
        contactPerson,
        contactEmail,
        contactPhone,
        numberOfEmployees: parseInt(numberOfEmployees),
        businessDescription
      };
      
      const wasteData = {
        wasteGeneratedKgPerWeek: parseFloat(wasteGeneratedKgPerWeek),
        wasteTypes,
        currentDisposalMethod,
        sortingCapability,
        recyclingInterest,
        collectionFrequencyPreference,
        specialRequirements
      };
      
      await BusinessProfileManager.createBusinessProfile(profileData, wasteData);
      
      Alert.alert(
        'Success',
        'Business profile created successfully',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('BusinessProfilesScreen') 
          }
        ]
      );
    } catch (error) {
      console.error('Error creating business profile:', error);
      Alert.alert('Error', 'Failed to create business profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const renderBusinessDetailsForm = () => (
    <ScrollView style={styles.formContainer}>
      <Text style={[styles.formTitle, { color: isDarkMode ? theme.text : '#333' }]}>
        Business Details
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
          Business Name *
        </Text>
        <TextInput
          style={[
            styles.textInput,
            { 
              backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
              color: isDarkMode ? theme.text : '#333',
              borderColor: isDarkMode ? '#444' : '#e0e0e0'
            }
          ]}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Enter business name"
          placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
          Business Type *
        </Text>
        <View style={[
          styles.pickerContainer,
          { 
            backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
            borderColor: isDarkMode ? '#444' : '#e0e0e0'
          }
        ]}>
          <Picker
            selectedValue={businessType}
            onValueChange={(itemValue) => setBusinessType(itemValue)}
            style={[styles.picker, { color: isDarkMode ? theme.text : '#333' }]}
            dropdownIconColor={isDarkMode ? theme.text : '#333'}
          >
            {businessTypes.map((type) => (
              <Picker.Item key={type.id} label={type.type_name} value={type.type_name} />
            ))}
          </Picker>
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
          Business Address *
        </Text>
        <TextInput
          style={[
            styles.textInput,
            { 
              backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
              color: isDarkMode ? theme.text : '#333',
              borderColor: isDarkMode ? '#444' : '#e0e0e0'
            }
          ]}
          value={businessAddress}
          onChangeText={setBusinessAddress}
          placeholder="Enter business address"
          placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
          multiline
        />
      </View>
      
      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            Constituency *
          </Text>
          <TextInput
            style={[
              styles.textInput,
              { 
                backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
                color: isDarkMode ? theme.text : '#333',
                borderColor: isDarkMode ? '#444' : '#e0e0e0'
              }
            ]}
            value={businessConstituency}
            onChangeText={setBusinessConstituency}
            placeholder="Constituency"
            placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
          />
        </View>
        
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            County *
          </Text>
          <TextInput
            style={[
              styles.textInput,
              { 
                backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
                color: isDarkMode ? theme.text : '#333',
                borderColor: isDarkMode ? '#444' : '#e0e0e0'
              }
            ]}
            value={businessCounty}
            onChangeText={setBusinessCounty}
            placeholder="County"
            placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
          Contact Person *
        </Text>
        <TextInput
          style={[
            styles.textInput,
            { 
              backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
              color: isDarkMode ? theme.text : '#333',
              borderColor: isDarkMode ? '#444' : '#e0e0e0'
            }
          ]}
          value={contactPerson}
          onChangeText={setContactPerson}
          placeholder="Full name of contact person"
          placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
        />
      </View>
      
      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            Email
          </Text>
          <TextInput
            style={[
              styles.textInput,
              { 
                backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
                color: isDarkMode ? theme.text : '#333',
                borderColor: isDarkMode ? '#444' : '#e0e0e0'
              }
            ]}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="Email address"
            placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
            keyboardType="email-address"
          />
        </View>
        
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            Phone *
          </Text>
          <TextInput
            style={[
              styles.textInput,
              { 
                backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
                color: isDarkMode ? theme.text : '#333',
                borderColor: isDarkMode ? '#444' : '#e0e0e0'
              }
            ]}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="Phone number"
            placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
            keyboardType="phone-pad"
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
          Number of Employees *
        </Text>
        <TextInput
          style={[
            styles.textInput,
            { 
              backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
              color: isDarkMode ? theme.text : '#333',
              borderColor: isDarkMode ? '#444' : '#e0e0e0'
            }
          ]}
          value={numberOfEmployees}
          onChangeText={setNumberOfEmployees}
          placeholder="Number of employees"
          placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
          keyboardType="numeric"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
          Business Description
        </Text>
        <TextInput
          style={[
            styles.textArea,
            { 
              backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
              color: isDarkMode ? theme.text : '#333',
              borderColor: isDarkMode ? '#444' : '#e0e0e0'
            }
          ]}
          value={businessDescription}
          onChangeText={setBusinessDescription}
          placeholder="Brief description of your business"
          placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
      
      <TouchableOpacity
        style={[styles.nextButton, { opacity: loading ? 0.7 : 1 }]}
        onPress={handleNextStep}
        disabled={loading}
      >
        <Text style={styles.nextButtonText}>Next: Waste Details</Text>
        <MaterialIcons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
  
  const renderWasteDetailsForm = () => (
    <ScrollView style={styles.formContainer}>
      <Text style={[styles.formTitle, { color: isDarkMode ? theme.text : '#333' }]}>
        Waste Management Details
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
          Waste Generated (kg per week) *
        </Text>
        <TextInput
          style={[
            styles.textInput,
            { 
              backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
              color: isDarkMode ? theme.text : '#333',
              borderColor: isDarkMode ? '#444' : '#e0e0e0'
            }
          ]}
          value={wasteGeneratedKgPerWeek}
          onChangeText={setWasteGeneratedKgPerWeek}
          placeholder="Estimated kg per week"
          placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
          keyboardType="numeric"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
          Types of Waste Generated *
        </Text>
        <View style={styles.checkboxContainer}>
          {availableWasteTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.checkboxItem,
                { 
                  backgroundColor: wasteTypes.includes(type) 
                    ? (isDarkMode ? '#2e7d32' : '#e8f5e9') 
                    : (isDarkMode ? '#333' : '#f5f5f5'),
                  borderColor: wasteTypes.includes(type) 
                    ? '#4CAF50' 
                    : (isDarkMode ? '#444' : '#e0e0e0')
                }
              ]}
              onPress={() => toggleWasteType(type)}
            >
              <MaterialIcons 
                name={wasteTypes.includes(type) ? "check-box" : "check-box-outline-blank"} 
                size={20} 
                color={wasteTypes.includes(type) ? "#4CAF50" : (isDarkMode ? theme.textSecondary : "#666")} 
              />
              <Text style={[
                styles.checkboxText,
                { 
                  color: wasteTypes.includes(type) 
                    ? (isDarkMode ? '#fff' : '#2e7d32') 
                    : (isDarkMode ? theme.textSecondary : '#666')
                }
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
          Current Disposal Method *
        </Text>
        <TextInput
          style={[
            styles.textInput,
            { 
              backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
              color: isDarkMode ? theme.text : '#333',
              borderColor: isDarkMode ? '#444' : '#e0e0e0'
            }
          ]}
          value={currentDisposalMethod}
          onChangeText={setCurrentDisposalMethod}
          placeholder="How do you currently dispose of waste?"
          placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
          Collection Frequency Preference *
        </Text>
        <View style={[
          styles.pickerContainer,
          { 
            backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
            borderColor: isDarkMode ? '#444' : '#e0e0e0'
          }
        ]}>
          <Picker
            selectedValue={collectionFrequencyPreference}
            onValueChange={(itemValue) => setCollectionFrequencyPreference(itemValue)}
            style={[styles.picker, { color: isDarkMode ? theme.text : '#333' }]}
            dropdownIconColor={isDarkMode ? theme.text : '#333'}
          >
            {frequencyOptions.map((option) => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>
      </View>
      
      <View style={styles.switchContainer}>
        <View style={styles.switchItem}>
          <Text style={[styles.switchLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            Do you sort waste?
          </Text>
          <Switch
            value={sortingCapability}
            onValueChange={setSortingCapability}
            trackColor={{ false: isDarkMode ? '#444' : '#e0e0e0', true: '#81c784' }}
            thumbColor={sortingCapability ? '#4CAF50' : isDarkMode ? '#666' : '#f5f5f5'}
          />
        </View>
        
        <View style={styles.switchItem}>
          <Text style={[styles.switchLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            Interested in recycling?
          </Text>
          <Switch
            value={recyclingInterest}
            onValueChange={setRecyclingInterest}
            trackColor={{ false: isDarkMode ? '#444' : '#e0e0e0', true: '#81c784' }}
            thumbColor={recyclingInterest ? '#4CAF50' : isDarkMode ? '#666' : '#f5f5f5'}
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
          Special Requirements
        </Text>
        <TextInput
          style={[
            styles.textArea,
            { 
              backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
              color: isDarkMode ? theme.text : '#333',
              borderColor: isDarkMode ? '#444' : '#e0e0e0'
            }
          ]}
          value={specialRequirements}
          onChangeText={setSpecialRequirements}
          placeholder="Any special requirements or considerations?"
          placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.backButton, { opacity: loading ? 0.7 : 1 }]}
          onPress={handlePreviousStep}
          disabled={loading}
        >
          <MaterialIcons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.submitButton, { opacity: loading ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Create Profile</Text>
              <MaterialIcons name="check" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
  
  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? theme.background : '#fff' }]}>
      {/* Header */}
      <View style={[styles.header, { 
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
        borderBottomColor: isDarkMode ? '#444' : '#e0e0e0'
      }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={isDarkMode ? theme.text : '#333'} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: isDarkMode ? theme.text : '#333' }]}>
            Create Business Profile
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            {step === 1 ? 'Step 1: Business Details' : 'Step 2: Waste Details'}
          </Text>
        </View>
      </View>
      
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressStep, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.progressStepText}>1</Text>
        </View>
        <View style={[styles.progressLine, { backgroundColor: step === 2 ? '#4CAF50' : (isDarkMode ? '#444' : '#e0e0e0') }]} />
        <View style={[styles.progressStep, { backgroundColor: step === 2 ? '#4CAF50' : (isDarkMode ? '#444' : '#e0e0e0') }]}>
          <Text style={styles.progressStepText}>2</Text>
        </View>
      </View>
      
      {/* Form Content */}
      {step === 1 ? renderBusinessDetailsForm() : renderWasteDetailsForm()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    padding: 8
  },
  headerTitleContainer: {
    marginLeft: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666'
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16
  },
  progressStep: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressStepText: {
    color: '#fff',
    fontWeight: '600'
  },
  progressLine: {
    height: 2,
    width: 100,
    backgroundColor: '#e0e0e0'
  },
  formContainer: {
    flex: 1,
    padding: 16
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333'
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666'
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333'
  },
  textArea: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 100
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden'
  },
  picker: {
    height: 50,
    width: '100%'
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  checkboxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    marginBottom: 8
  },
  checkboxText: {
    marginLeft: 4,
    color: '#666'
  },
  switchContainer: {
    marginBottom: 16
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  switchLabel: {
    fontSize: 16,
    color: '#666'
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 32
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 32
  },
  backButton: {
    backgroundColor: '#757575',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 2
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8
  }
});

export default BusinessProfileCreationScreen;
