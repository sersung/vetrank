export const LEVELS = [
  { level: 1, name: "Residente", nameEn: "Resident", xpRequired: 0 },
  { level: 2, name: "Estagiário", nameEn: "Intern", xpRequired: 100 },
  { level: 3, name: "Clínico Geral", nameEn: "General Practitioner", xpRequired: 300 },
  { level: 4, name: "Especialista", nameEn: "Specialist", xpRequired: 700 },
  { level: 5, name: "Consultor", nameEn: "Consultant", xpRequired: 1500 },
  { level: 6, name: "Pesquisador", nameEn: "Researcher", xpRequired: 3000 },
  { level: 7, name: "Professor", nameEn: "Professor", xpRequired: 5500 },
  { level: 8, name: "Mestre", nameEn: "Master", xpRequired: 9000 },
  { level: 9, name: "Lenda", nameEn: "Legend", xpRequired: 15000 },
];

export function getLevelForXp(xp: number) {
  let current = LEVELS[0]!;
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl;
    else break;
  }
  return current;
}
