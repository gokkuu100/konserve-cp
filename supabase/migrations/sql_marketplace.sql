-- Enable Row Level Security
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Buyers Table with integrated location hierarchy and type
CREATE TABLE buyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    buyer_type TEXT NOT NULL, -- Directly store buyer type as text
    logo_url TEXT,
    
    -- Location hierarchy integrated directly
    county TEXT NOT NULL,
    constituency TEXT NOT NULL,
    location TEXT NOT NULL,
    
    description TEXT,
    pickup_details TEXT,
    working_hours TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    
    -- Service options as JSON array
    service_options JSONB DEFAULT '[]',
    
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Buyer Waste Types and Pricing
CREATE TABLE buyer_waste_types (
    id SERIAL PRIMARY KEY,
    buyer_id UUID REFERENCES buyers(id) ON DELETE CASCADE,
    waste_type TEXT NOT NULL, -- Store waste type directly as text
    waste_description TEXT,
    price_per_kg DECIMAL(10,2) NOT NULL,
    minimum_quantity INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(buyer_id, waste_type)
);

-- Marketplace Chat Table
CREATE TABLE marketplace_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES buyers(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create View for Buyer Details
CREATE VIEW buyer_details_view AS
SELECT 
    b.id AS buyer_id,
    b.name AS buyer_name,
    b.buyer_type,
    b.logo_url,
    b.county,
    b.constituency,
    b.location,
    b.description,
    b.pickup_details,
    b.working_hours,
    b.phone,
    b.email,
    b.service_options,
    b.is_verified,
    b.is_active,
    b.created_at,
    b.updated_at
FROM 
    buyers b
WHERE 
    b.is_active = TRUE;

-- Create View for Buyer Waste Types
CREATE VIEW buyer_waste_types_view AS
SELECT 
    bwt.id,
    bwt.buyer_id,
    b.name AS buyer_name,
    bwt.waste_type,
    bwt.waste_description,
    bwt.price_per_kg,
    bwt.minimum_quantity,
    bwt.notes
FROM 
    buyer_waste_types bwt
JOIN 
    buyers b ON bwt.buyer_id = b.id;

-- Create View for Unread Chat Messages Count
CREATE VIEW unread_messages_count AS
SELECT 
    receiver_id AS buyer_id,
    sender_id,
    COUNT(*) AS unread_count
FROM 
    marketplace_chats
WHERE 
    is_read = FALSE
GROUP BY 
    receiver_id, sender_id;

-- Row Level Security Policies
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_waste_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_chats ENABLE ROW LEVEL SECURITY;

-- Policies for Buyers
CREATE POLICY "Buyers are viewable by everyone"
ON buyers FOR SELECT
USING (true);


-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_buyers_modtime
BEFORE UPDATE ON buyers
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_buyer_waste_types_modtime
BEFORE UPDATE ON buyer_waste_types
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();