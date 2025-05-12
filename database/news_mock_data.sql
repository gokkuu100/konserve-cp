-- Insert mock news articles
INSERT INTO public.news_articles (id, title, content, image_url, category, author, created_at, pinned, pinned_order, is_active)
VALUES
    -- Pinned articles
    (
        '11111111-1111-1111-1111-111111111111',
        'World Cleanup Day 2023',
        'Join us for the World Cleanup Day event happening across the city. We aim to collect over 5 tons of waste from our shores and urban areas. Volunteers will be provided with gloves, bags, and refreshments.\n\nThe event will take place on September 16th, 2023, starting at 8:00 AM and ending at 2:00 PM. Meeting points will be at Central Park, Riverside Park, and Beachfront Promenade.\n\nThis is a family-friendly event, and we encourage everyone to bring their children to learn about environmental conservation from an early age. Water and light snacks will be provided, but please bring your own reusable water bottle to reduce plastic waste.\n\nLast year, we collected over 3.5 tons of waste, and this year we aim to surpass that record with your help. Remember, every piece of trash collected is one less piece in our oceans and natural habitats.',
        'https://images.unsplash.com/photo-1621451537084-482c73073a0f',
        'Events',
        'Konserve Team',
        '2023-09-10T10:00:00Z',
        TRUE,
        2,
        TRUE
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'Monthly Recycling Challenge Winners Announced',
        'Congratulations to the Johnson family for winning this month''s recycling challenge with over 120kg of recyclables diverted from landfills! They win a $200 eco-friendly shopping spree.\n\nThe Johnson family has been consistently participating in our recycling programs for the past year and has shown remarkable dedication to reducing their environmental footprint. Their winning strategy included careful sorting of materials, composting food waste, and reducing their overall consumption of single-use plastics.\n\nThe $200 shopping spree can be redeemed at any of our partner eco-friendly stores, including Green Living Supplies, EcoHome, and Sustainable Futures.\n\nWe would also like to recognize our runners-up: the Green Hills Apartment community, which collected 98kg of recyclables, and the Parkview Community, which collected 85kg. Both will receive a $50 gift card to our partner stores.\n\nThe next recycling challenge begins on October 1st. Register your household or community group today!',
        'https://images.unsplash.com/photo-1604187351574-c75ca79f5807',
        'Announcements',
        'Events Team',
        '2023-09-08T14:30:00Z',
        TRUE,
        1,
        TRUE
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'Government Announces New Recycling Incentives',
        'The Ministry of Environment has announced new tax incentives for households that consistently participate in the municipal recycling program. Eligible households can receive up to $300 in tax rebates annually.\n\nTo qualify for the full rebate, households must participate in the recycling program for at least 10 months of the year and demonstrate a reduction in their overall waste output compared to the previous year. Partial rebates are available for households that participate for at least 6 months.\n\nThe initiative aims to increase recycling rates by 25% over the next two years and reduce landfill waste by 30%. The program will be administered through the municipal waste management department, which will track participation through the existing smart bin system.\n\n"This is a significant step towards our goal of becoming a zero-waste city by 2030," said the Minister of Environment. "By providing financial incentives, we hope to encourage more households to make recycling a part of their daily routine."\n\nRegistration for the program opens next month. Households can sign up through the municipal website or at any community center.',
        'https://images.unsplash.com/photo-1528323273322-d81458248d40',
        'Announcements',
        'Policy Team',
        '2023-09-05T09:15:00Z',
        TRUE,
        3,
        TRUE
    ),
    
    -- Regular articles
    (
        '44444444-4444-4444-4444-444444444444',
        'New Collection Routes Starting Next Month',
        'We''re optimizing our collection routes starting October 1st. Check the app for your new collection schedule. This change will reduce our carbon emissions by an estimated 15%.\n\nThe route optimization is based on a comprehensive study of traffic patterns, residential density, and waste volume. By reorganizing our collection routes, we can reduce the distance traveled by our trucks, minimize idle time, and improve overall efficiency.\n\nSome neighborhoods may see a change in their collection day or time. Please check the app or website for your updated schedule. If you have not yet downloaded our app, now is a good time to do so to receive notifications about your collection schedule.\n\nWe appreciate your understanding and cooperation as we work to make our operations more environmentally friendly and cost-effective.',
        'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b',
        'Announcements',
        'Operations Team',
        '2023-09-03T11:45:00Z',
        FALSE,
        NULL,
        TRUE
    ),
    (
        '55555555-5555-5555-5555-555555555555',
        'Community Recycling Workshop',
        'Learn how to properly sort your recyclables and reduce contamination at our upcoming workshop. Participants will receive a free home recycling kit.\n\nThe workshop will cover the following topics:\n- Understanding recycling symbols and materials\n- Common recycling mistakes and how to avoid them\n- Creative ways to reduce waste at home\n- Composting basics for beginners\n\nThe workshop will be held at the Community Center on September 15th from 6:00 PM to 8:00 PM. Space is limited, so please register in advance through our website or app.\n\nThe free home recycling kit includes a sorting guide, reusable bags for different materials, and compostable bin liners. This workshop is suitable for all ages, and we encourage families to attend together.',
        'https://images.unsplash.com/photo-1523293182086-7651a899d37f',
        'Events',
        'Education Team',
        '2023-09-01T13:20:00Z',
        FALSE,
        NULL,
        TRUE
    ),
    (
        '66666666-6666-6666-6666-666666666666',
        'August Waste Collection Report',
        'Last month we collected over 500 tons of waste, with 60% being successfully recycled or composted. This represents a 5% improvement over the previous month. Thank you for your continued efforts!\n\nBreakdown of collected materials:\n- Paper and cardboard: 150 tons\n- Glass: 80 tons\n- Plastics: 70 tons\n- Metals: 40 tons\n- Organic waste (composted): 160 tons\n- Non-recyclable waste: 200 tons\n\nThe contamination rate in recycling bins decreased from 18% to 15%, which is a significant improvement. However, we still find many non-recyclable items in recycling bins, particularly plastic bags, food-contaminated containers, and electronic waste.\n\nWe would like to remind everyone to rinse food containers before recycling and to check our guidelines for what can and cannot be recycled. Electronic waste should be taken to designated e-waste collection points.\n\nThank you for your continued commitment to waste reduction and recycling. Together, we are making a difference!',
        'https://images.unsplash.com/photo-1611284446993-38118499bedc',
        'Reports',
        'Analytics Team',
        '2023-08-31T10:00:00Z',
        FALSE,
        NULL,
        TRUE
    ),
    (
        '77777777-7777-7777-7777-777777777777',
        'Partnership with GreenTech Solutions',
        'We''re excited to announce our new partnership with GreenTech Solutions. This collaboration will bring advanced waste sorting technology to our processing facilities, increasing recycling efficiency by up to 30%.\n\nGreenTech Solutions is a leader in recycling technology, known for their AI-powered sorting systems that can identify and separate materials with greater accuracy than traditional methods. Their systems can detect different types of plastics, metals, and paper, even when they are mixed or contaminated.\n\nThe new technology will be installed in our main processing facility next month, with full implementation expected by the end of the year. Once operational, the system will allow us to recover more recyclable materials from the waste stream and reduce the amount of waste sent to landfills.\n\n"This partnership represents a significant investment in the future of our recycling program," said our CEO. "By leveraging cutting-edge technology, we can make our operations more efficient and effective, ultimately benefiting both the environment and our community."\n\nWe will provide updates on the implementation process and the impact of the new technology in the coming months.',
        'https://images.unsplash.com/photo-1562408590-e32931084e23',
        'Announcements',
        'Partnerships Team',
        '2023-08-25T15:30:00Z',
        FALSE,
        NULL,
        TRUE
    ),
    (
        '88888888-8888-8888-8888-888888888888',
        'School Recycling Competition',
        'Registration is now open for our annual school recycling competition. Schools can compete for grants of up to $5,000 for sustainability projects.\n\nThe competition runs from October 1st to November 30th, and schools will be judged on the following criteria:\n- Total volume of recyclables collected per student\n- Reduction in contamination rates over the competition period\n- Creative initiatives to promote recycling and waste reduction\n- Student engagement and education\n\nSchools will be divided into three categories based on size: small (under 300 students), medium (300-700 students), and large (over 700 students). Each category will have its own set of prizes:\n- 1st place: $5,000 grant\n- 2nd place: $3,000 grant\n- 3rd place: $1,500 grant\n\nAll participating schools will receive educational materials, recycling bins, and a workshop for students and staff on effective recycling practices.\n\nTo register, school administrators should complete the online form on our website by September 25th. For more information, contact our Education Team at education@konserve.org.',
        'https://images.unsplash.com/photo-1544027993-37dbfe43562a',
        'Events',
        'Education Team',
        '2023-08-20T09:45:00Z',
        FALSE,
        NULL,
        TRUE
    );

-- Note: In a real application, you would insert user_news_status records when users read articles
-- This is just an example for a test user
INSERT INTO public.user_news_status (user_id, article_id, read, read_at, created_at)
VALUES
    -- Example for a test user (replace with actual user IDs when testing)
    ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', TRUE, '2023-09-11T14:25:00Z', '2023-09-11T14:25:00Z'),
    ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', TRUE, '2023-09-10T09:15:00Z', '2023-09-10T09:15:00Z'),
    ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', TRUE, '2023-09-09T16:40:00Z', '2023-09-09T16:40:00Z'),
    ('00000000-0000-0000-0000-000000000000', '66666666-6666-6666-6666-666666666666', TRUE, '2023-09-08T11:30:00Z', '2023-09-08T11:30:00Z'),
    ('00000000-0000-0000-0000-000000000000', '88888888-8888-8888-8888-888888888888', TRUE, '2023-09-07T19:20:00Z', '2023-09-07T19:20:00Z');
