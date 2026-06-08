export const ADMIN_USER_IDS = [
  "ad576013-4e3e-4cfd-a97b-ea7fbdaf5590",
  "c5ef6e67-02f2-4a62-9cd7-600f1889d642"
];

export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}
