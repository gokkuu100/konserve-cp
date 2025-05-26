import { supabase } from "../config/supabaseConfig";

class MarketListingManager {
  /**
   * Get all active buyers with their waste types and pricing
   * @param {Object} filters - Optional filters for location, waste type, buyer type
   * @returns {Promise<Array>} Array of buyer objects with their details
   */
  async getBuyers(filters = {}) {
    try {
      // Start with the base query to get buyers
      let query = supabase
        .from('buyer_details_view')
        .select(`
          buyer_id,
          buyer_name,
          buyer_type,
          logo_url,
          county,
          constituency,
          location,
          description,
          pickup_details,
          working_hours,
          phone,
          email,
          service_options,
          is_verified
        `);

      // Apply filters if they exist
      if (filters.county) {
        query = query.eq('county', filters.county);
      }
      
      if (filters.constituency) {
        query = query.eq('constituency', filters.constituency);
      }
      
      if (filters.buyerType && filters.buyerType !== 'All') {
        query = query.eq('buyer_type', filters.buyerType);
      }

      // Execute the query to get buyers
      const { data: buyers, error: buyersError } = await query;
      
      if (buyersError) throw buyersError;
      
      // If no buyers found, return empty array
      if (!buyers || buyers.length === 0) return [];
      
      // For each buyer, get their waste types and pricing
      const enrichedBuyers = await Promise.all(
        buyers.map(async (buyer) => {
          const { data: wasteTypes, error: wasteError } = await supabase
            .from('buyer_waste_types_view')
            .select('*')
            .eq('buyer_id', buyer.buyer_id);
            
          if (wasteError) throw wasteError;
          
          // Format the waste types into the structure expected by the component
          const wasteTypesArray = wasteTypes.map(wt => wt.waste_type);
          const pricingObject = wasteTypes.reduce((acc, wt) => {
            acc[wt.waste_type] = `KSh ${wt.price_per_kg}/kg`;
            return acc;
          }, {});
          
          // If wasteType filter exists, check if this buyer has it
          if (filters.wasteType && !wasteTypesArray.includes(filters.wasteType)) {
            return null; // This buyer doesn't have the requested waste type
          }
          
          // Get the unread message count for this buyer
          const { data: unreadMessages } = await supabase
            .from('unread_messages_count')
            .select('unread_count')
            .eq('buyer_id', buyer.buyer_id)
            .maybeSingle();
            
          // Format the buyer object to match the structure expected by the component
          return {
            id: buyer.buyer_id,
            name: buyer.buyer_name,
            type: buyer.buyer_type,
            logo: buyer.logo_url || 'https://via.placeholder.com/150',
            location: buyer.location,
            constituency: buyer.constituency,
            wasteTypes: wasteTypesArray,
            pricing: pricingObject,
            serviceOptions: (() => {
              try {
                // If it's already an array, use it directly
                if (Array.isArray(buyer.service_options)) {
                  return buyer.service_options;
                }
                // If it's a string, try to parse it
                if (typeof buyer.service_options === 'string') {
                  return JSON.parse(buyer.service_options);
                }
                // If it's an object (sometimes jsonb comes as parsed already)
                if (buyer.service_options && typeof buyer.service_options === 'object') {
                  return buyer.service_options;
                }
                // Default to empty array if null or undefined
                return [];
              } catch (error) {
                console.log('Error parsing service_options:', buyer.service_options);
                return []; // Default to empty array on error
              }
            })(),
            description: buyer.description,
            pickupDetails: buyer.pickup_details,
            contactInfo: {
              phone: buyer.phone,
              email: buyer.email,
            },
            workingHours: buyer.working_hours,
            unreadMessages: unreadMessages?.unread_count || 0,
            isVerified: buyer.is_verified,
          };
        })
      );
      
      // Filter out null entries (those that didn't match waste type filter)
      return enrichedBuyers.filter(buyer => buyer !== null);
    } catch (error) {
      console.error('Error fetching buyers:', error);
      throw error;
    }
  }

  /**
   * Get unique constituencies from buyers table
   * @returns {Promise<Array>} Array of unique constituency names
   */
  async getConstituencies() {
    try {
      const { data, error } = await supabase
        .from('buyers')
        .select('constituency')
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Extract unique constituencies
      const constituencies = [...new Set(data.map(item => item.constituency))];
      return constituencies;
    } catch (error) {
      console.error('Error fetching constituencies:', error);
      throw error;
    }
  }

  /**
   * Get unique waste types from buyer_waste_types table
   * @returns {Promise<Array>} Array of unique waste types
   */
  async getWasteTypes() {
    try {
      console.log('Fetching waste types from buyer_waste_types table...');
      
      // First, let's check if the table exists and has rows
      const { count, error: countError } = await supabase
        .from('buyer_waste_types')
        .select('*', { count: 'exact', head: true });
        
      console.log('Table row count check:', count, countError ? `Error: ${countError.message}` : 'No error');
      
      // Now try to get all rows to see if there's any data
      const { data: allData, error: allError } = await supabase
        .from('buyer_waste_types')
        .select('*')
        .limit(5); // Just get a few rows to check
      
      console.log('Sample data check:', 
        allData ? `Found ${allData.length} rows` : 'No data', 
        allError ? `Error: ${allError.message}` : 'No error'
      );
      
      if (allData && allData.length > 0) {
        console.log('Sample row:', allData[0]);
      }
      
      // Now try to get just the waste_type column
      const { data, error } = await supabase
        .from('buyer_waste_types')
        .select('waste_type');
      
      if (error) {
        console.error('Error fetching waste types:', error);
        throw error;
      }
      
      console.log('Raw waste types data:', data ? `Found ${data.length} records` : 'No data');
      
      if (!data || data.length === 0) {
        console.log('No waste types found in the database');
        return [];
      }
      
      // Log a few examples to check the structure
      if (data.length > 0) {
        console.log('First few waste type records:', data.slice(0, 3));
      }
      
      // Extract unique waste types
      const uniqueWasteTypes = [...new Set(data.map(item => {
        console.log('Processing item:', item);
        return item.waste_type;
      }))];
      
      console.log('Unique waste types found:', uniqueWasteTypes);
      return uniqueWasteTypes;
    } catch (error) {
      console.error('Error in getWasteTypes method:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Get count of buyers per constituency
   * @returns {Promise<Object>} Object with constituency names as keys and counts as values
   */
  async getBuyerCountsByConstituency() {
    try {
      const { data, error } = await supabase
        .from('buyers')
        .select('constituency')
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Count occurrences of each constituency
      const counts = data.reduce((acc, item) => {
        acc[item.constituency] = (acc[item.constituency] || 0) + 1;
        return acc;
      }, {});
      
      return counts;
    } catch (error) {
      console.error('Error fetching buyer counts:', error);
      throw error;
    }
  }
}

export default new MarketListingManager();
