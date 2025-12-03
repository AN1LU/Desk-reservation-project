# Configuración: Agregar Miembros a Grupo Corporativo

## Descripción
Esta función RPC permite agregar automáticamente miembros a un grupo corporativo, creándoles una **membresía Premium** que expira al mismo tiempo que la membresía corporativa del grupo.

## Pasos de Instalación

### 1. Ejecutar el Script SQL

1. Ve a Supabase Dashboard → SQL Editor
2. Crea una nueva query
3. Copia y pega el contenido del archivo `database-agregar-miembro-grupo.sql`
4. Ejecuta el script (botón "Run" o `Ctrl+Enter`)

### 2. Verificar la Instalación

Ejecuta esta consulta para verificar que la función fue creada:

```sql
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'agregar_miembro_grupo';
```

Deberías ver una fila con el nombre de la función.

## Cómo Funciona

### Flujo Completo:

1. **Admin compra membresía corporativa** ($100/mes)
   - Se crea un registro en `grupos` con el nombre del grupo
   - Se crea una membresía con `tipo_membresia = 'corporativa'` vinculada al grupo

2. **Admin accede a "👥 Administrar Grupo"**
   - Botón naranja en la página Home (solo visible para admins corporativos)

3. **Admin agrega miembro al grupo**
   - Ingresa email y nombre del usuario
   - **IMPORTANTE**: El usuario debe estar registrado en la plataforma primero
   - El sistema automáticamente:
     - Busca al usuario en `auth.users` por su email
     - Obtiene la fecha de expiración de la membresía corporativa del grupo
     - Crea una membresía Premium para el nuevo miembro con:
       - `tipo_membresia = 'premium'`
       - `fecha_fin` = misma fecha que la membresía corporativa
       - `id_grupo` = ID del grupo corporativo
       - Beneficios: "Miembro del grupo corporativo - Reservas ilimitadas, Acceso prioritario, Soporte dedicado"

4. **El nuevo miembro puede usar inmediatamente**:
   - Acceso a todas las funciones Premium
   - Reservas ilimitadas
   - La membresía expira cuando expire la corporativa del grupo

## Características de Seguridad

### Validaciones Implementadas:

✅ **Usuario debe estar registrado**: Si el email no existe en `auth.users`, la función retorna error  
✅ **Sin duplicados**: Si el usuario ya tiene una membresía en el grupo, se rechaza  
✅ **Sincronización de fechas**: La membresía Premium siempre expira junto con la corporativa  
✅ **Seguridad**: La función usa `SECURITY DEFINER` y está protegida con RLS  

### Mensajes de Error:

- `"El usuario con email X no está registrado en el sistema. Debe registrarse primero."`
- `"El usuario ya es miembro de este grupo"`

## Ejemplo de Uso

### Desde la UI:
1. Login como admin corporativo
2. Ir a Home → Click "👥 Administrar Grupo"
3. Ingresar email: `usuario@ejemplo.com`
4. Ingresar nombre: `Juan Pérez`
5. Click "Agregar Miembro"
6. ✓ Mensaje: "Miembro agregado exitosamente con membresía Premium"

### Desde SQL (para testing):
```sql
SELECT agregar_miembro_grupo(
  'usuario@ejemplo.com',
  'Juan Pérez',
  1  -- ID del grupo
);
```

## Notas Importantes

⚠️ **El usuario debe registrarse primero**: No se crean cuentas automáticamente. El usuario debe existir en `auth.users`.

⚠️ **Una sola membresía por grupo**: Cada usuario solo puede tener una membresía activa por grupo corporativo.

✨ **Membresías sincronizadas**: Todas las membresías Premium del grupo expiran al mismo tiempo que la corporativa, asegurando consistencia.

## Troubleshooting

### Error: "El usuario no está registrado"
**Solución**: El usuario debe crear una cuenta en la plataforma primero (página /register).

### Error: "Ya es miembro de este grupo"
**Solución**: El usuario ya tiene una membresía activa. Verifica en la lista de miembros.

### La función no existe
**Solución**: Ejecuta el script SQL `database-agregar-miembro-grupo.sql` en Supabase.
