-- Apple client
INSERT INTO clients (name, slug) VALUES ('Apple', 'apple')
ON CONFLICT (slug) DO NOTHING;

-- Apple products
INSERT INTO products (client_id, name, sku, category) VALUES
    ((SELECT id FROM clients WHERE slug = 'apple'), 'iPhone 16 Pro',      'APL-IP16P-2024',  'mobile'),
    ((SELECT id FROM clients WHERE slug = 'apple'), 'iPhone 16',          'APL-IP16-2024',   'mobile'),
    ((SELECT id FROM clients WHERE slug = 'apple'), 'MacBook Air M3',     'APL-MBA-M3-2024', 'laptop'),
    ((SELECT id FROM clients WHERE slug = 'apple'), 'iPad Pro M4',        'APL-IPADP-2024',  'tablet'),
    ((SELECT id FROM clients WHERE slug = 'apple'), 'Apple Watch Ultra 2','APL-AWU2-2024',    'wearable')
ON CONFLICT (sku) DO NOTHING;

-- Note: Test users are seeded by the API gateway on startup (requires bcrypt hashing).
-- See services/api_gateway/seed.py
