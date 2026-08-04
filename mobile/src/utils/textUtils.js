/**
 * Normaliza una cadena de texto eliminando acentos, diacríticos y convirtiendo a minúsculas.
 * Permite realizar búsquedas insensibles a mayúsculas, minúsculas y acentos.
 * Ejemplo: "Ácido Clorhídrico" -> "acido clorhidrico"
 */
export const normalizeText = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Comprueba si un texto fuente incluye un texto de búsqueda (query)
 * ignorando mayúsculas, minúsculas y acentos.
 */
export const textMatches = (source, query) => {
  if (!query) return true;
  if (!source) return false;
  const normSource = normalizeText(source);
  const normQuery = normalizeText(query);
  return normSource.includes(normQuery);
};
