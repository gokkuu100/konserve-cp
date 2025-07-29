import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, SafeAreaView
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ContractNegotiationManager from '../supabase/manager/business/ContractNegotiationManager';
import BusinessProfileManager from '../supabase/manager/business/BusinessProfileManager';

// Import negotiation form components
import InitialOfferForm from './negotiation/InitialOfferForm';
import CounterOfferForm from './negotiation/CounterOfferForm';
import ClarificationForm from './negotiation/ClarificationForm';
import ContractReviewForm from './negotiation/ContractReviewForm';
import SignatureForm from './negotiation/SignatureForm';
import PaymentForm from './negotiation/PaymentForm';

const ContractNegotiationScreen = ({ route, navigation }) => {
  const { contractId, businessProfileId, agencyId, status } = route.params;
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [agency, setAgency] = useState(null);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(null);
  const [previousOffer, setPreviousOffer] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === 'new') {
      setLoading(false);
    } else {
      fetchContractDetails();
    }
  }, [contractId, status]);

  const fetchContractDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch contract details
      if (contractId) {
        const contractData = await ContractNegotiationManager.getContractById(contractId);
        setContract(contractData);
        
        // Fetch business profile
        const businessData = await BusinessProfileManager.getBusinessProfileById(
          contractData.business_profile_id || businessProfileId
        );
        setBusinessProfile(businessData);
        
        setAgency(contractData.agency);
        
        // Fetch negotiation steps
        const stepsData = await ContractNegotiationManager.getNegotiationSteps(contractId);
        setSteps(stepsData || []);
        
        // Get current active step
        const currentStepData = await ContractNegotiationManager.getCurrentNegotiationStep(contractId);
        setCurrentStep(currentStepData);
        
        // Get previous offer details for counter-offers
        if (stepsData && stepsData.length > 0) {
          const lastCompletedStep = stepsData
            .filter(step => step.status === 'completed')
            .sort((a, b) => b.step_number - a.step_number)[0];
            
          if (lastCompletedStep && lastCompletedStep.details) {
            setPreviousOffer({
              price: lastCompletedStep.details.price,
              serviceScope: lastCompletedStep.details.service_scope,
              timeline: lastCompletedStep.details.timeline,
              additionalTerms: lastCompletedStep.details.additional_terms
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching contract details:', err);
      setError('Failed to load contract details');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialOffer = async (offerData) => {
    try {
      setLoading(true);
      
      const contractData = {
        businessProfileId,
        agencyId,
        title: 'Waste Collection Service Agreement',
        description: 'Contract for waste collection services',
        price: offerData.price,
        serviceScope: offerData.serviceScope,
        timeline: offerData.timeline,
        additionalTerms: offerData.additionalTerms
      };
      
      const newContractId = await ContractNegotiationManager.createContractNegotiation(contractData);
      
      navigation.replace('ContractNegotiationScreen', {
        contractId: newContractId,
        businessProfileId,
        agencyId,
        status: 'negotiating'
      });
      
      // Show success message
      Alert.alert(
        'Offer Sent',
        'Your initial offer has been sent to the agency. You will be notified when they respond.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Error creating contract:', err);
      Alert.alert('Error', 'Failed to create contract. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNegotiationResponse = async (responseData) => {
    try {
      setLoading(true);
      
      const nextStepId = await ContractNegotiationManager.respondToNegotiationStep({
        contractId,
        stepId: currentStep.id,
        ...responseData
      });
      
      await fetchContractDetails();
      
      Alert.alert(
        'Response Sent',
        'Your response has been sent successfully.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Error responding to negotiation step:', err);
      Alert.alert('Error', 'Failed to send response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepProgress = () => {
    const stepTypes = ['initial_offer', 'counter_offer', 'clarification', 'contract_review', 'signature', 'payment'];
    const currentStepIndex = currentStep ? stepTypes.indexOf(currentStep.step_type) : 0;
    
    return (
      <View style={styles.stepProgressContainer}>
        {stepTypes.map((step, index) => (
          <View key={step} style={styles.stepProgressItem}>
            <View style={[
              styles.stepDot,
              index <= currentStepIndex ? styles.stepDotActive : styles.stepDotInactive
            ]}>
              {index < currentStepIndex && (
                <MaterialIcons name="check" size={16} color="#fff" />
              )}
            </View>
            {index < stepTypes.length - 1 && (
              <View style={[
                styles.stepLine,
                index < currentStepIndex ? styles.stepLineActive : styles.stepLineInactive
              ]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderNegotiationForm = () => {
    if (status === 'new') {
      return (
        <InitialOfferForm 
          onSubmit={handleInitialOffer}
          isAgency={false}
        />
      );
    }
    
    if (!currentStep) {
      return (
        <View style={styles.completedContainer}>
          <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
          <Text style={[styles.completedTitle, { color: isDarkMode ? theme.text : '#333' }]}>
            Contract Process Complete
          </Text>
          <Text style={[styles.completedDescription, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            {contract?.status === 'active' ? 
              'This contract is now active. You can view the details below.' :
              'The negotiation process has been completed.'}
          </Text>
          <TouchableOpacity
            style={styles.viewContractButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.viewContractButtonText}>Return to Profile</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    switch (currentStep.step_type) {
      case 'initial_offer':
        return (
          <InitialOfferForm 
            onSubmit={handleInitialOffer}
            isAgency={false}
          />
        );
      
      case 'counter_offer':
        return (
          <CounterOfferForm 
            onSubmit={handleNegotiationResponse}
            previousOffer={previousOffer}
          />
        );
      
      case 'clarification':
        if (previousOffer?.clarificationQuestions?.questions) {
          return (
            <ClarificationForm 
              onSubmit={handleNegotiationResponse}
              questions={previousOffer.clarificationQuestions.questions}
            />
          );
        } else {
          return (
            <CounterOfferForm 
              onSubmit={handleNegotiationResponse}
              previousOffer={previousOffer}
            />
          );
        }
      
      case 'contract_review':
        return (
          <ContractReviewForm 
            onSubmit={handleNegotiationResponse}
            contractData={contract}
            businessProfile={businessProfile}
            agency={agency}
          />
        );
      
      case 'signature':
        return (
          <SignatureForm 
            onSubmit={handleNegotiationResponse}
            contractData={contract}
          />
        );
      
      case 'payment':
        return (
          <PaymentForm 
            onSubmit={handleNegotiationResponse}
            contractData={contract}
          />
        );
      
      default:
        return (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color="#f44336" />
            <Text style={[styles.errorText, { color: isDarkMode ? theme.text : '#333' }]}>
              Unknown negotiation step
            </Text>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? theme.background : '#f5f7fa' }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={[styles.loadingText, { color: isDarkMode ? theme.text : '#333' }]}>
          {status === 'new' ? 'Preparing contract form...' : 'Loading contract details...'}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: isDarkMode ? theme.background : '#f5f7fa' }]}>
        <MaterialIcons name="error-outline" size={48} color="#f44336" />
        <Text style={[styles.errorText, { color: isDarkMode ? theme.text : '#333' }]}>
          {error}
        </Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? theme.background : '#f5f7fa' }]}>
      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
        borderBottomColor: isDarkMode ? '#444' : '#e0e0e0'
      }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? theme.text : "#333"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {
          color: isDarkMode ? theme.text : '#333'
        }]}>
          {status === 'new' ? 'New Contract' : 'Contract Negotiation'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {status !== 'new' && renderStepProgress()}

      {/* Negotiation Form */}
      {renderNegotiationForm()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  stepProgressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  stepProgressItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#4CAF50',
  },
  stepDotInactive: {
    backgroundColor: '#E0E0E0',
  },
  stepLine: {
    flex: 1,
    height: 2,
  },
  stepLineActive: {
    backgroundColor: '#4CAF50',
  },
  stepLineInactive: {
    backgroundColor: '#E0E0E0',
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  completedDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  viewContractButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  viewContractButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  }
});

export default ContractNegotiationScreen;
