// Antes
selectQuery: '*, socio_titulares(localidad)'

// Ahora (especificando la columna 'dni' como llave foránea)
selectQuery: '*, socio_titulares!dni(localidad)'
