import { FontAwesome, Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import AgencyMessageManager from '../supabase/manager/messaging/AgencyMessageManager';

const AgencyMessageDetailScreen = ({ route, navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { message } = route.params;

  // Mark the message as read when opened
  useEffect(() => {
    if (message.message_source === 'direct' && !message.is_read) {
      markMessageAsRead();
    }
  }, []);

  const markMessageAsRead = async () => {
    try {
      await AgencyMessageManager.markMessageAsRead(message.id);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleShare = async () => {
    try {
      const shareMessage = `
${message.subject}

${message.message}

From: ${message.agency_name}
`;
      await Share.share({
        message: shareMessage,
        title: message.subject,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share this message.');
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return date.toLocaleDateString(undefined, options);
  };

  // Message type style and icon
  const getMessageTypeInfo = () => {
    switch (message.message_type) {
      case 'announcement':
        return {
          color: '#4CAF50',
          bgColor: '#E8F5E9',
          icon: 'bullhorn',
          label: 'Announcement'
        };
      case 'alert':
        return {
          color: '#F44336',
          bgColor: '#FFEBEE',
          icon: 'warning',
          label: 'Alert'
        };
      case 'event':
        return {
          color: '#2196F3',
          bgColor: '#E3F2FD',
          icon: 'calendar',
          label: 'Event'
        };
      default:
        return {
          color: '#757575',
          bgColor: '#F5F5F5',
          icon: 'envelope',
          label: 'General'
        };
    }
  };

  const messageTypeInfo = getMessageTypeInfo();

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={isDarkMode ? "#FFFFFF" : "#333333"} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textDark]} numberOfLines={1}>
          {message.subject}
        </Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={[styles.agencyInfoContainer, isDarkMode && styles.cardDark]}>
          {message.agency_logo ? (
            <Image 
              source={{ uri: message.agency_logo }} 
              style={styles.agencyLogo} 
            />
          ) : (
            <View style={styles.agencyLogoPlaceholder}>
              <Text style={styles.agencyLogoInitial}>
                {message.agency_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          
          <View style={styles.agencyInfo}>
            <Text style={[styles.agencyName, isDarkMode && styles.textDark]}>
              {message.agency_name}
            </Text>
            <Text style={[styles.messageDate, isDarkMode && styles.textSecondaryDark]}>
              {formatDateTime(message.created_at)}
            </Text>
          </View>
        </View>
        
        <View style={[styles.messageCard, isDarkMode && styles.cardDark]}>
          <View style={[styles.messageBadgeContainer]}>
            <View style={[
              styles.messageTypeBadge, 
              {backgroundColor: messageTypeInfo.bgColor}
            ]}>
              <FontAwesome name={messageTypeInfo.icon} size={12} color={messageTypeInfo.color} />
              <Text style={[styles.messageTypeText, {color: messageTypeInfo.color}]}>
                {messageTypeInfo.label}
              </Text>
            </View>
            
            <View style={[
              styles.messageSourceBadge,
              message.message_source === 'direct' ? styles.directBadge : styles.broadcastBadge
            ]}>
              <FontAwesome 
                name={message.message_source === 'direct' ? 'user' : 'bullhorn'} 
                size={12} 
                color={message.message_source === 'direct' ? '#1976D2' : '#4CAF50'} 
              />
              <Text style={[
                styles.messageSourceText,
                {color: message.message_source === 'direct' ? '#1976D2' : '#4CAF50'}
              ]}>
                {message.message_source === 'direct' ? 'Direct' : 'Broadcast'}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.messageSubject, isDarkMode && styles.textDark]}>
            {message.subject}
          </Text>
          
          <Text style={[styles.messageContent, isDarkMode && styles.textDark]}>
            {message.message}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerDark: {
    backgroundColor: '#1E1E1E',
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  agencyInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  agencyLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  agencyLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agencyLogoInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  agencyInfo: {
    flex: 1,
  },
  agencyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  messageDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  messageBadgeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  messageTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  messageTypeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  messageSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  directBadge: {
    backgroundColor: '#E8F0FE',
  },
  broadcastBadge: {
    backgroundColor: '#E8F5E9',
  },
  messageSourceText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  messageSubject: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  messageContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  actionText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#4B5563',
  },
  cardDark: {
    backgroundColor: '#2A2A2A',
  },
  textDark: {
    color: '#FFFFFF',
  },
  textSecondaryDark: {
    color: '#BDBDBD',
  },
});

export default AgencyMessageDetailScreen; 