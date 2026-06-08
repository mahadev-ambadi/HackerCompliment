export const ADMIN_USER_IDS = [
  "c5ef6e67-02f2-4a62-9cd7-600f1889d642", // Mahadev Ambadi SS - Gmail (admin)
];

export function isAdmin(userId: string): boolean {
  return ADMIN_USER_IDS.includes(userId);
}
