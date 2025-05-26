import { supabase } from '../config/supabaseConfig';
import { formatTime } from '../config/supabaseConfig';

class AgencyManager {
  async fetchAgencies() {
    try {
      // First fetch all agencies
      const { data: agencies, error: agenciesError } = await supabase
        .from('agencies')
        .select('id, name, constituency, rating, reviews_count, description, contact_number, logo_url, county')
        .order('name', { ascending: true });
      
      if (agenciesError) throw agenciesError;
      
      // Now fetch standard plans for all agencies
      const { data: standardPlans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('id, agency_id, price, plan_type')
        .eq('plan_type', 'standard')
        .eq('is_active', true);
      
      if (plansError) throw plansError;
      
      // Create a map of agency ID to standard plan
      const agencyPlans = {};
      if (standardPlans && standardPlans.length > 0) {
        standardPlans.forEach(plan => {
          agencyPlans[plan.agency_id] = plan;
        });
      }
      
      // Add plan information to each agency
      const agenciesWithPlans = agencies.map(agency => {
        const standardPlan = agencyPlans[agency.id];
        return {
          ...agency,
          price: standardPlan ? standardPlan.price : null,
          plan_type: standardPlan ? standardPlan.plan_type : 'standard'
        };
      });
      
      // Ensure we have valid data
      return { data: agenciesWithPlans || [], error: null };
    } catch (error) {
      console.error('Error fetching agencies:', error);
      return { data: [], error };
    }
  }

  async fetchAgenciesByConstituency(constituency) {
    try {
      if (!constituency) {
        return this.fetchAgencies();
      }
      
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name, constituency, rating, reviews_count, price, description, contact_number, logo_url, county')
        .eq('constituency', constituency)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching agencies by constituency:', error);
      return { data: [], error };
    }
  }

  async fetchAgenciesByLocation(location) {
    try {
      let query = supabase.from('agencies').select('*');
      
      if (location && location !== 'All Locations') {
        query = query.eq('location', location);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching agencies by location:', error);
      throw error;
    }
  }

  async fetchAgencyDetails(agencyId) {
    try {
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', agencyId)
        .single();
      
      if (agencyError) throw agencyError;
      if (!agency) throw new Error(`Agency with id ${agencyId} not found`);
      
      const { data: services = [], error: servicesError } = await supabase
        .from('agency_services')
        .select('*')
        .eq('agency_id', agencyId);
      
      if (servicesError) throw servicesError;
      
      const { data: operationalHours = [], error: hoursError } = await supabase
        .from('operational_hours')
        .select('*')
        .eq('agency_id', agencyId);
      
      if (hoursError) throw hoursError;
      
      const { data: areas = [], error: areasError } = await supabase
        .from('operational_areas')
        .select('*')
        .eq('agency_id', agencyId);
      
      if (areasError) throw areasError;
      
      let routes = [];
      if (areas && areas.length > 0) {
        const areaIds = areas.map(area => area.id);
        const { data: routesData = [], error: routesError } = await supabase
          .from('collection_routes')
          .select('*')
          .in('area_id', areaIds);
        
        if (routesError) throw routesError;
        routes = routesData || [];
        
        for (let route of routes) {
          const { data: daysData = [], error: daysError } = await supabase
            .from('collection_days')
            .select('day_of_week')
            .eq('route_id', route.id);
          
          if (daysError) throw daysError;
          route.collection_days = daysData ? daysData.map(day => day.day_of_week) : [];
          
          const { data: coordinatesData = [], error: coordinatesError } = await supabase
            .from('route_coordinates')
            .select('*')
            .eq('route_id', route.id)
            .order('sequence_number', { ascending: true });
          
          if (coordinatesError) throw coordinatesError;
          
          if (coordinatesData && coordinatesData.length > 0) {
            route.route_coordinates = coordinatesData.map(coord => ({
              lat: parseFloat(coord.latitude || 0),
              lng: parseFloat(coord.longitude || 0)
            }));
          } else {
            route.route_coordinates = [];
          }
        }
      }
      
      const formattedHours = {};
      if (operationalHours && operationalHours.length > 0) {
        operationalHours.forEach(hour => {
          if (!hour) return;
          
          const timeString = hour.is_closed ? 
            'Closed' : 
            `${formatTime(hour.opening_time)} - ${formatTime(hour.closing_time)}`;
          
          formattedHours[hour.day_of_week] = timeString;
        });
      }
      
      const formattedServices = services && services.length > 0 
        ? services.map(service => service.service_description).filter(Boolean)
        : [];
      
      return {
        ...agency,
        services: formattedServices,
        operational_hours: formattedHours,
        areas: areas || [],
        routes: routes || []
      };
    } catch (error) {
      console.error('Error fetching agency details:', error);
      throw error;
    }
  }

  async fetchAllAgenciesWithDetails() {
    try {
      const { data: agencies, error: agenciesError } = await supabase
        .from('agencies')
        .select('id, name, constituency, rating, reviews_count, price, description, contact_number, logo_url, county')
        .order('name', { ascending: true });
      
      if (agenciesError) throw agenciesError;
      
      // Add null check for agencies
      if (!agencies || !Array.isArray(agencies)) {
        console.log('No agencies found or invalid data format');
        return { data: [], error: null };
      }
      
      const agenciesWithDetails = await Promise.all(
        agencies.map(async (agency) => {
          try {
            return await this.fetchAgencyDetails(agency.id);
          } catch (error) {
            console.error(`Error fetching details for agency ${agency.id}:`, error);
            return agency;
          }
        })
      );
      
      // Filter out any null or undefined values
      const validAgencies = agenciesWithDetails.filter(Boolean);
      
      return { data: validAgencies, error: null };
    } catch (error) {
      console.error('Error fetching all agencies with details:', error);
      return { data: [], error };
    }
  }
}

export default new AgencyManager();