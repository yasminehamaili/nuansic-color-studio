// Generates a friendly, deterministic display name from a user's id — same
// user always gets the same name (no DB column needed), but it looks
// "random" since it's derived from their UUID rather than their email.

const ADJECTIVES = [
  "Swift", "Calm", "Bold", "Bright", "Quiet", "Warm", "Cool", "Sharp",
  "Gentle", "Vivid", "Lucky", "Mellow", "Sunny", "Wild", "Cosmic", "Golden",
  "Amber", "Coral", "Violet", "Indigo", "Rustic", "Electric", "Velvet", "Misty",
];

const NOUNS = [
  "Otter", "Falcon", "Maple", "Comet", "Willow", "Ember", "Sparrow", "Cedar",
  "Lynx", "Harbor", "Meadow", "Quartz", "Raven", "Aspen", "Coral", "Fjord",
  "Heron", "Prairie", "Canyon", "Reef", "Thistle", "Marble", "Birch", "Delta",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function usernameFromId(userId: string): string {
  const hash = hashString(userId);
  const adjective = ADJECTIVES[hash % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(hash / ADJECTIVES.length) % NOUNS.length];
  return `${adjective} ${noun}`;
}

export function avatarUrlFromId(userId: string): string {
  // DiceBear's "thumbs" style — clean, flat, geometric avatars generated
  // deterministically from a seed string. No API key, no account needed.
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(userId)}`;
}
