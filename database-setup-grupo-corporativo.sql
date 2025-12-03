-- Tabla para invitaciones a grupos corporativos
CREATE TABLE IF NOT EXISTS invitaciones_grupo (
  id_invitacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_grupo INTEGER REFERENCES grupos(id_grupo) ON DELETE CASCADE,
  email_invitado TEXT NOT NULL,
  nombre_invitado TEXT,
  email_invitador TEXT NOT NULL,
  fecha_invitacion TIMESTAMPTZ DEFAULT NOW(),
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'rechazada')),
  fecha_respuesta TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_invitaciones_email ON invitaciones_grupo(email_invitado);
CREATE INDEX IF NOT EXISTS idx_invitaciones_grupo ON invitaciones_grupo(id_grupo);
CREATE INDEX IF NOT EXISTS idx_invitaciones_estado ON invitaciones_grupo(estado);

-- Habilitar Row Level Security
ALTER TABLE invitaciones_grupo ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver invitaciones donde son el invitador
CREATE POLICY "Ver propias invitaciones como invitador"
ON invitaciones_grupo
FOR SELECT
USING (auth.email() = email_invitador);

-- Política: Los usuarios pueden ver invitaciones dirigidas a su email
CREATE POLICY "Ver invitaciones recibidas"
ON invitaciones_grupo
FOR SELECT
USING (auth.email() = email_invitado);

-- Política: Los usuarios pueden crear invitaciones
CREATE POLICY "Crear invitaciones"
ON invitaciones_grupo
FOR INSERT
WITH CHECK (auth.email() = email_invitador);

-- Política: Los usuarios pueden actualizar invitaciones que les fueron enviadas
CREATE POLICY "Actualizar invitaciones recibidas"
ON invitaciones_grupo
FOR UPDATE
USING (auth.email() = email_invitado);

-- Comentarios para documentación
COMMENT ON TABLE invitaciones_grupo IS 'Almacena las invitaciones para unirse a grupos corporativos';
COMMENT ON COLUMN invitaciones_grupo.estado IS 'Estado de la invitación: pendiente, aceptada, rechazada';
