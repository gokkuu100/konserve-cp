import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import ProfileManager from '../supabase/manager/auth/ProfileManager';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Google Cloud Vision API key - you should store this in your .env file
const GOOGLE_CLOUD_VISION_API_KEY = Constants.expoConfig.extra.GOOGLE_CLOUD_VISION_API_KEY;
const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

// Waste categories and recycling information
const wasteCategories = {
  plastic: {
    title: 'Plastic',
    description: 'Plastic waste takes hundreds of years to decompose and can harm wildlife and ecosystems.',
    recyclable: true,
    recyclingMethods: [
      'Clean and rinse plastic containers before recycling',
      'Check the recycling symbol (1-7) to ensure it\'s accepted in your area',
      'Remove caps and lids and recycle separately',
      'Consider reusing plastic containers for storage',
      'Avoid single-use plastics when possible'
    ],
    icon: 'bottle-soda-outline',
    color: '#2196F3',
    gradientColors: ['#2196F3', '#03A9F4']
  },
  paper: {
    title: 'Paper',
    description: 'Paper is one of the most recyclable materials and can be reprocessed multiple times.',
    recyclable: true,
    recyclingMethods: [
      'Keep paper dry and clean for recycling',
      'Flatten cardboard boxes to save space',
      'Remove plastic windows from envelopes',
      'Shredded paper should be placed in a paper bag for recycling',
      'Consider composting certain paper products'
    ],
    icon: 'newspaper',
    color: '#795548',
    gradientColors: ['#8D6E63', '#A1887F']
  },
  glass: {
    title: 'Glass',
    description: 'Glass is 100% recyclable and can be recycled endlessly without loss in quality or purity.',
    recyclable: true,
    recyclingMethods: [
      'Rinse glass containers before recycling',
      'Remove metal or plastic lids and recycle separately',
      'Sort by color if required by your local recycling program',
      'Broken glass should be wrapped and disposed of in regular trash',
      'Consider reusing glass jars for storage'
    ],
    icon: 'bottle-wine-outline',
    color: '#00BCD4',
    gradientColors: ['#00BCD4', '#26C6DA']
  },
  metal: {
    title: 'Metal',
    description: 'Metals like aluminum and steel can be recycled indefinitely without degrading their properties.',
    recyclable: true,
    recyclingMethods: [
      'Rinse food residue from cans',
      'Crush aluminum cans to save space',
      'Remove paper labels if possible',
      'Small metal items can be collected in a larger metal container',
      'Keep metal separate from other recyclables if required'
    ],
    icon: 'can-outline',
    color: '#9E9E9E',
    gradientColors: ['#9E9E9E', '#BDBDBD']
  },
  electronic: {
    title: 'Electronic Waste',
    description: 'E-waste contains valuable materials as well as toxic components that require special handling.',
    recyclable: true,
    recyclingMethods: [
      'Never dispose of electronics in regular trash',
      'Take to designated e-waste collection centers',
      'Many retailers offer take-back programs',
      'Remove batteries before recycling if possible',
      'Consider donating working electronics'
    ],
    icon: 'cellphone',
    color: '#FF9800',
    gradientColors: ['#FF9800', '#FFB74D']
  },
  organic: {
    title: 'Organic Waste',
    description: 'Organic waste can be composted to create nutrient-rich soil for gardens and agriculture.',
    recyclable: true,
    recyclingMethods: [
      'Compost fruit and vegetable scraps',
      'Add yard waste to compost bins',
      'Avoid composting meat, dairy, and oils',
      'Consider worm composting for apartment living',
      'Use compost in gardens to reduce need for chemical fertilizers'
    ],
    icon: 'food-apple',
    color: '#4CAF50',
    gradientColors: ['#4CAF50', '#66BB6A']
  },
  hazardous: {
    title: 'Hazardous Waste',
    description: 'Hazardous waste requires special handling to prevent harm to people and the environment.',
    recyclable: false,
    recyclingMethods: [
      'Never dispose of in regular trash or pour down drains',
      'Take to designated hazardous waste collection facilities',
      'Store in original containers with labels intact',
      'Keep separate from other waste materials',
      'Check with local authorities for disposal guidelines'
    ],
    icon: 'alert-outline',
    color: '#F44336',
    gradientColors: ['#F44336', '#EF5350']
  },
  unknown: {
    title: 'Unidentified Waste',
    description: 'We couldn\'t identify this waste with certainty. Please check with local recycling guidelines.',
    recyclable: 'unknown',
    recyclingMethods: [
      'Check with your local recycling center',
      'Look for recycling symbols or codes on the item',
      'When in doubt, throw it out to avoid contaminating recyclables',
      'Consider reusing the item if possible',
      'Research proper disposal methods for your specific item'
    ],
    icon: 'help-circle-outline',
    color: '#7b68ee',
    gradientColors: ['#7b68ee', '#9370DB']
  }
};

