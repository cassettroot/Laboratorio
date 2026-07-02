const GHS_PICTOGRAMS = [
    {
        id: "toxic",
        title: "Toxicidad aguda",
        meaning:
            "Puede causar intoxicaciones graves o incluso la muerte con pequenas cantidades.",
        examples: ["Cianuros", "Metanol", "Arsenico"],
        recommendations: [
            "Usar guantes",
            "Evitar inhalacion",
            "Trabajar bajo campana",
        ],
    },
    {
        id: "flammable",
        title: "Inflamable",
        meaning:
            "Puede incendiarse facilmente en contacto con fuentes de ignicion.",
        examples: ["Etanol", "Acetona", "Hexano"],
        recommendations: [
            "Alejar de fuentes de calor",
            "No fumar",
            "Mantener cerrado",
        ],
    },
    {
        id: "oxidizer",
        title: "Comburente / Oxidante",
        meaning:
            "Puede provocar o agravar incendios y explosiones en presencia de materiales combustibles.",
        examples: [
            "Peroxido de hidrogeno",
            "Nitrato de potasio",
            "Acido nitrico concentrado",
        ],
        recommendations: [
            "Alejar de materiales combustibles",
            "Almacenar en lugar fresco",
            "No mezclar con reductores",
        ],
    },
    {
        id: "corrosive",
        title: "Corrosivo",
        meaning: "Puede destruir tejidos vivos y materiales al contacto.",
        examples: ["Acido sulfurico", "Hidroxido de sodio", "Hipoclorito de sodio"],
        recommendations: [
            "Usar guantes y gafas",
            "Mantener en envases adecuados",
            "Trabajar con ventilacion",
        ],
    },
    {
        id: "acute",
        title: "Peligro para la salud / Irritante",
        meaning:
            "Puede causar irritacion en piel, ojos o vias respiratorias, o efectos nocivos por ingestion.",
        examples: ["Cloroformo", "Amoniaco diluido", "Formaldehido"],
        recommendations: [
            "Evitar contacto con piel y ojos",
            "Usar mascarilla",
            "Lavar manos despues de usar",
        ],
    },
    {
        id: "health",
        title: "Peligro grave para la salud",
        meaning:
            "Puede causar danos permanentes a la salud, cancer, mutagenicidad o toxicidad reproductiva.",
        examples: ["Benceno", "Cromo hexavalente", "Amianto"],
        recommendations: [
            "Usar EPP completo",
            "Trabajar en campana extractora",
            "Capacitacion obligatoria",
        ],
    },
    {
        id: "gas",
        title: "Gas a presion",
        meaning:
            "Puede explotar con el calor si esta comprimido, o causar quemaduras por frio extremo.",
        examples: ["Oxigeno comprimido", "Nitrogeno liquido", "Gas propano"],
        recommendations: [
            "Mantener en posicion vertical",
            "Alejar de fuentes de calor",
            "No perforar ni incinerar",
        ],
    },
    {
        id: "explosive",
        title: "Explosivo",
        meaning: "Puede explotar por impacto, friccion, chispa o calor.",
        examples: ["Acido picrico", "Nitroglicerina", "Peroxidos organicos"],
        recommendations: [
            "Evitar golpes y friccion",
            "Almacenar en lugar seguro",
            "No exponer al calor",
        ],
    },
    {
        id: "environmental",
        title: "Peligro para el medio ambiente",
        meaning: "Puede causar danos graves a ecosistemas acuaticos o terrestres.",
        examples: ["Plaguicidas", "Mercurio", "Hidrocarburos clorados"],
        recommendations: [
            "No verter al drenaje",
            "Desechar como residuo peligroso",
            "Contener derrames",
        ],
    },
];
