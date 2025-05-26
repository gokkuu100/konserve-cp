import { supabase } from '../../config/supabaseConfig';

class BusinessProfileManager {
  /**
   * Create a new business profile with waste details
   * @param {Object} profileData - Business profile data
   * @param {Object} wasteData - Business waste details
   * @returns {Promise<Object>} - Created business profile with waste details
   */
  async createBusinessProfile(profileData, wasteData) {
    try {
      // Start a transaction by using a single batch call
      const { data: profile, error: profileError } = await supabase
        .from('business_profiles')
        .insert({
          user_id: profileData.userId,
          business_name: profileData.businessName,
          business_type: profileData.businessType,
          business_address: profileData.businessAddress,
          business_constituency: profileData.businessConstituency,
          business_county: profileData.businessCounty,
          contact_person: profileData.contactPerson,
          contact_email: profileData.contactEmail,
          contact_phone: profileData.contactPhone,
          number_of_employees: profileData.numberOfEmployees,
          business_description: profileData.businessDescription
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating business profile:', profileError);
        throw profileError;
      }

      // Create waste details for the profile
      const { data: wasteDetails, error: wasteError } = await supabase
        .from('business_waste_details')
        .insert({
          business_profile_id: profile.id,
          waste_generated_kg_per_week: wasteData.wasteGeneratedKgPerWeek,
          waste_types: wasteData.wasteTypes,
          current_disposal_method: wasteData.currentDisposalMethod,
          sorting_capability: wasteData.sortingCapability,
          recycling_interest: wasteData.recyclingInterest,
          collection_frequency_preference: wasteData.collectionFrequencyPreference,
          special_requirements: wasteData.specialRequirements
        })
        .select()
        .single();

      if (wasteError) {
        console.error('Error creating waste details:', wasteError);
        throw wasteError;
      }

      return {
        ...profile,
        wasteDetails
      };
    } catch (error) {
      console.error('Error in createBusinessProfile:', error);
      throw error;
    }
  }

  /**
   * Get all business profiles for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - List of business profiles with waste details
   */
  async getBusinessProfilesByUserId(userId) {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching business profiles:', profilesError);
        throw profilesError;
      }

      // Fetch waste details for each profile
      const profilesWithWasteDetails = await Promise.all(
        profiles.map(async (profile) => {
          const { data: wasteDetails, error: wasteError } = await supabase
            .from('business_waste_details')
            .select('*')
            .eq('business_profile_id', profile.id)
            .single();

          if (wasteError && wasteError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
            console.error(`Error fetching waste details for profile ${profile.id}:`, wasteError);
          }

          return {
            ...profile,
            wasteDetails: wasteDetails || null
          };
        })
      );

      return profilesWithWasteDetails;
    } catch (error) {
      console.error('Error in getBusinessProfilesByUserId:', error);
      throw error;
    }
  }

  /**
   * Get a single business profile by ID
   * @param {number} profileId - Profile ID
   * @returns {Promise<Object>} - Business profile with waste details
   */
  async getBusinessProfileById(profileId) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileError) {
        console.error('Error fetching business profile:', profileError);
        throw profileError;
      }

      const { data: wasteDetails, error: wasteError } = await supabase
        .from('business_waste_details')
        .select('*')
        .eq('business_profile_id', profileId)
        .single();

      if (wasteError && wasteError.code !== 'PGRST116') {
        console.error('Error fetching waste details:', wasteError);
      }

      return {
        ...profile,
        wasteDetails: wasteDetails || null
      };
    } catch (error) {
      console.error('Error in getBusinessProfileById:', error);
      throw error;
    }
  }

  /**
   * Update a business profile
   * @param {number} profileId - Profile ID
   * @param {Object} profileData - Updated profile data
   * @returns {Promise<Object>} - Updated profile
   */
  async updateBusinessProfile(profileId, profileData) {
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .update({
          business_name: profileData.businessName,
          business_type: profileData.businessType,
          business_address: profileData.businessAddress,
          business_constituency: profileData.businessConstituency,
          business_county: profileData.businessCounty,
          contact_person: profileData.contactPerson,
          contact_email: profileData.contactEmail,
          contact_phone: profileData.contactPhone,
          number_of_employees: profileData.numberOfEmployees,
          business_description: profileData.businessDescription,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();

      if (error) {
        console.error('Error updating business profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateBusinessProfile:', error);
      throw error;
    }
  }

  /**
   * Update waste details for a business profile
   * @param {number} wasteDetailsId - Waste details ID
   * @param {Object} wasteData - Updated waste data
   * @returns {Promise<Object>} - Updated waste details
   */
  async updateWasteDetails(wasteDetailsId, wasteData) {
    try {
      const { data, error } = await supabase
        .from('business_waste_details')
        .update({
          waste_generated_kg_per_week: wasteData.wasteGeneratedKgPerWeek,
          waste_types: wasteData.wasteTypes,
          current_disposal_method: wasteData.currentDisposalMethod,
          sorting_capability: wasteData.sortingCapability,
          recycling_interest: wasteData.recyclingInterest,
          collection_frequency_preference: wasteData.collectionFrequencyPreference,
          special_requirements: wasteData.specialRequirements,
          updated_at: new Date().toISOString()
        })
        .eq('id', wasteDetailsId)
        .select()
        .single();

      if (error) {
        console.error('Error updating waste details:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateWasteDetails:', error);
      throw error;
    }
  }

  /**
   * Delete a business profile (and its waste details due to foreign key constraints)
   * @param {number} profileId - Profile ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteBusinessProfile(profileId) {
    try {
      // Delete waste details first (due to foreign key constraint)
      const { error: wasteError } = await supabase
        .from('business_waste_details')
        .delete()
        .eq('business_profile_id', profileId);

      if (wasteError) {
        console.error('Error deleting waste details:', wasteError);
        throw wasteError;
      }

      // Then delete the profile
      const { error: profileError } = await supabase
        .from('business_profiles')
        .delete()
        .eq('id', profileId);

      if (profileError) {
        console.error('Error deleting business profile:', profileError);
        throw profileError;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteBusinessProfile:', error);
      throw error;
    }
  }

  /**
   * Get all available business types
   * @returns {Promise<Array>} - List of business types
   */
  async getBusinessTypes() {
    try {
      const { data, error } = await supabase
        .from('business_types')
        .select('*')
        .order('type_name');

      if (error) {
        console.error('Error fetching business types:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getBusinessTypes:', error);
      throw error;
    }
  }
}

export default new BusinessProfileManager();
