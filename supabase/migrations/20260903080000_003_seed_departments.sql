-- Seed departments for AHG Weekly Planning System
-- Insert main department options used in the registration dropdown

INSERT INTO departments (name)
VALUES
  ('Chief Finance Admin'),
  ('Chief Business Admin'),
  ('Chief CRE'),
  ('Chief CEO Office'),
  ('Corporate Billet Admin'),
  ('Corporate Agri Economy'),
  ('Corporate PR & Property Admin'),
  ('Corporate Social Economy & Services')
ON CONFLICT (name) DO NOTHING;

-- Optional: seed some common sub-departments (uncomment if desired)
-- INSERT INTO departments (name) VALUES
--   ('Finance Institution'),
--   ('Fund Raising'),
--   ('Branding'),
--   ('Marketing'),
--   ('Sales'),
--   ('Data Management')
-- ON CONFLICT (name) DO NOTHING;
