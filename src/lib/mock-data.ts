import avatar1 from "@/assets/avatar-1.png";
import avatar2 from "@/assets/avatar-2.png";
import avatar3 from "@/assets/avatar-3.png";
import avatar4 from "@/assets/avatar-4.png";
import avatarCoach from "@/assets/avatar-coach.png";

export type Player = {
  id: string;
  firstName: string;
  birthDate: string; // YYYY-MM-DD
  team: string;
  avatar: string;
  flame: number;
  record: number;
  trainingAttendance: number;
  matchAttendance: number;
  avgFatigue: number;
};

export const players: Player[] = [
  {
    id: "p1",
    firstName: "Léa",
    birthDate: "2008-04-12",
    team: "U18 Flammes",
    avatar: avatar1,
    flame: 42,
    record: 28,
    trainingAttendance: 94,
    matchAttendance: 100,
    avgFatigue: 2.4,
  },
  {
    id: "p2",
    firstName: "Inès",
    birthDate: "2007-09-23",
    team: "U18 Flammes",
    avatar: avatar2,
    flame: 67,
    record: 67,
    trainingAttendance: 98,
    matchAttendance: 95,
    avgFatigue: 2.1,
  },
  {
    id: "p3",
    firstName: "Maya",
    birthDate: "2008-11-02",
    team: "U18 Flammes",
    avatar: avatar3,
    flame: 31,
    record: 45,
    trainingAttendance: 85,
    matchAttendance: 88,
    avgFatigue: 3.0,
  },
  {
    id: "p4",
    firstName: "Chloé",
    birthDate: "2009-02-18",
    team: "U18 Flammes",
    avatar: avatar4,
    flame: 54,
    record: 54,
    trainingAttendance: 91,
    matchAttendance: 92,
    avgFatigue: 2.6,
  },
];

export const upcoming = {
  training: { date: "Mercredi 24 juin", time: "18h30", place: "Gymnase Coubertin" },
  match: { date: "Samedi 28 juin", time: "16h00", opponent: "Étoile Sportive Lyon", home: true },
};

export type FeedPost = {
  id: string;
  author: string;
  authorAvatar: string;
  date: string;
  title: string;
  body: string;
  reactions: number;
};

export const feed: FeedPost[] = [
  {
    id: "f1",
    author: "Coach Sandra",
    authorAvatar: avatarCoach,
    date: "Il y a 2h",
    title: "🔥 Bravo les filles !",
    body: "Victoire 62-48 contre Villeurbanne ! Défense de feu, attaque clinique. On garde ce rythme à l'entraînement de mercredi.",
    reactions: 24,
  },
  {
    id: "f2",
    author: "Coach Sandra",
    authorAvatar: avatarCoach,
    date: "Hier",
    title: "Préparation match",
    body: "Pensez à bien vous hydrater cette semaine. Apportez vos chasubles oranges samedi.",
    reactions: 12,
  },
  {
    id: "f3",
    author: "Coach Sandra",
    authorAvatar: avatarCoach,
    date: "Il y a 3 jours",
    title: "Nouveau record d'Inès 🏆",
    body: "Inès vient de battre son record personnel avec 67 jours consécutifs de flamme. Une vraie machine !",
    reactions: 31,
  },
];

export const hallOfFame = [
  { name: "Inès", record: 67, year: "2026" },
  { name: "Chloé", record: 54, year: "2026" },
  { name: "Maya", record: 45, year: "2025" },
  { name: "Léa", record: 28, year: "2026" },
];
