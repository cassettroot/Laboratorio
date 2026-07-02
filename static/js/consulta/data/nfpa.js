const NFPA_DATA = [
    {
        color: "Azul",
        quad: "blue",
        levels: [
            {
                level: 0,
                label: "Sin riesgo",
                desc: "No representa un riesgo significativo para la salud.",
            },
            {
                level: 1,
                label: "Ligero",
                desc: "Exposicion breve puede causar irritacion leve. Ej: acetona.",
            },
            {
                level: 2,
                label: "Moderado",
                desc: "Exposicion intensa o continua puede causar incapacidad temporal o danos residuales. Ej: cloroformo.",
            },
            {
                level: 3,
                label: "Severo",
                desc: "Exposicion breve puede causar danos graves temporales o residuales. Ej: acido clorhidrico.",
            },
            {
                level: 4,
                label: "Extremo",
                desc: "Exposicion muy breve puede causar la muerte o danos permanentes. Ej: acido fluorhidrico.",
            },
        ],
    },
    {
        color: "Rojo",
        quad: "red",
        levels: [
            { level: 0, label: "No inflamable", desc: "No se quema. Ej: agua." },
            {
                level: 1,
                label: "Ligeramente inflamable",
                desc: "Requiere precalentamiento para ignition. Punto de inflamacion > 93 C. Ej: aceite mineral.",
            },
            {
                level: 2,
                label: "Moderadamente inflamable",
                desc: "Se inflama con calor moderado. Punto de inflamacion entre 38 C y 93 C. Ej: diesel.",
            },
            {
                level: 3,
                label: "Altamente inflamable",
                desc: "Se inflama a temperatura ambiente. Punto de inflamacion entre 23 C y 38 C. Ej: etanol.",
            },
            {
                level: 4,
                label: "Extremadamente inflamable",
                desc: "Se inflama facilmente a temperatura ambiente. Punto de inflamacion < 23 C. Ej: eter dietilico.",
            },
        ],
    },
    {
        color: "Amarillo",
        quad: "yellow",
        levels: [
            {
                level: 0,
                label: "Estable",
                desc: "Normalmente estable. No reacciona con agua. Ej: nitrogeno.",
            },
            {
                level: 1,
                label: "Inestable si se calienta",
                desc: "Normalmente estable pero puede volverse inestable a temperaturas elevadas. Ej: acido acetico.",
            },
            {
                level: 2,
                label: "Reaccion violenta",
                desc: "Puede sufrir cambio quimico violento a temperatura y presion elevadas. Ej: acido nitrico.",
            },
            {
                level: 3,
                label: "Peligro de explosion",
                desc: "Puede explotar por choque o calor intenso. Ej: peroxido de benzoilo.",
            },
            {
                level: 4,
                label: "Puede explotar facilmente",
                desc: "Material extremadamente sensible a calor o impacto. Ej: nitroglicerina.",
            },
        ],
    },
    {
        color: "Blanco",
        quad: "white",
        levels: [
            {
                level: "W",
                label: "Reacciona con agua",
                desc: "Reacciona violentamente con agua liberando gases inflamables o toxicos.",
            },
            {
                level: "OX",
                label: "Oxidante",
                desc: "Puede provocar combustion en materiales combustibles sin fuente de ignicion externa.",
            },
            {
                level: "SA",
                label: "Gas asfixiante simple",
                desc: "Desplaza el oxigeno en espacios cerrados.",
            },
            {
                level: "COR",
                label: "Corrosivo",
                desc: "Causa danos a piel, ojos o metales.",
            },
            {
                level: "ACID",
                label: "Acido fuerte",
                desc: "Puede causar quemaduras quimicas graves.",
            },
            {
                level: "ALK",
                label: "Base fuerte",
                desc: "Puede causar quemaduras quimicas graves.",
            },
        ],
    },
];
