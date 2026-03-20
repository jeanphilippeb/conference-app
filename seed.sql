-- ============================================================
-- Conf Hunter — Seed Data
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Clean up previous seed data
DELETE FROM conference_interactions WHERE user_id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003'
);
DELETE FROM conference_profiles WHERE id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003'
);
DELETE FROM auth.users WHERE id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003'
);
DELETE FROM conference_targets WHERE conference_id IN (
  'cc000000-0000-0000-0000-000000000001',
  'cc000000-0000-0000-0000-000000000002'
);
DELETE FROM conference_conferences WHERE id IN (
  'cc000000-0000-0000-0000-000000000001',
  'cc000000-0000-0000-0000-000000000002'
);

-- ============================================================
-- 1. Demo auth users (service role required)
-- ============================================================
INSERT INTO auth.users (id, email, role, aud, created_at, updated_at, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'sophie.martin@confhunter.demo', 'authenticated', 'authenticated',
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('a1000000-0000-0000-0000-000000000002', 'alex.chen@confhunter.demo', 'authenticated', 'authenticated',
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('a1000000-0000-0000-0000-000000000003', 'marc.dubois@confhunter.demo', 'authenticated', 'authenticated',
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');

-- ============================================================
-- 2. Profiles
-- ============================================================
INSERT INTO conference_profiles (id, name, email, role, lifetime_score)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Sophie Martin', 'sophie.martin@confhunter.demo', 'rep', 420),
  ('a1000000-0000-0000-0000-000000000002', 'Alex Chen', 'alex.chen@confhunter.demo', 'rep', 280),
  ('a1000000-0000-0000-0000-000000000003', 'Marc Dubois', 'marc.dubois@confhunter.demo', 'admin', 155);

-- ============================================================
-- 3. Conferences
-- ============================================================
INSERT INTO conference_conferences (id, name, location, start_date, end_date, status, created_by)
VALUES
  ('cc000000-0000-0000-0000-000000000001', 'Pollutec 2025', 'Lyon, France', '2025-12-02', '2025-12-05', 'upcoming',
   'a1000000-0000-0000-0000-000000000001'),
  ('cc000000-0000-0000-0000-000000000002', 'Waste Expo 2025', 'Las Vegas, USA', '2025-05-06', '2025-05-08', 'completed',
   'a1000000-0000-0000-0000-000000000001');

-- ============================================================
-- 4. Targets — Pollutec 2025
-- ============================================================
INSERT INTO conference_targets (id, conference_id, first_name, last_name, company, role, priority, pre_notes)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000001', 'Jean-Luc', 'Moreau', 'Veolia Environnement', 'VP Industrial Sales', 'must_meet', 'Key account — €2M contract renewal'),
  ('b1000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000001', 'Ingrid', 'Sorensen', 'TOMRA Systems', 'Global BD Director', 'must_meet', 'Partnership opportunity on reverse vending'),
  ('b1000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000001', 'Karim', 'Benali', 'Suez Group', 'Head of Innovation', 'must_meet', 'Exploring co-development on sorting AI'),
  ('b1000000-0000-0000-0000-000000000004', 'cc000000-0000-0000-0000-000000000001', 'Elisa', 'Fontaine', 'ADEME', 'Programme Director', 'must_meet', 'Funding body — critical contact for grants'),
  ('b1000000-0000-0000-0000-000000000005', 'cc000000-0000-0000-0000-000000000001', 'Thomas', 'Richter', 'REMONDIS', 'Sales Manager EMEA', 'should_meet', NULL),
  ('b1000000-0000-0000-0000-000000000006', 'cc000000-0000-0000-0000-000000000001', 'Amara', 'Diallo', 'Plastic Omnium', 'Strategic Partnerships', 'should_meet', NULL),
  ('b1000000-0000-0000-0000-000000000007', 'cc000000-0000-0000-0000-000000000001', 'Nina', 'Kovac', 'Biffa', 'Commercial Director', 'should_meet', 'Expanding to EU'),
  ('b1000000-0000-0000-0000-000000000008', 'cc000000-0000-0000-0000-000000000001', 'Julien', 'Perret', 'Ecomaison', 'Operations Lead', 'should_meet', NULL),
  ('b1000000-0000-0000-0000-000000000009', 'cc000000-0000-0000-0000-000000000001', 'Fatima', 'El Amrani', 'Eco-Emballages', 'Key Account Manager', 'should_meet', NULL),
  ('b1000000-0000-0000-0000-000000000010', 'cc000000-0000-0000-0000-000000000001', 'Samuel', 'Osei', 'CleanEarth Robotics', 'CTO', 'nice_to_have', 'Startup building waste-sorting robots'),
  ('b1000000-0000-0000-0000-000000000011', 'cc000000-0000-0000-0000-000000000001', 'Clara', 'Vidal', 'Renewi', 'Product Manager', 'nice_to_have', NULL),
  ('b1000000-0000-0000-0000-000000000012', 'cc000000-0000-0000-0000-000000000001', 'Romain', 'Lefevre', 'BioAtlas', 'CEO', 'nice_to_have', 'Biogas startup — early stage');

-- ============================================================
-- 4b. Targets — Waste Expo 2025
-- ============================================================
INSERT INTO conference_targets (id, conference_id, first_name, last_name, company, role, priority, pre_notes)
VALUES
  ('b2000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000002', 'David', 'Kim', 'Republic Services', 'VP Partnerships', 'must_meet', NULL),
  ('b2000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000002', 'Maria', 'Santos', 'Waste Connections', 'BD Director', 'must_meet', NULL),
  ('b2000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000002', 'James', 'Wright', 'GFL Environmental', 'SVP Sales', 'must_meet', NULL),
  ('b2000000-0000-0000-0000-000000000004', 'cc000000-0000-0000-0000-000000000002', 'Lisa', 'Thompson', 'Casella Waste', 'COO', 'should_meet', NULL),
  ('b2000000-0000-0000-0000-000000000005', 'cc000000-0000-0000-0000-000000000002', 'Robert', 'Garcia', 'Advanced Disposal', 'CTO', 'should_meet', NULL),
  ('b2000000-0000-0000-0000-000000000006', 'cc000000-0000-0000-0000-000000000002', 'Kevin', 'Park', 'Rubicon Technologies', 'Head of Growth', 'nice_to_have', NULL);

-- ============================================================
-- 5. Interactions — Waste Expo (completed)
-- ============================================================
INSERT INTO conference_interactions (id, target_id, user_id, status, notes, score, met_at)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'met', 'Great conversation, demoed the product. Very interested in Q3 pilot.', 45, '2025-05-06T10:30:00Z'),
  ('e1000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'met', 'Warm intro worked. She wants a proposal by end of month.', 40, '2025-05-07T14:00:00Z'),
  ('e1000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'met', 'Quick chat at booth. Follow-up call booked.', 38, '2025-05-08T09:00:00Z'),
  ('e1000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'met', 'Lunch meeting — potential 6-month contract.', 30, '2025-05-07T12:00:00Z'),
  ('e1000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'met', 'Co-pitched with Sophie. He was impressed.', 40, '2025-05-06T11:00:00Z'),
  ('e1000000-0000-0000-0000-000000000006', 'b2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'met', 'Technical deep-dive on sorting algo.', 35, '2025-05-08T09:30:00Z'),
  ('e1000000-0000-0000-0000-000000000007', 'b2000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'met', 'Rubicon exploring API integration.', 20, '2025-05-07T16:00:00Z'),
  ('e1000000-0000-0000-0000-000000000008', 'b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'met', 'Maria is a strong advocate. Intro to her CTO next week.', 38, '2025-05-07T15:00:00Z');
