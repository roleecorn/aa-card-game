export const DEFAULT_TEAM_NAME = 'AA同好會';
export const TEAM_NAME_COOKIE = 'aa_card_game_team_name';
export const TEAM_NAME_MAX_LENGTH = 24;
const TEAM_NAME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function normalizeTeamName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_TEAM_NAME;
  return Array.from(trimmed).slice(0, TEAM_NAME_MAX_LENGTH).join('');
}

export function isValidTeamName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && Array.from(trimmed).length <= TEAM_NAME_MAX_LENGTH;
}

export function readTeamNameCookie(
  cookieHeader: string = typeof document === 'undefined' ? '' : document.cookie,
): string {
  for (const rawPart of cookieHeader.split(';')) {
    const part = rawPart.trim();
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator) !== TEAM_NAME_COOKIE) continue;

    try {
      return normalizeTeamName(decodeURIComponent(part.slice(separator + 1)));
    } catch {
      return DEFAULT_TEAM_NAME;
    }
  }
  return DEFAULT_TEAM_NAME;
}

export function persistTeamNameCookie(value: string): string {
  const normalized = normalizeTeamName(value);
  if (typeof document !== 'undefined') {
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${TEAM_NAME_COOKIE}=${encodeURIComponent(normalized)}; Max-Age=${TEAM_NAME_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  }
  return normalized;
}
