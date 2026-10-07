export const CARPENTER_FIELDS = [
  { name: "name", label: "Nom de l'atelier" },
  { name: "contactName", label: "Nom du contact" },
  { name: "phone", label: "Téléphone", type: "tel" as const },
  { name: "email", label: "Email", type: "email" as const },
  { name: "address", label: "Adresse", optional: true },
  { name: "notes", label: "Notes internes", type: "textarea" as const, optional: true },
];

export const USER_FIELDS = [
  { name: "name", label: "Nom et prénom", autoComplete: "off" },
  { name: "email", label: "Email de connexion", type: "email" as const, autoComplete: "off" },
  { name: "phone", label: "Téléphone (connexion possible aussi par téléphone)", type: "tel" as const, optional: true, autoComplete: "off" },
  { name: "password", label: "Mot de passe initial", type: "password" as const, hint: "8 caractères minimum, avec lettres et chiffres.", autoComplete: "new-password" },
];
