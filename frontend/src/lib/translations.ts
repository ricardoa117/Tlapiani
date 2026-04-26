// Traducciones básicas: Español / Náhuatl
// Se usa con: t[idioma]['clave']

export const translations = {
    es: {
        bienvenido: 'Bienvenido',
        iniciarSesion: 'Iniciar sesión',
        cerrarSesion: 'Cerrar sesión',
        misDatos: 'Mis datos',
        misCultivos: 'Mis cultivos',
        instructivo: 'Instructivo',
        cargando: 'Cargando...',
        folio: 'Folio',
        contrasena: 'Contraseña',
        nombre: 'Nombre',
        municipio: 'Municipio',
        estado: 'Estado',
        cultivo: 'Cultivo',
        alerta: 'Alerta',
        sinDatos: 'Sin datos',
        verde: 'Bien',
        amarillo: 'Atención',
        rojo: 'Alerta',
    },
    nah: {
        bienvenido: 'Xitlahpalo',
        iniciarSesion: 'Tiyaz ipan',
        cerrarSesion: 'Xiquitztimani',
        misDatos: 'Notlalia',
        misCultivos: 'Notlalmilpa',
        instructivo: 'Tlapoualistli',
        cargando: 'Mopohpoloa...',
        folio: 'Noamatlatlapal',
        contrasena: 'Tozquitl',
        nombre: 'Notoca',
        municipio: 'Naltepetzin',
        estado: 'Notlalpan',
        cultivo: 'Tlaoli',
        alerta: 'Tlahtoa',
        sinDatos: 'Ayac ihtoa',
        verde: 'Cualtzin',
        amarillo: 'Xiuhpotzin',
        rojo: 'Tlahtoa',
    },
} as const

export type Idioma = keyof typeof translations
export type ClaveTraduccion = keyof typeof translations['es']

export function t(idioma: Idioma, clave: ClaveTraduccion): string {
    return translations[idioma][clave] ?? clave
}