// Add recycling tips for each waste category
const recyclingTips = {
  plastic: [
    "Rinse containers before recycling to remove food residue",
    "Remove caps and lids as they may be made from different types of plastic",
    "Check for recycling symbols (1-7) to identify the type of plastic",
    "Plastic bags often require special recycling - return to grocery stores",
    "Avoid black plastic as it's difficult to recycle due to sorting technology limitations"
  ],
  paper: [
    "Keep paper dry and clean for effective recycling",
    "Remove plastic windows from envelopes before recycling",
    "Shredded paper should be contained in a paper bag for recycling",
    "Cardboard should be flattened to save space",
    "Remove tape and staples when possible for better processing"
  ],
  glass: [
    "Rinse glass containers thoroughly before recycling",
    "Remove lids and caps as they're often made from different materials",
    "Sort glass by color if required by your local recycling program",
    "Broken glass should be wrapped and disposed of in regular trash for safety",
    "Window glass and drinking glasses are different from container glass and often not recyclable"
  ],
  metal: [
    "Rinse food cans to remove residue before recycling",
    "Small metal items can be collected in a larger metal container",
    "Aluminum foil should be clean and balled up for recycling",
    "Check if your community accepts aerosol cans for recycling",
    "Scrap metal may need to be taken to specialized recycling centers"
  ],
  electronic: [
    "Never dispose of electronics in regular trash due to hazardous materials",
    "Remove batteries before recycling electronic devices",
    "Look for e-waste collection events in your community",
    "Many retailers offer take-back programs for old electronics",
    "Consider donating working electronics for reuse before recycling"
  ],
  organic: [
    "Compost fruit and vegetable scraps, coffee grounds, and eggshells",
    "Avoid composting meat, dairy, and oily foods in home compost systems",
    "Use a kitchen compost bin for convenient collection",
    "Layer green (food waste) and brown (leaves, paper) materials in compost",
    "Check if your community offers curbside compost collection"
  ],
  hazardous: [
    "Never pour chemicals down drains or place in regular trash",
    "Store in original containers with labels intact",
    "Take to designated hazardous waste collection facilities",
    "Many communities have special collection days for hazardous materials",
    "Some retailers accept specific items like batteries or paint for proper disposal"
  ],
  unknown: [
    "Contact your local waste management authority for guidance",
    "Search online waste databases for specific disposal instructions",
    "Consider if the item can be reused or repurposed instead",
    "When in doubt, keep it out of recycling to avoid contamination",
    "Take a photo and use waste identification apps for help"
  ]
};

// Add the recycling tips to each waste category
Object.keys(wasteCategories).forEach(key => {
  wasteCategories[key].recyclingTips = recyclingTips[key] || recyclingTips.unknown;
});

