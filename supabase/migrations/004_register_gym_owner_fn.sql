-- Registration function: creates gym + admin user + default packages atomically.
-- Uses SECURITY DEFINER so it runs as postgres, bypassing RLS for the inserts.
-- auth.uid() is read from the session JWT claims set by PostgREST/Supabase gateway.

CREATE OR REPLACE FUNCTION public.register_gym_owner(
  p_gym_name   TEXT,
  p_gym_logo   TEXT,
  p_owner_name TEXT,
  p_phone      TEXT,
  p_email      TEXT,
  p_address    TEXT,
  p_payment_qr TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id UUID;
  v_gym_id  UUID;
  v_gym     JSON;
  v_user    JSON;
BEGIN
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO gyms (gym_name, gym_logo, owner_name, phone, email, address, payment_qr)
  VALUES (p_gym_name, p_gym_logo, p_owner_name, p_phone, p_email, p_address, p_payment_qr)
  RETURNING id INTO v_gym_id;

  INSERT INTO users (auth_id, gym_id, name, email, phone, role, is_active)
  VALUES (v_auth_id, v_gym_id, p_owner_name, p_email, p_phone, 'Admin', true);

  PERFORM create_default_packages(v_gym_id);

  SELECT row_to_json(g) INTO v_gym FROM gyms g WHERE g.id = v_gym_id;
  SELECT row_to_json(u) INTO v_user FROM users u
    WHERE u.auth_id = v_auth_id AND u.gym_id = v_gym_id;

  RETURN json_build_object('gym', v_gym, 'user', v_user);

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Email already registered';
END;
$$;
