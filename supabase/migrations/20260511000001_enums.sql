-- Migration 001: Custom Enum Types
-- Must be created before tables that reference them.

CREATE TYPE user_role AS ENUM ('renter', 'owner', 'admin');

CREATE TYPE property_type AS ENUM ('room', 'flat', 'home', 'pg', 'hostel', 'commercial');

CREATE TYPE furnished_status AS ENUM ('furnished', 'semi_furnished', 'unfurnished');

CREATE TYPE electricity_charges_type AS ENUM ('included', 'extra', 'fixed');

CREATE TYPE gender_allowed AS ENUM ('boys', 'girls', 'both');

CREATE TYPE room_type AS ENUM ('1_seater', '2_seater', '3_seater');

CREATE TYPE media_type AS ENUM ('image', 'video');

CREATE TYPE subscription_plan AS ENUM ('monthly', 'quarterly', 'yearly');

CREATE TYPE contact_via AS ENUM ('whatsapp', 'call', 'chat');

CREATE TYPE notification_type AS ENUM ('inquiry', 'approval', 'rejection', 'subscription', 'general');