const wasteExamples = {
  plastic: [
    { imageUrl: "https://images.unsplash.com/photo-1572964734607-0051976fac79?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cGxhc3RpYyUyMGJvdHRsZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGxhc3RpYyUyMGNvbnRhaW5lcnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1589030343991-69ea1433b941?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8cGxhc3RpYyUyMGJhZ3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" }
  ],
  paper: [
    { imageUrl: "https://images.unsplash.com/photo-1603484477859-abe6a73f9366?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y2FyZGJvYXJkfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1595231776515-ddffb1f4eb73?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fG5ld3NwYXBlcnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1598620617148-c9e8ddee6711?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bWFnYXppbmVzfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" }
  ],
  glass: [
    { imageUrl: "https://images.unsplash.com/photo-1550411294-56f7d0c7fbe6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Z2xhc3MlMjBib3R0bGVzfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1563201180-1c57435ae249?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Z2xhc3MlMjBqYXJ8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Z2xhc3N3YXJlfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" }
  ],
  metal: [
    { imageUrl: "https://images.unsplash.com/photo-1610478920392-95888fc8a407?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YWx1bWludW0lMjBjYW5zfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1531522060268-8c17d1298ce8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8bWV0YWwlMjBzY3JhcHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c3RlZWwlMjBjb250YWluZXJ8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60" }
  ],
  electronic: [
    { imageUrl: "https://images.unsplash.com/photo-1526406915894-7bcd65f60845?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZWxlY3Ryb25pYyUyMHdhc3RlfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1601791074012-d4e0ee30d77a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8b2xkJTIwcGhvbmVzfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1602800458591-eddda28a498b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y29tcHV0ZXIlMjBwYXJ0c3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" }
  ],
  organic: [
    { imageUrl: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8Zm9vZCUyMHdhc3RlfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y29tcG9zdHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Z2FyZGVuJTIwd2FzdGV8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60" }
  ],
  hazardous: [
    { imageUrl: "https://images.unsplash.com/photo-1605256585681-455837661b76?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y2hlbWljYWxzfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1530533718754-001d2668365a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGFpbnQlMjBjYW5zfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1583225214464-9296029427aa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmF0dGVyaWVzfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" }
  ],
  unknown: [
    { imageUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8dW5rbm93biUyMHdhc3RlfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1604187351574-c75ca79f5807?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8bWl4ZWQlMjB3YXN0ZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" },
    { imageUrl: "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGxhc3RpYyUyMGNvbnRhaW5lcnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60" }
  ]
};

Object.keys(wasteCategories).forEach(key => {
  wasteCategories[key].examples = wasteExamples[key] || wasteExamples.unknown;
});

// AI facts about waste identification and recycling
const aiFacts = [
  {
    id: 1,
    title: "AI can identify 5,000+ types of waste materials",
    description: "Modern AI models can recognize thousands of different waste items with over 95% accuracy to improve recycling rates.",
    additionalInfo: "These advanced AI systems use deep learning algorithms trained on millions of images to identify materials like plastics, metals, glass, and organic waste. The technology continues to improve, with some systems now able to distinguish between different types of plastics (PET, HDPE, PVC) and even detect contamination in recycling streams."
  },
  {
    id: 2,
    title: "AI reduces contamination in recycling streams",
    description: "Smart waste sorting powered by AI can reduce contamination in recycling by up to 90%, making recycling more efficient.",
    additionalInfo: "Contamination is one of the biggest challenges in recycling. When non-recyclable items end up in recycling bins, they can damage equipment, reduce the quality of recycled materials, and even cause entire batches to be sent to landfills. AI-powered sorting systems can identify and remove contaminants at processing facilities, while mobile apps can help consumers make better recycling decisions at home."
  },
  {
    id: 3,
    title: "AI helps track global waste patterns",
    description: "AI systems analyze waste data across regions to identify trends and optimize waste management strategies worldwide.",
    additionalInfo: "By analyzing data from waste collection points, landfills, and recycling centers, AI can identify patterns in waste generation and disposal. This information helps cities and countries develop more effective waste management policies, predict future waste volumes, and measure the impact of recycling initiatives. Some systems can even track the movement of waste across borders to combat illegal dumping."
  }
];

const WasteIdentificationScreen = ({ navigation }) => {
  // Get auth context values including loading state
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  // State variables
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [wasteInfo, setWasteInfo] = useState(null);
  const [detectedItems, setDetectedItems] = useState([]);
  const [error, setError] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [userName, setUserName] = useState('Earth Hero');

  // Check authentication on mount and when auth state changes
  useEffect(() => {
    console.log('Authentication state in WasteIdentificationScreen:', 
      authLoading ? 'Loading auth state...' : 
      isAuthenticated ? 'Authenticated' : 'Not authenticated');
    
    // Only redirect if auth is not loading and user is not authenticated
    if (!authLoading && !isAuthenticated) {
      console.log('User not authenticated, redirecting to Login');
      navigation.replace('Login');
      return;
    }
    
    // If authenticated and not loading, get user name and request permissions
    if (isAuthenticated && !authLoading) {
      getUserName();
      requestPermissions();
    }
  }, [isAuthenticated, authLoading]);

  // Request camera permissions
  const requestPermissions = async () => {
    try {
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (mediaStatus !== 'granted' || cameraStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and media library permissions are required to use this feature.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const getUserName = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        console.error('No user logged in');
        setLoading(false);
        return;
      }
      
      console.log('Fetching user profile for:', user.id);
      
      // Use ProfileManager to get user profile
      const { data: profile, error } = await ProfileManager.getUserProfile(user.id);
      
      if (error) {
        console.error('Error fetching user name:', error);
        setLoading(false);
        return;
      }
      
      if (profile) {
        console.log('User profile fetched successfully:', profile.full_name);
        setUserName(profile.full_name || 'Earth Hero');
      } else {
        console.log('No profile data returned');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user name:', error);
      setLoading(false);
    }
  };

  // Animation references
  const scanAnimation = useRef(new Animated.Value(0)).current;
  const resultAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef(null);
  const cardScaleAnim = useRef(new Animated.Value(0.95)).current;

  // Progress animation
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  // Start rotation animation for loading icon
  useEffect(() => {
    if (analyzing) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [analyzing, rotateAnim]);

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        setWasteInfo(null);
        setDetectedItems([]);
        setError(null);
        setScanComplete(false);
        
        // Automatically analyze the image once selected
        analyzeImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery.');
    }
  };

  // Take photo with camera
  const takePicture = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        setWasteInfo(null);
        setDetectedItems([]);
        setError(null);
        setScanComplete(false);
        
        // Automatically analyze the image once taken
        analyzeImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture.');
    }
  };

  // Analyze image with Google Cloud Vision API - Modified to accept an image parameter
  const analyzeImage = async (imageUri = null) => {
    if (!imageUri && !image) {
      Alert.alert('No Image', 'Please take or select an image first.');
      return;
    }

    const imageToAnalyze = imageUri || image;

    try {
      setAnalyzing(true);
      setLoading(true);
      setError(null);
      setWasteInfo(null);
      setDetectedItems([]);
      setScanComplete(false);

      // Resize and compress image for faster upload
      const manipResult = await ImageManipulator.manipulateAsync(
        imageToAnalyze,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Convert image to base64
      const base64Image = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // For testing purposes, let's simulate a successful response
      // This will bypass the actual API call which requires a valid API key
      console.log('Image size (base64):', base64Image.length);
      
      // Check if we have a valid API key
      if (GOOGLE_CLOUD_VISION_API_KEY === Constants.expoConfig.extra.SUPABASE_URL || !GOOGLE_CLOUD_VISION_API_KEY) {
        console.log('Using mock response - no valid API key found');
        // Simulate a response with mock data
        const mockDetections = ['plastic', 'bottle', 'container', 'water', 'recyclable', 'PET'];
        setDetectedItems(mockDetections);
        
        // Determine waste type
        const wasteType = determineWasteType(mockDetections);
        setWasteInfo(wasteType);
        
        // Simulate a delay for better UX
        setTimeout(() => {
          setAnalyzing(false);
          setLoading(false);
          setScanComplete(true);
        }, 3000);
        return;
      }

      // Prepare request to Google Cloud Vision API
      const visionRequest = {
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 5 },
            ],
          },
        ],
      };

      console.log('Sending request to Vision API...');
      
      // Send request to Google Cloud Vision API
      const response = await axios.post(
        `${VISION_API_URL}?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
        visionRequest
      );

      console.log('Response received:', JSON.stringify(response.data));

      // Process the response
      const labels = response.data.responses[0].labelAnnotations || [];
      const objects = response.data.responses[0].localizedObjectAnnotations || [];
      
      // Combine and analyze results
      const allDetections = [
        ...labels.map(label => label.description.toLowerCase()),
        ...objects.map(obj => obj.name.toLowerCase())
      ];
      
      console.log('Detected items:', allDetections);
      setDetectedItems(allDetections);
      
      // Determine waste category
      const wasteType = determineWasteType(allDetections);
      setWasteInfo(wasteType);
      
      // Simulate a delay for better UX
      setTimeout(() => {
        setAnalyzing(false);
        setLoading(false);
        setScanComplete(true);
      }, 1500);
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        
        // Show more specific error message
        if (error.response.status === 400) {
          setError('API Error: Bad request. Check API key and request format.');
        } else if (error.response.status === 403) {
          setError('API Error: Access denied. Check API key permissions.');
        } else {
          setError(`API Error: ${error.response.status}. ${error.response.data?.error?.message || ''}`);
        }
      } else if (error.request) {
        console.error('Error request:', error.request);
        setError('Network error. No response received from the server.');
      } else {
        console.error('Error message:', error.message);
        setError(`Error: ${error.message}`);
      }
      
      // Fallback to mock data for demo purposes
      console.log('Using mock response due to error');
      const mockDetections = ['plastic', 'bottle', 'container', 'water', 'recyclable', 'PET'];
      setDetectedItems(mockDetections);
      const wasteType = determineWasteType(mockDetections);
      setWasteInfo(wasteType);
      
      setAnalyzing(false);
      setLoading(false);
      setScanComplete(true);
    }
  };

  // Determine waste type based on detected labels
  const determineWasteType = (detections) => {
    // Keywords for different waste categories
    const keywords = {
      plastic: ['plastic', 'bottle', 'container', 'packaging', 'bag', 'wrapper', 'styrofoam', 'polymer', 'pet', 'hdpe', 'pvc', 'ldpe', 'pp', 'ps'],
      paper: ['paper', 'cardboard', 'newspaper', 'magazine', 'book', 'mail', 'carton', 'box', 'tissue', 'napkin'],
      glass: ['glass', 'bottle', 'jar', 'window', 'mirror', 'glassware', 'cup', 'vase'],
      metal: ['metal', 'aluminum', 'can', 'tin', 'steel', 'foil', 'copper', 'iron', 'zinc', 'brass'],
      electronic: ['electronic', 'device', 'computer', 'phone', 'battery', 'charger', 'cable', 'appliance', 'gadget', 'circuit'],
      organic: ['food', 'fruit', 'vegetable', 'plant', 'leaf', 'grass', 'wood', 'compost', 'organic', 'bio', 'garden'],
      hazardous: ['chemical', 'paint', 'oil', 'battery', 'medication', 'pesticide', 'cleaner', 'toxic', 'poison', 'bleach']
    };
    
    // Count matches for each category
    const matches = {};
    Object.keys(keywords).forEach(category => {
      matches[category] = 0;
      keywords[category].forEach(keyword => {
        detections.forEach(detection => {
          if (detection.includes(keyword)) {
            matches[category]++;
          }
        });
      });
    });
    
    // Find category with most matches
    let bestMatch = 'unknown';
    let highestCount = 0;
    
    Object.keys(matches).forEach(category => {
      if (matches[category] > highestCount) {
        highestCount = matches[category];
        bestMatch = category;
      }
    });
    
    // If confidence is too low, return unknown
    return highestCount > 0 ? bestMatch : 'unknown';
  };

  // Reset the analysis
  const resetAnalysis = () => {
    setImage(null);
    setWasteInfo(null);
    setDetectedItems([]);
    setError(null);
    setAnalyzing(false);
    setScanComplete(false);
  };

  // State for expanded fact
  const [expandedFactId, setExpandedFactId] = useState(null);

  // Toggle fact expansion
  const toggleFactExpansion = (factId) => {
    if (expandedFactId === factId) {
      setExpandedFactId(null);
    } else {
      setExpandedFactId(factId);
    }
  };

  // Toggle recycling tips visibility
  const toggleTips = () => {
    setShowTips(!showTips);
  };

  // Calculate rotation for loading icon
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting Section */}
          <View style={styles.greetingSection}>
            <Text style={styles.greetingText}>
              Hi {userName},
            </Text>
            <Text style={styles.promptText}>
              Let's see what can I do for you?
            </Text>
          </View>

          {/* Main Actions Section */}
          <View style={styles.actionsContainer}>
            {/* Voice Helper Card */}
            <View style={styles.voiceHelperCard}>
              <LinearGradient
                colors={['#7ec83e', '#4A8FEB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientCard}
              >
                <View style={styles.voiceCardContent}>
                  <View style={styles.voiceIconContainer}>
                    <MaterialIcons name="camera" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.voiceCardTitle}>
                    Let's identify waste using camera
                  </Text>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={takePicture}
                  >
                    <Text style={styles.actionButtonText}>Open Camera</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            {/* Action Cards Grid */}
            <View style={styles.actionCardsGrid}>
              {/* Gallery Card */}
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={pickImage}
              >
                <View style={styles.actionCardIcon}>
                  <MaterialIcons name="photo-library" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.actionCardTitle}>Pick Image from Gallery</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" style={styles.arrowIcon} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Selected Image Preview */}
          {image && (
            <View style={styles.selectedImageContainer}>
              <Text style={styles.sectionTitle}>Selected Image</Text>
              <View style={styles.imagePreview}>
                <Image source={{ uri: image }} style={styles.previewImage} />
                {analyzing && (
                  <View style={styles.analyzingOverlay}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.analyzingText}>Analyzing...</Text>
                  </View>
                )}
              </View>
              
              {/* Detected Items List - Moved below image */}
              {detectedItems.length > 0 && !analyzing && (
                <View style={styles.detectedItemsContainer}>
                  <Text style={styles.detectedItemsTitle}>Detected Items:</Text>
                  <View style={styles.tagsContainer}>
                    {detectedItems.map((item, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Results Section - Updated to match the new UI */}
          {wasteInfo && (
            <View style={styles.resultsSection}>
              <View style={styles.resultCard}>
                <View style={styles.resultCardHeader}>
                  <View style={styles.userAvatarContainer}>
                    <View style={styles.userAvatar}>
                      <MaterialIcons name="auto-awesome" size={24} color="#FFFFFF" />
                    </View>
                  </View>
                  <View style={styles.resultQueryContainer}>
                    <Text style={styles.resultQueryText}>
                      What is {wasteInfo} waste and how should I recycle it?
                    </Text>
                    <View style={styles.resultStatsRow}>
                      <View style={styles.resultStat}>
                        <MaterialIcons name="content-copy" size={14} color="#AAAAAA" />
                        <Text style={styles.resultStatText}>Copy</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.resultContent}>
                  <Text style={styles.resultDefinition}>
                    {wasteCategories[wasteInfo].title} waste refers to {wasteCategories[wasteInfo].description}
                  </Text>
                  
                  <View style={styles.resultImageGrid}>
                    {wasteCategories[wasteInfo].examples && wasteCategories[wasteInfo].examples.map((example, index) => (
                      <Image 
                        key={index}
                        source={{ uri: example.imageUrl }} 
                        style={styles.resultExampleImage}
                      />
                    ))}
                  </View>
                  
                  {/* Recycling Information Section */}
                  <View style={styles.recyclingInfoSection}>
                    <Text style={styles.recyclingInfoTitle}>How to Recycle {wasteCategories[wasteInfo].title} Waste:</Text>
                    {wasteCategories[wasteInfo].recyclingTips && wasteCategories[wasteInfo].recyclingTips.map((tip, index) => (
                      <View key={index} style={styles.recyclingTipItem}>
                        <MaterialIcons name="check-circle" size={16} color="#4A54EB" style={styles.tipIcon} />
                        <Text style={styles.recyclingTipText}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                  
                  <View style={styles.resultFooter}>
                    <TouchableOpacity style={styles.resultFooterButton}>
                      <MaterialIcons name="content-copy" size={18} color="#AAAAAA" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* AI Facts Section - Made expandable */}
          <View style={styles.factsSection}>
            <Text style={styles.sectionTitle}>AI Waste Facts</Text>
            {aiFacts.map((fact) => (
              <View key={fact.id}>
                <TouchableOpacity 
                  style={styles.factCard}
                  onPress={() => toggleFactExpansion(fact.id)}
                >
                  <View style={styles.factIconContainer}>
                    <MaterialIcons name="lightbulb" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.factContent}>
                    <Text style={styles.factTitle}>{fact.title}</Text>
                    <Text 
                      style={styles.factDescription}
                      numberOfLines={expandedFactId === fact.id ? undefined : 1}
                    >
                      {fact.description}
                    </Text>
                  </View>
                  <MaterialIcons 
                    name={expandedFactId === fact.id ? "expand-less" : "expand-more"} 
                    size={20} 
                    color="#FFFFFF" 
                    style={styles.arrowIcon} 
                  />
                </TouchableOpacity>
                
                {expandedFactId === fact.id && fact.additionalInfo && (
                  <View style={styles.expandedFactContent}>
                    <Text style={styles.expandedFactText}>{fact.additionalInfo}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  greetingSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  promptText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  voiceHelperCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientCard: {
    borderRadius: 16,
    padding: 16,
  },
  voiceCardContent: {
    padding: 8,
  },
  voiceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  voiceCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: '#357002',
    fontWeight: '600',
    fontSize: 14,
  },
  actionCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  actionCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    paddingRight: 20,
  },
  arrowIcon: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  selectedImageContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  // Updated Results Section Styles to match the new UI
  resultsSection: {
    marginBottom: 24,
  },
  resultCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  resultCardHeader: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#222222',
  },
  userAvatarContainer: {
    marginRight: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A54EB',
  },
  resultQueryContainer: {
    flex: 1,
  },
  resultQueryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  resultStatsRow: {
    flexDirection: 'row',
  },
  resultStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  resultStatText: {
    color: '#AAAAAA',
    fontSize: 12,
    marginLeft: 4,
  },
  resultContent: {
    padding: 16,
  },
  resultDefinition: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  resultImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  resultExampleImage: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    margin: '1%',
  },
  resultFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  resultFooterButton: {
    marginRight: 20,
  },
  // AI Facts Section - Updated for expandable functionality
  factsSection: {
    marginBottom: 24,
  },
  factCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  factIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  factContent: {
    flex: 1,
    paddingRight: 24,
  },
  factTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  factDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  expandedFactContent: {
    backgroundColor: '#333333',
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginTop: -12,
    marginBottom: 12,
  },
  expandedFactText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  // Detected Items styles
  detectedItemsContainer: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  detectedItemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(74, 84, 235, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    margin: 4,
  },
  tagText: {
    color: '#4A54EB',
    fontSize: 12,
    fontWeight: '500',
  },
  // Recycling Info Section
  recyclingInfoSection: {
    marginTop: 20,
    backgroundColor: '7ec83e',
    borderRadius: 12,
    padding: 16,
  },
  recyclingInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  recyclingTipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tipIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  recyclingTipText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
});

export default WasteIdentificationScreen;