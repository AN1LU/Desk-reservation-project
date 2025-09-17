import sqlite3

# Conexión a la base de datos
con = sqlite3.connect("C:\\Users\\Sarai\\OneDrive\\Desktop\\sarai\\PROYECTO.db")

# Activar claves foráneas
con.execute("PRAGMA foreign_keys = ON;")

# ----------------------
# Tabla Grupos
# ----------------------
con.execute('''
    CREATE TABLE IF NOT EXISTS Grupos (
        id_grupo INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        tipo_grupo TEXT CHECK(tipo_grupo IN ('empresa','equipo','otro')),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
''')

# ----------------------
# Tabla Usuarios
# ----------------------
con.execute('''
    CREATE TABLE IF NOT EXISTS Usuarios (
        id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        contraseña VARCHAR(100) NOT NULL,
        tipo_usuario TEXT CHECK(tipo_usuario IN ('cliente','empresa','admin')) NOT NULL,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        id_grupo INTEGER,
        FOREIGN KEY (id_grupo) REFERENCES Grupos(id_grupo) ON DELETE SET NULL
    );
''')

# ----------------------
# Tabla Membresías
# ----------------------
con.execute('''
    CREATE TABLE IF NOT EXISTS Membresias (
        id_membresia INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER NOT NULL,
        tipo_membresia TEXT CHECK(tipo_membresia IN ('mensual','evento','corporativa')) NOT NULL,
        fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_fin TIMESTAMP,
        beneficios TEXT,
        FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
    );
''')

# ----------------------
# Tabla Espacios
# ----------------------
con.execute('''
    CREATE TABLE IF NOT EXISTS Espacios (
        id_espacio INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre VARCHAR(100) NOT NULL,
        tipo_espacio TEXT CHECK(tipo_espacio IN ('escritorio','sala','cabina')) NOT NULL,
        capacidad INTEGER NOT NULL,
        precio_por_hora NUMERIC(10,2) NOT NULL,
        estado TEXT CHECK(estado IN ('disponible','ocupado','mantenimiento')) NOT NULL
    );
''')

# ----------------------
# Tabla Reservas
# ----------------------
con.execute('''
    CREATE TABLE IF NOT EXISTS Reservas (
        id_reserva INTEGER PRIMARY KEY AUTOINCREMENT,
        id_espacio INTEGER NOT NULL,
        fecha_inicio TIMESTAMP NOT NULL,
        fecha_fin TIMESTAMP NOT NULL,
        estado_reserva TEXT CHECK(estado_reserva IN ('pendiente','confirmada','cancelada','finalizada')) NOT NULL,
        codigo_qr VARCHAR(255),
        precio_total NUMERIC(10,2) NOT NULL,
        FOREIGN KEY (id_espacio) REFERENCES Espacios(id_espacio) ON DELETE CASCADE
    );
''')

# ----------------------
# Tabla Pagos
# ----------------------
con.execute('''
    CREATE TABLE IF NOT EXISTS Pagos (
        id_pago INTEGER PRIMARY KEY AUTOINCREMENT,
        id_reserva INTEGER NOT NULL,
        metodo_pago TEXT CHECK(metodo_pago IN ('paypal')) NOT NULL,
        monto NUMERIC(10,2) NOT NULL,
        fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        estado_pago TEXT CHECK(estado_pago IN ('pendiente','completado','fallido')) NOT NULL,
        FOREIGN KEY (id_reserva) REFERENCES Reservas(id_reserva) ON DELETE CASCADE
    );
''')

# ----------------------
# Tabla Mapa de Espacios
# ----------------------
con.execute('''
    CREATE TABLE IF NOT EXISTS MapaEspacios (
        id_mapa INTEGER PRIMARY KEY AUTOINCREMENT,
        id_espacio INTEGER NOT NULL,
        FOREIGN KEY (id_espacio) REFERENCES Espacios(id_espacio) ON DELETE CASCADE
    );
''')

# ----------------------
# Tabla Usuarios_Reservas (reservas conjuntas)
# ----------------------
con.execute('''
    CREATE TABLE IF NOT EXISTS Usuarios_Reservas (
        id_usuario INTEGER NOT NULL,
        id_reserva INTEGER NOT NULL,
        rol_en_reserva TEXT CHECK(rol_en_reserva IN ('organizador','invitado')) NOT NULL,
        PRIMARY KEY (id_usuario, id_reserva),
        FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (id_reserva) REFERENCES Reservas(id_reserva) ON DELETE CASCADE
    );
''')

# Guardar cambios y cerrar conexión
con.commit()
con.close()

print("Todas las tablas creadas con éxito")