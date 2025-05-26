-- 1. Insert into agencies_business
INSERT INTO agencies_business (
    name, constituency, rating, reviews_count, base_price, description,
    contact_number, service_radius, logo_url, county,
    certifications, contract_terms, equipment, business_types,
    created_at, updated_at
) VALUES (
    'EcoServe Business Solutions',
    'Westlands',
    4.8,
    215,
    22000.00, -- base_price
    'Comprehensive and eco-friendly waste management for modern businesses. We handle diverse waste streams with a focus on recycling and sustainability. Serving commercial, industrial, and institutional clients.',
    '0712345678',
    30.0, -- service_radius in km
    'https://example.com/logos/ecoserve_biz.png',
    'Nairobi',
    ARRAY['NEMA Certified Waste Collector 2024', 'ISO 14001:2015 Environmental Management', 'Zero Waste to Landfill Advocate Partner'],
    ARRAY['Flexible contract durations (6, 12, 24 months)', 'Transparent monthly invoicing', 'Dedicated account manager', 'Annual waste audit report included'],
    ARRAY['Heavy-duty compactor trucks (various sizes)', 'Secure, lockable waste containers (1100L, 2400L)', 'Specialized e-waste collection bins', 'On-site balers for cardboard/plastics (optional)'],
    ARRAY['Office Complexes', 'Manufacturing Plants', 'Retail Chains', 'Educational Institutions', 'Healthcare Facilities'],
    NOW(), NOW()
);

-- 2. Insert into agency_services_business (linked to agency_id 101)
INSERT INTO agency_services_business (agency_id, service_description, created_at) VALUES
(1, 'Scheduled general waste collection (weekly, bi-weekly)', NOW()),
(1, 'Segregated recyclables collection (paper, plastic, glass, metal)', NOW()),
(1, 'Confidential document destruction services', NOW()),
(1, 'E-waste and hazardous materials disposal (compliant)', NOW()),
(1, 'Bulk waste and construction debris removal', NOW());

-- 3. Insert into operational_areas_business (linked to agency_id 101)
INSERT INTO operational_areas_business (agency_id, area_name, area_description, coverage_radius, created_at) VALUES
(1, 'Westlands Commercial Hub', 'Covering all major office parks, shopping centers, and business premises within Westlands.', 10.0, NOW()),
(1, 'Upper Hill Financial District', 'Servicing corporate offices and institutions in the Upper Hill area.', 8.5, NOW());

-- 4. Insert into collection_routes_business (linked to area_id 201 - Westlands)
INSERT INTO collection_routes_business (area_id, route_name, route_description, collection_time_start, collection_time_end, created_at) VALUES
(1, 'Westlands Route A - Office Parks', 'Morning collection for The Address, Delta Corner, Mirage Towers.', '07:00:00', '11:00:00', NOW()),
(1, 'Westlands Route B - Retail & Malls', 'Afternoon collection for Sarit Centre, Westgate Mall.', '14:00:00', '17:00:00', NOW());

-- -- 5. Insert into collection_days_business (linked to route_id 301)
INSERT INTO collection_days_business (route_id, day_of_week, created_at) VALUES
(1, 'Monday', NOW()),
(1, 'Wednesday', NOW()),
(1, 'Friday', NOW());

-- -- Insert for route_id 302
INSERT INTO collection_days_business (route_id, day_of_week, created_at) VALUES
(2, 'Tuesday', NOW()),
(2, 'Thursday', NOW()),
(2, 'Saturday', NOW());

-- -- 6. Insert into operational_hours_business (linked to agency_id 101)
INSERT INTO operational_hours_business (agency_id, day_of_week, opening_time, closing_time, is_closed, created_at) VALUES
(1, 'Monday', '06:00:00', '18:00:00', FALSE, NOW()),
(1, 'Tuesday', '06:00:00', '18:00:00', FALSE, NOW()),
(1, 'Wednesday', '06:00:00', '18:00:00', FALSE, NOW()),
(1, 'Thursday', '06:00:00', '18:00:00', FALSE, NOW()),
(1, 'Friday', '06:00:00', '18:00:00', FALSE, NOW()),
(1, 'Saturday', '08:00:00', '14:00:00', FALSE, NOW()),
(1, 'Sunday', '00:00:00', '00:00:00', TRUE, NOW()); -- Assuming is_closed means opening/closing times are irrelevant

-- -- 7. Insert into route_coordinates_business (linked to route_id 301)
INSERT INTO route_coordinates_business (route_id, latitude, longitude, sequence_number, created_at) VALUES
(1, -1.2650, 36.8050, 1, NOW()), -- Example coordinate 1 for Westlands Route A
(1, -1.2665, 36.8075, 2, NOW()), -- Example coordinate 2 for Westlands Route A
(1, -1.2680, 36.8090, 3, NOW()); -- Example coordinate 3 for Westlands Route A

-- -- 8. Insert into subscription_plans_business (linked to agency_id 101)
INSERT INTO subscription_plans_business (
    agency_id, name, description, price, duration_days, features, is_active, plan_type,
    collection_days, negotiable, negotiated_min_price, allows_additional_bins, additional_bin_pricing,
    waste_kg_min, waste_kg_max, max_collection_days, created_at, updated_at
) VALUES (
    1, 'Standard Office Package', 'Ideal for medium-sized offices. Includes regular collection of general waste and recyclables.',
    15000.00, 30, '{"reporting": "monthly_summary", "bin_types": ["general_1100L", "recycling_240L_paper", "recycling_240L_plastic"]}', TRUE, 'standard',
    ARRAY['Monday', 'Wednesday', 'Friday'], -- Example collection days for this plan
    TRUE, 13500.00, -- negotiable, negotiated_min_price
    TRUE, '{"standard_1100L_extra": 2000, "recycling_240L_extra": 500}', -- allows_additional_bins, additional_bin_pricing
    50, 200, -- waste_kg_min, waste_kg_max (per collection or month, define clearly)
    3, -- max_collection_days (e.g., per week for this plan)
    NOW(), NOW()
);

-- -- Assuming id 402 for another plan
INSERT INTO subscription_plans_business (
    agency_id, name, description, price, duration_days, features, is_active, plan_type,
    collection_days, negotiable, negotiated_min_price, allows_additional_bins, additional_bin_pricing,
    waste_kg_min, waste_kg_max, max_collection_days, created_at, updated_at
) VALUES (
    1, 'Large Enterprise Package', 'Customizable plan for large businesses with high waste volume. Includes dedicated support and advanced reporting.',
    45000.00, 30, '{"reporting": "detailed_quarterly_audit", "dedicated_support_hotline": true, "on_site_training": true}', TRUE, 'custom',
    ARRAY['Monday', 'Wednesday', 'Saturday'], -- Example collection days
    TRUE, 40000.00,
    TRUE, '{"compactor_rental_monthly": 5000, "secure_shredding_bin_monthly": 1500}',
    500, 2000,
    1,
    NOW(), NOW()
);
