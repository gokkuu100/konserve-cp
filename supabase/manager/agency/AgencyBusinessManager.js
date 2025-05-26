import { supabase } from '../config/supabaseConfig';

class AgencyBusinessManager {
  /**
   * Fetches all business agencies and their detailed related information.
   * This method aims to replicate the structure of MOCK_BUSINESS_AGENCIES
   * found in CollectionAgenciesForBusinessScreen.js.
   */
  async getBusinessAgenciesDetails() {
    try {
      // 1. Fetch all agencies_business
      const { data: agencies, error: agenciesError } = await supabase
        .from('agencies_business')
        .select('*');

      if (agenciesError) {
        console.error('Error fetching agencies_business:', agenciesError);
        throw agenciesError;
      }

      if (!agencies || agencies.length === 0) {
        return [];
      }

      // 2. For each agency, fetch all related details
      const detailedAgencies = await Promise.all(
        agencies.map(async (agency) => {
          // Fetch services
          const { data: servicesData, error: servicesError } = await supabase
            .from('agency_services_business')
            .select('service_description')
            .eq('agency_id', agency.id);
          if (servicesError) console.error(`Error fetching services for agency ${agency.id}:`, servicesError);
          const services = servicesData ? servicesData.map(s => s.service_description) : [];

          // Fetch operational hours
          const { data: opHoursData, error: opHoursError } = await supabase
            .from('operational_hours_business')
            .select('day_of_week, opening_time, closing_time, is_closed')
            .eq('agency_id', agency.id);
          if (opHoursError) console.error(`Error fetching operational hours for agency ${agency.id}:`, opHoursError);
          const operational_hours = {};
          if (opHoursData) {
            opHoursData.forEach(h => {
              operational_hours[h.day_of_week] = h.is_closed ? 'Closed' : `${h.opening_time.substring(0,5)} - ${h.closing_time.substring(0,5)}`;
            });
          }

          // Fetch operational areas and their routes
          const { data: areasData, error: areasError } = await supabase
            .from('operational_areas_business')
            .select('id, area_name, area_description')
            .eq('agency_id', agency.id);
          if (areasError) console.error(`Error fetching areas for agency ${agency.id}:`, areasError);
          
          const areas = areasData ? await Promise.all(
            areasData.map(async (area) => {
              const { data: routesData, error: routesError } = await supabase
                .from('collection_routes_business')
                .select('id, route_name, route_description, collection_time_start, collection_time_end')
                .eq('area_id', area.id);
              if (routesError) console.error(`Error fetching routes for area ${area.id}:`, routesError);

              const routes = routesData ? await Promise.all(
                routesData.map(async (route) => {
                  const { data: daysData, error: daysError } = await supabase
                    .from('collection_days_business')
                    .select('day_of_week')
                    .eq('route_id', route.id);
                  if (daysError) console.error(`Error fetching days for route ${route.id}:`, daysError);
                  const collection_days = daysData ? daysData.map(d => d.day_of_week) : [];

                  const { data: coordsData, error: coordsError } = await supabase
                    .from('route_coordinates_business')
                    .select('latitude, longitude')
                    .eq('route_id', route.id)
                    .order('sequence_number', { ascending: true });
                  if (coordsError) console.error(`Error fetching coords for route ${route.id}:`, coordsError);
                  const route_coordinates = coordsData ? coordsData.map(c => ({ lat: parseFloat(c.latitude), lng: parseFloat(c.longitude) })) : [];
                  
                  return {
                    id: route.id,
                    name: route.route_name, // Matching mock data structure
                    route_name: route.route_name,
                    route_description: route.route_description,
                    collection_days,
                    collection_time_start: route.collection_time_start.substring(0,5),
                    collection_time_end: route.collection_time_end.substring(0,5),
                    route_coordinates,
                  };
                })
              ) : [];
              return {
                id: area.id,
                area_name: area.area_name,
                area_description: area.area_description,
                // The mock data in CollectionAgenciesForBusinessScreen.js has routes directly under agency, not area.
                // For now, I'll attach routes here, but the screen component might need adjustment or this manager needs to flatten it.
                // To match the mock structure more closely, routes should be aggregated at the agency level.
              };
            })
          ) : [];

          // Aggregate all routes from all areas for the agency (to match mock structure)
          let allAgencyRoutes = [];
          if (areasData) {
            for (const area of areasData) {
                const { data: routesData, error: routesError } = await supabase
                    .from('collection_routes_business')
                    .select('id, route_name, route_description, collection_time_start, collection_time_end')
                    .eq('area_id', area.id);
                if (routesError) console.error(`Error fetching routes for area ${area.id} (aggregation):`, routesError);

                if (routesData) {
                    for (const route of routesData) {
                        const { data: daysData, error: daysError } = await supabase
                            .from('collection_days_business')
                            .select('day_of_week')
                            .eq('route_id', route.id);
                        const collection_days = daysData ? daysData.map(d => d.day_of_week) : [];

                        const { data: coordsData, error: coordsError } = await supabase
                            .from('route_coordinates_business')
                            .select('latitude, longitude')
                            .eq('route_id', route.id)
                            .order('sequence_number', { ascending: true });
                        const route_coordinates = coordsData ? coordsData.map(c => ({ lat: parseFloat(c.latitude), lng: parseFloat(c.longitude) })) : [];
                        
                        allAgencyRoutes.push({
                            id: route.id,
                            name: route.route_name, 
                            route_name: route.route_name,
                            route_description: route.route_description,
                            collection_days,
                            collection_time_start: route.collection_time_start.substring(0,5),
                            collection_time_end: route.collection_time_end.substring(0,5),
                            route_coordinates,
                        });
                    }
                }
            }
          }


          // Fetch subscription plans to determine top-level price, plan_type, and capacity
          // For simplicity, picking the first active plan or the one with lowest min_waste_kg as 'primary'
          // This logic might need refinement based on how 'primary' plan is defined.
          const { data: plansData, error: plansError } = await supabase
            .from('subscription_plans_business')
            .select('price, plan_type, waste_kg_min, waste_kg_max, description, features') // Added features
            .eq('agency_id', agency.id)
            .eq('is_active', true)
            .order('waste_kg_min', { ascending: true })
            .limit(1);
          if (plansError) console.error(`Error fetching plans for agency ${agency.id}:`, plansError);
          
          let primaryPlan = plansData && plansData.length > 0 ? plansData[0] : {};
          let capacity = {};
          if (primaryPlan.waste_kg_min !== undefined) capacity.min_capacity = `${primaryPlan.waste_kg_min}kg`;
          if (primaryPlan.waste_kg_max !== undefined) capacity.max_capacity = `${primaryPlan.waste_kg_max}kg`;
          // Specialization can be derived from plan description or features if structured accordingly
          capacity.specialization = primaryPlan.description || (primaryPlan.features && primaryPlan.features.specialization) || 'General Business Waste';

          return {
            id: agency.id,
            name: agency.name,
            logo_url: agency.logo_url,
            rating: agency.rating ? parseFloat(agency.rating) : 0,
            reviews_count: agency.reviews_count || 0,
            constituency: agency.constituency,
            price: primaryPlan.price ? primaryPlan.price.toString() : (agency.base_price ? agency.base_price.toString() : 'N/A'), // Use base_price from agency if plan price not found
            plan_type: primaryPlan.plan_type || 'Varies',
            description: agency.description,
            capacity,
            business_types: agency.business_types || [],
            services,
            operational_hours,
            routes: allAgencyRoutes, // Use the aggregated routes
            areas: areasData ? areasData.map(a => ({id: a.id, area_name: a.area_name, area_description: a.area_description})) : [], // Simplified areas list as per mock
            equipment: agency.equipment || [],
            certifications: agency.certifications || [],
            contract_terms: agency.contract_terms || [],
          };
        })
      );

      return detailedAgencies;
    } catch (error) {
      console.error('General error in getBusinessAgenciesDetails:', error);
      return []; // Return empty array on error
    }
  }
  
  // Placeholder for fetching individual agency details if needed later
  async getBusinessAgencyById(agencyId) {
    // Similar logic to getBusinessAgenciesDetails but filtered by agencyId
    // and would not need the outer agencies.map loop.
    console.warn('getBusinessAgencyById is not fully implemented yet.');
    return null;
  }

}

export default new AgencyBusinessManager();
