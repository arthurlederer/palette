/** URL protégée d'une photo stockée (servie après contrôle d'accès). */
export const photoUrl = (key: string) => `/api/photos/${key}`;
