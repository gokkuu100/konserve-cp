import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  SafeAreaView 
} from 'react-native';

const ServiceCard = ({ title, subtitle, buttonText, imageSource, onPress }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
          <TouchableOpacity style={styles.button} onPress={onPress}>
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.imageContainer}>
          <Image
            source={imageSource}
            style={styles.cardImage}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  };

const ServiceOption = ({ title, imageSource, onPress }) => {
  return (
    <TouchableOpacity style={styles.serviceOption} onPress={onPress}>
      <View style={styles.serviceImageContainer}>
        <Image 
          source={imageSource} 
          style={styles.serviceImage} 
          resizeMode="contain"
        />
      </View>
      <Text style={styles.serviceTitle}>{title}</Text>
    </TouchableOpacity>
  );
};

const Services = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Services</Text>

        {/* Section 1: Map Feature */}
        <Text style={styles.sectionTitle}>Find Recycling Centers</Text>
        <ServiceCard 
          title="Locate recycling centers near you"
          subtitle="Find pinpoints to various recycling centres around Nairobi"
          buttonText="Open Map"
          imageSource={require('../assets/map.png')}
        />
        <View style={styles.divider} />

        {/* Section 2: Collection Agencies & Messages */}
        <Text style={styles.sectionTitle}>Manage Waste Collection</Text>
        <View style={styles.serviceOptionsContainer}>
          <ServiceOption 
            title="Collection Agencies"
            imageSource={require('../assets/location.png')}
            onPress={() => navigation.navigate('CollectionAgencies')}
          />
          <ServiceOption 
            title="Messages"
            imageSource={require('../assets/email.png')}
            onPress={() => navigation.navigate('Messages')}
          />
        </View>
        <View style={styles.divider} />

        {/* Section 3: Calendar/Schedule Feature */}
        <Text style={styles.sectionTitle}>Schedule Collection</Text>
        <ServiceCard 
          title="Plan your waste collection"
          subtitle="Select convenient collection days from calendar"
          buttonText="Open Schedule"
          onPress={() => navigation.navigate('Calendar')}
          imageSource={require('../assets/calendar.png')}
        />
        <View style={styles.divider} />

        {/* Section 4: Feedback & Reports */}
        <Text style={styles.sectionTitle}>Service Feedback</Text>
        <View style={styles.serviceOptionsContainer}>
          <ServiceOption 
            title="Submit Feedback"
            imageSource={require('../assets/feedback.png')}
            onPress={() => navigation.navigate('Feedback')}
          />
          <ServiceOption 
            title="Service Reports"
            imageSource={require('../assets/report.png')}
            onPress={() => navigation.navigate('Calendar')}
          />
        </View>
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12, // Reduced horizontal padding
  },
  header: {
    fontSize: 28, // Slightly smaller
    fontWeight: 'bold',
    marginTop: 15, // Reduced top margin
    marginBottom: 10, // Reduced bottom margin
    paddingHorizontal: 4, // Added horizontal padding
  },
  sectionTitle: {
    fontSize: 20, // Smaller font size
    fontWeight: '600',
    marginTop: 16, // Reduced top margin
    marginBottom: 8, // Reduced bottom margin
    paddingHorizontal: 4, // Added horizontal padding
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12, // Slightly smaller border radius
    padding: 16, // Reduced padding
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0, // Removed bottom margin (divider will create space)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced shadow
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1, // Reduced elevation
  },
  cardContent: {
    flex: 1,
    marginRight: 12, // Reduced margin
  },
  cardTitle: {
    fontSize: 18, // Smaller font size
    fontWeight: 'bold',
    marginBottom: 6, // Reduced margin
  },
  cardSubtitle: {
    fontSize: 13, // Smaller font size
    color: '#666',
    marginBottom: 12, // Reduced margin
  },
  button: {
    backgroundColor: '#f0f0f0', // Lighter color
    paddingVertical: 8, // Reduced padding
    paddingHorizontal: 14, // Reduced padding
    borderRadius: 20, // Slightly smaller radius
    alignSelf: 'flex-start',
    marginTop: 4, // Reduced margin
  },
  buttonText: {
    fontSize: 13, // Smaller font size
    fontWeight: '600',
  },
  imageContainer: {
    width: 80, // Smaller size
    height: 80, // Smaller size
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10, // Slightly smaller radius
  },
  cardImage: {
    width: 60, // Smaller size
    height: 60, // Smaller size
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16, // Space above and below divider
    marginHorizontal: 4, // Small horizontal margin
  },
  serviceOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0, // Removed bottom margin (divider will create space)
  },
  serviceOption: {
    backgroundColor: '#ffffff', // Changed to white background for more contrast
    borderRadius: 12, // Slightly smaller radius
    width: '48.5%', // Slightly wider to reduce gap
    padding: 14, // Reduced padding
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1, // Added slight elevation for "clickable" appearance
  },
  serviceImageContainer: {
    width: 50, // Smaller size
    height: 50, // Smaller size
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6, // Reduced margin
  },
  serviceImage: {
    width: 40, // Smaller size
    height: 40, // Smaller size
  },
  serviceTitle: {
    fontSize: 14, // Smaller font size
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 20, // Space at bottom of ScrollView
  }
});

export default Services;