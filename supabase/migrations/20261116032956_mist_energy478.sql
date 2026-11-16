BEGIN;
SET LOCAL lock_timeout='3s';
ALTER TABLE public.mist_players465 DROP CONSTRAINT mist_players465_energy_check;
ALTER TABLE public.mist_players465 ADD CONSTRAINT mist_players465_energy_check CHECK (energy BETWEEN 0 AND 20);
ALTER TABLE public.mist_players465 ALTER COLUMN energy SET DEFAULT 20;
COMMIT;
