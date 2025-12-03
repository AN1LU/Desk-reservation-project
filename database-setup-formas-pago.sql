-- Script SQL para crear la tabla de formas de pago en Supabase
-- Ejecuta este script en el SQL Editor de Supabase

-- Crear la tabla formas_pago
CREATE TABLE IF NOT EXISTS public.formas_pago (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'tarjeta',
    nombre_titular TEXT NOT NULL,
    ultimos_4_digitos TEXT NOT NULL,
    tipo_tarjeta TEXT NOT NULL CHECK (tipo_tarjeta IN ('visa', 'mastercard', 'amex')),
    mes_expiracion TEXT NOT NULL,
    anio_expiracion TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_ultimos_4_digitos CHECK (LENGTH(ultimos_4_digitos) = 4),
    CONSTRAINT check_mes_expiracion CHECK (mes_expiracion ~ '^(0[1-9]|1[0-2])$'),
    CONSTRAINT check_anio_expiracion CHECK (LENGTH(anio_expiracion) = 2)
);

-- Crear índice para mejorar las consultas por usuario
CREATE INDEX IF NOT EXISTS idx_formas_pago_usuario_id ON public.formas_pago(usuario_id);

-- Crear índice para formas de pago predeterminadas
CREATE INDEX IF NOT EXISTS idx_formas_pago_default ON public.formas_pago(usuario_id, is_default);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.formas_pago ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo puedan ver sus propias formas de pago
CREATE POLICY "Los usuarios pueden ver sus propias formas de pago"
    ON public.formas_pago
    FOR SELECT
    USING (auth.uid() = usuario_id);

-- Política para que los usuarios puedan insertar sus propias formas de pago
CREATE POLICY "Los usuarios pueden insertar sus propias formas de pago"
    ON public.formas_pago
    FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

-- Política para que los usuarios puedan actualizar sus propias formas de pago
CREATE POLICY "Los usuarios pueden actualizar sus propias formas de pago"
    ON public.formas_pago
    FOR UPDATE
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- Política para que los usuarios puedan eliminar sus propias formas de pago
CREATE POLICY "Los usuarios pueden eliminar sus propias formas de pago"
    ON public.formas_pago
    FOR DELETE
    USING (auth.uid() = usuario_id);

-- Función para asegurar que solo una forma de pago sea predeterminada por usuario
CREATE OR REPLACE FUNCTION public.ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la nueva forma de pago es predeterminada, desmarcar las demás
    IF NEW.is_default = TRUE THEN
        UPDATE public.formas_pago
        SET is_default = FALSE
        WHERE usuario_id = NEW.usuario_id
          AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para ejecutar la función antes de insertar o actualizar
CREATE TRIGGER trigger_ensure_single_default_payment_method
    BEFORE INSERT OR UPDATE ON public.formas_pago
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_single_default_payment_method();

-- Comentarios para documentar la tabla
COMMENT ON TABLE public.formas_pago IS 'Tabla para almacenar las formas de pago (tarjetas) de los usuarios';
COMMENT ON COLUMN public.formas_pago.id IS 'Identificador único de la forma de pago';
COMMENT ON COLUMN public.formas_pago.usuario_id IS 'ID del usuario propietario de la forma de pago';
COMMENT ON COLUMN public.formas_pago.tipo IS 'Tipo de forma de pago (por ahora solo tarjeta)';
COMMENT ON COLUMN public.formas_pago.nombre_titular IS 'Nombre del titular como aparece en la tarjeta';
COMMENT ON COLUMN public.formas_pago.ultimos_4_digitos IS 'Últimos 4 dígitos de la tarjeta (para identificación)';
COMMENT ON COLUMN public.formas_pago.tipo_tarjeta IS 'Tipo de tarjeta (visa, mastercard, amex)';
COMMENT ON COLUMN public.formas_pago.mes_expiracion IS 'Mes de expiración (formato MM)';
COMMENT ON COLUMN public.formas_pago.anio_expiracion IS 'Año de expiración (formato AA)';
COMMENT ON COLUMN public.formas_pago.is_default IS 'Indica si esta es la forma de pago predeterminada del usuario';
COMMENT ON COLUMN public.formas_pago.fecha_creacion IS 'Fecha y hora en que se agregó la forma de pago';
