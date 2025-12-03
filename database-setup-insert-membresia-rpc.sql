-- Función RPC para insertar membresía (con soporte para grupos corporativos)
-- Primero eliminar la función si existe para recrearla
DROP FUNCTION IF EXISTS insert_membresia(TEXT, TEXT, TEXT);

-- Crear la función actualizada
CREATE OR REPLACE FUNCTION insert_membresia(
  p_tipo TEXT,
  p_beneficios TEXT,
  p_grupo_nombre TEXT DEFAULT NULL
)
RETURNS TABLE(id_membresia INTEGER, id_grupo INTEGER) AS $$
DECLARE
  v_id_membresia INTEGER;
  v_id_grupo INTEGER := NULL;
  v_user_id UUID;
  v_fecha_inicio TIMESTAMPTZ := NOW();
  v_fecha_fin TIMESTAMPTZ := NOW() + INTERVAL '30 days';
BEGIN
  -- Obtener el ID del usuario autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Si es membresía corporativa, crear o encontrar el grupo
  IF LOWER(p_tipo) = 'corporativa' THEN
    IF p_grupo_nombre IS NULL OR TRIM(p_grupo_nombre) = '' THEN
      RAISE EXCEPTION 'El nombre del grupo es requerido para membresías corporativas';
    END IF;

    -- Buscar si ya existe el grupo
    SELECT id_grupo INTO v_id_grupo
    FROM grupos
    WHERE LOWER(nombre) = LOWER(TRIM(p_grupo_nombre))
    LIMIT 1;

    -- Si no existe, crear el grupo
    IF v_id_grupo IS NULL THEN
      INSERT INTO grupos (nombre, descripcion, fecha_creacion)
      VALUES (
        TRIM(p_grupo_nombre),
        'Grupo corporativo creado automáticamente',
        NOW()
      )
      RETURNING grupos.id_grupo INTO v_id_grupo;
    END IF;
  END IF;

  -- Insertar la membresía
  INSERT INTO membresias (
    tipo_membresia,
    beneficios,
    fecha_inicio,
    fecha_fin,
    id_usuario_uuid,
    id_grupo
  )
  VALUES (
    p_tipo,
    p_beneficios,
    v_fecha_inicio,
    v_fecha_fin,
    v_user_id,
    v_id_grupo
  )
  RETURNING membresias.id INTO v_id_membresia;

  -- Retornar ambos IDs
  RETURN QUERY SELECT v_id_membresia, v_id_grupo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION insert_membresia(TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION insert_membresia IS 'Inserta una nueva membresía y crea un grupo corporativo si es necesario';
