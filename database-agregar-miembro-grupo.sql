-- Función RPC para agregar un miembro al grupo con membresía Premium automática
CREATE OR REPLACE FUNCTION agregar_miembro_grupo(
  p_email TEXT,
  p_nombre TEXT,
  p_id_grupo INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_id_membresia INTEGER;
  v_fecha_fin_grupo TIMESTAMPTZ;
BEGIN
  -- Buscar el usuario por email en auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = LOWER(TRIM(p_email))
  LIMIT 1;
  
  -- Si el usuario no existe, retornar error
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'El usuario con email % no está registrado en el sistema. Debe registrarse primero.', p_email;
  END IF;
  
  -- Verificar si el usuario ya tiene una membresía en este grupo
  IF EXISTS (
    SELECT 1 FROM membresias 
    WHERE id_usuario_uuid = v_user_id 
    AND id_grupo = p_id_grupo
  ) THEN
    RAISE EXCEPTION 'El usuario ya es miembro de este grupo';
  END IF;
  
  -- Obtener la fecha de expiración de la membresía corporativa del grupo
  SELECT fecha_fin INTO v_fecha_fin_grupo
  FROM membresias
  WHERE id_grupo = p_id_grupo
  AND LOWER(tipo_membresia) = 'corporativa'
  LIMIT 1;
  
  -- Si no se encuentra la membresía corporativa del grupo, usar 30 días por defecto
  IF v_fecha_fin_grupo IS NULL THEN
    v_fecha_fin_grupo := NOW() + INTERVAL '30 days';
  END IF;
  
  -- Crear membresía Premium para el nuevo miembro con la misma fecha de expiración
  INSERT INTO membresias (
    tipo_membresia,
    beneficios,
    fecha_inicio,
    fecha_fin,
    id_usuario_uuid,
    id_grupo
  )
  VALUES (
    'premium',
    'Miembro del grupo corporativo - Reservas ilimitadas, Acceso prioritario, Soporte dedicado',
    NOW(),
    v_fecha_fin_grupo,
    v_user_id,
    p_id_grupo
  )
  RETURNING id_membresia INTO v_id_membresia;
  
  RETURN json_build_object(
    'success', true,
    'id_membresia', v_id_membresia,
    'usuario_id', v_user_id,
    'mensaje', 'Miembro agregado exitosamente con membresía Premium'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION agregar_miembro_grupo(TEXT, TEXT, INTEGER) TO authenticated;

COMMENT ON FUNCTION agregar_miembro_grupo IS 'Agrega un usuario existente al grupo corporativo con membresía Premium que expira al mismo tiempo que la membresía corporativa del grupo';
