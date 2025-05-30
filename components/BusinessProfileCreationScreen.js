import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, 
  StyleSheet, ActivityIndicator, Alert, Switch, Platform,
  KeyboardAvoidingView, Dimensions, StatusBar, SafeAreaView,
  Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { Modal, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import BusinessProfileManager from '../supabase/manager/business/BusinessProfileManager';

const BusinessProfileCreationScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false);
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
  const [collectionFrequency, setCollectionFrequency] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  
  // Available waste types
  const availableWasteTypes = [
    'General Waste', 'Organic/Food Waste', 'Paper/Cardboard', 
    'Plastic', 'Glass', 'Metal', 'E-waste', 'Hazardous Waste'
  ];
  
  // Collection frequency options
  const [collectionFrequencyOptions] = useState([
    { label: 'Select frequency', value: '' },
    { label: 'Daily', value: 'Daily' },
    { label: 'Weekly', value: 'Weekly' },
    { label: 'Bi-weekly', value: 'Bi-weekly' },
    { label: 'Monthly', value: 'Monthly' },
    { label: 'On-demand', value: 'On-demand' }
  ]);
  
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  
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
    if (!collectionFrequency) 
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
        collectionFrequency,
        specialRequirements
      };
      
      const newProfile = await BusinessProfileManager.createBusinessProfile(profileData, wasteData);
      
      Alert.alert(
        'Success',
        'Business profile created successfully',
        [
          { 
            text: 'View Agencies', 
            onPress: () => navigation.replace('CollectionAgenciesForBusinessScreen', { businessProfileId: newProfile.id }) 
          },
          {
            text: 'View All Profiles',
            onPress: () => navigation.replace('BusinessProfilesScreen')
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
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
          <TouchableOpacity 
            style={[styles.pickerButton, { 
              backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5',
              borderColor: isDarkMode ? theme.border : '#e0e0e0'
            }]}
            onPress={() => setShowBusinessTypeModal(true)}
          >
            <Text style={[styles.pickerButtonText, { 
              color: businessType ? (isDarkMode ? theme.text : '#333') : (isDarkMode ? theme.textSecondary : '#999')
            }]}>
              {businessType || 'Select business type'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color={isDarkMode ? theme.text : '#666'} />
          </TouchableOpacity>
        </View>
        
        <Modal
          visible={showBusinessTypeModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowBusinessTypeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { 
              backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
            }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                  Select Business Type
                </Text>
                <TouchableOpacity onPress={() => setShowBusinessTypeModal(false)}>
                  <MaterialIcons name="close" size={24} color={isDarkMode ? theme.text : '#333'} />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={businessTypes}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.modalItem, { 
                      backgroundColor: item.type_name === businessType ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                      borderBottomColor: isDarkMode ? theme.border : '#f0f0f0'
                    }]}
                    onPress={() => {
                      setBusinessType(item.type_name);
                      setShowBusinessTypeModal(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, { 
                      color: isDarkMode ? theme.text : '#333',
                      fontWeight: item.type_name === businessType ? '600' : 'normal'
                    }]}>{item.type_name}</Text>
                    {item.type_name === businessType && (
                      <MaterialIcons name="check" size={20} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
        
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
    </TouchableWithoutFeedback>
  );
  
  const renderWasteDetailsForm = () => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
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
        <TouchableOpacity 
          style={[styles.pickerButton, { 
            backgroundColor: isDarkMode ? theme.inputBackground : '#f5f5f5',
            borderColor: isDarkMode ? theme.border : '#e0e0e0'
          }]}
          onPress={() => setShowFrequencyModal(true)}
        >
          <Text style={[styles.pickerButtonText, { 
            color: collectionFrequency ? (isDarkMode ? theme.text : '#333') : (isDarkMode ? theme.textSecondary : '#999')
          }]}>
            {collectionFrequency ? collectionFrequencyOptions.find(opt => opt.value === collectionFrequency)?.label : 'Select frequency'}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color={isDarkMode ? theme.text : '#666'} />
        </TouchableOpacity>
        
        {/* Collection Frequency Modal */}
        <Modal
          visible={showFrequencyModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowFrequencyModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { 
              backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
            }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                  Select Collection Frequency
                </Text>
                <TouchableOpacity onPress={() => setShowFrequencyModal(false)}>
                  <MaterialIcons name="close" size={24} color={isDarkMode ? theme.text : '#333'} />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={collectionFrequencyOptions.filter(opt => opt.value !== '')}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.modalItem, { 
                      backgroundColor: item.value === collectionFrequency ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                      borderBottomColor: isDarkMode ? theme.border : '#f0f0f0'
                    }]}
                    onPress={() => {
                      setCollectionFrequency(item.value);
                      setShowFrequencyModal(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, { 
                      color: isDarkMode ? theme.text : '#333',
                      fontWeight: item.value === collectionFrequency ? '600' : 'normal'
                    }]}>{item.label}</Text>
                    {item.value === collectionFrequency && (
                      <MaterialIcons name="check" size={20} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
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
    </TouchableWithoutFeedback>
  );
  
  // Scroll to input field when it gets focus
  const scrollViewRef = useRef(null);
  
  const handleFocus = (event) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToFocusedInput(event.target);
    }
  };
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? theme.background : '#f5f7fa' }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? theme.cardBackground : '#fff'}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={[styles.container, { backgroundColor: isDarkMode ? theme.background : '#f5f7fa' }]}>
          {/* Header */}
          <View style={[styles.header, { 
            backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
            borderBottomColor: isDarkMode ? '#444' : '#e0e0e0'
          }]}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={24} color={isDarkMode ? theme.text : "#333"} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, {
              color: isDarkMode ? theme.text : '#333'
            }]}>Create Business Profile</Text>
          </View>
          
          {/* Step Indicator */}
          <View style={[styles.stepIndicator, { backgroundColor: isDarkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.1)' }]}>
            <Text style={[styles.stepText, { color: isDarkMode ? theme.text : '#333' }]}>
              {step === 1 ? 'Step 1: Business Details' : 'Step 2: Waste Details'}
            </Text>
          </View>
          
          {/* Form Content */}
          {step === 1 ? renderBusinessDetailsForm() : renderWasteDetailsForm()}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff'
  },
  keyboardAvoidingView: {
    flex: 1
  },
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  stepIndicator: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 175, 80, 0.2)',
  },
  stepText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },

  formContainer: {
    flex: 1,
    padding: 20
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    color: '#333'
  },
  inputGroup: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 15,
    marginBottom: 8,
    color: '#666',
    fontWeight: '500'
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    marginBottom: 4
  },
  textArea: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1
  },
  pickerButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
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
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1
  },
  checkboxText: {
    marginLeft: 6,
    color: '#666',
    fontSize: 14
  },
  switchContainer: {
    marginBottom: 20
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    padding: 14,
    borderRadius: 10
  },
  switchLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500'
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 0
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 0,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8
  }
});

export default BusinessProfileCreationScreen;
