-- Fully reverts 20261011120000_protect_privileged_columns.sql
DROP TRIGGER IF EXISTS protect_profiles_privileged_columns ON public.profiles;
DROP TRIGGER IF EXISTS protect_organizations_privileged_columns ON public.organizations;
DROP TRIGGER IF EXISTS protect_emissions_verification_columns ON public.emissions;
DROP TRIGGER IF EXISTS protect_carbon_verification_columns ON public.carbon_verifications;
DROP TRIGGER IF EXISTS protect_monetization_pathway_columns ON public.monetization_pathways;

DROP FUNCTION IF EXISTS public.protect_profiles_privileged_columns();
DROP FUNCTION IF EXISTS public.protect_organizations_privileged_columns();
DROP FUNCTION IF EXISTS public.protect_emissions_verification_columns();
DROP FUNCTION IF EXISTS public.protect_carbon_verification_columns();
DROP FUNCTION IF EXISTS public.protect_monetization_pathway_columns();
DROP FUNCTION IF EXISTS public.is_trusted_db_writer();
