CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_companie_id uuid := NULLIF(NEW.raw_user_meta_data->>'companie_id', '')::uuid;
  v_funcao text := COALESCE(NEW.raw_user_meta_data->>'funcao_user', NULL);
  v_avatar text := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );
BEGIN
  INSERT INTO public.users (id, email, nome, status, funcao_user, companie_id, foto_perfil)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    'Ativo'::enum_status_user,
    COALESCE(v_funcao, 'OWNER')::enum_tipo_user,
    v_companie_id,
    v_avatar
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
