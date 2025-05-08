import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  SafeAreaView,
  Alert
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const LocationSelectionModal = ({ 
  visible, 
  onClose, 
  onSelectCounty, 
  onSelectConstituency, 
  selectedCounty,
  selectedConstituency,
  isCountySelectable = true,
  title = "Select Location"
}) => {
  // Nairobi is the only county option for now
  const counties = ["Nairobi"];
  
  // Nairobi constituencies
  const constituencies = [
    "Westlands",
    "Dagoretti North",
    "Dagoretti South",
    "Langata",
    "Kibra",
    "Roysambu",
    "Kasarani",
    "Ruaraka",
    "Embakasi South",
    "Embakasi North",
    "Embakasi Central",
    "Embakasi East",
    "Embakasi West",
    "Makadara",
    "Kamukunji",
    "Starehe",
    "Mathare"
  ];

  const [activeTab, setActiveTab] = useState('county');
  
  // Reset to county tab when modal is opened
  useEffect(() => {
    if (visible) {
      setActiveTab('county');
    }
  }, [visible]);

  const handleCountySelect = (county) => {
    if (isCountySelectable) {
      onSelectCounty(county);
    }
    // Move to constituency selection after county is selected
    setActiveTab('constituency');
  };

  const handleConstituencySelect = (constituency) => {
    onSelectConstituency(constituency);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'county' && styles.activeTab]}
              onPress={() => setActiveTab('county')}
            >
              <Text style={[styles.tabText, activeTab === 'county' && styles.activeTabText]}>County</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'constituency' && styles.activeTab]}
              onPress={() => setActiveTab('constituency')}
            >
              <Text style={[styles.tabText, activeTab === 'constituency' && styles.activeTabText]}>Constituency</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.optionsContainer}>
            {activeTab === 'county' && (
              counties.map((county) => (
                <TouchableOpacity
                  key={county}
                  style={[
                    styles.optionItem,
                    selectedCounty === county && styles.selectedOption,
                    !isCountySelectable && styles.disabledOption
                  ]}
                  onPress={() => handleCountySelect(county)}
                  disabled={!isCountySelectable}
                >
                  <Text style={[
                    styles.optionText,
                    selectedCounty === county && styles.selectedOptionText,
                    !isCountySelectable && styles.disabledOptionText
                  ]}>
                    {county}
                  </Text>
                  {selectedCounty === county && (
                    <MaterialIcons name="check" size={20} color="#357002" />
                  )}
                  {!isCountySelectable && (
                    <MaterialIcons name="lock" size={18} color="#999" />
                  )}
                </TouchableOpacity>
              ))
            )}
            
            {activeTab === 'constituency' && (
              constituencies.map((constituency) => (
                <TouchableOpacity
                  key={constituency}
                  style={[
                    styles.optionItem,
                    selectedConstituency === constituency && styles.selectedOption
                  ]}
                  onPress={() => handleConstituencySelect(constituency)}
                >
                  <Text style={[
                    styles.optionText,
                    selectedConstituency === constituency && styles.selectedOptionText
                  ]}>
                    {constituency}
                  </Text>
                  {selectedConstituency === constituency && (
                    <MaterialIcons name="check" size={20} color="#357002" />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#357002',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#357002',
    fontWeight: '500',
  },
  optionsContainer: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedOption: {
    backgroundColor: '#f0fff0',
  },
  disabledOption: {
    backgroundColor: '#f5f5f5',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#357002',
    fontWeight: '500',
  },
  disabledOptionText: {
    color: '#999',
  }
});

export default LocationSelectionModal;
