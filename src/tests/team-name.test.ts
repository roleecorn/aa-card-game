import { describe, expect, it } from 'vitest';
import appSource from '../app/App.tsx?raw';
import gameHeaderSource from '../components/GameHeader.tsx?raw';
import onlineDialogSource from '../components/OnlineConnectionDialog.tsx?raw';
import teamColumnSource from '../components/TeamColumn.tsx?raw';
import { STANDARD_GAME_DEFINITION } from '../content/catalog';
import { createInitialGame } from '../game/engine';
import { swapGamePerspective } from '../online/protocol';
import onlineSessionSource from '../online/onlineSession.ts?raw';
import {
  DEFAULT_TEAM_NAME,
  isValidTeamName,
  normalizeTeamName,
  readTeamNameCookie,
  TEAM_NAME_COOKIE,
  TEAM_NAME_MAX_LENGTH,
} from '../preferences/teamName';

describe('team name preference', () => {
  it('defaults to AA同好會 and normalizes surrounding whitespace', () => {
    expect(normalizeTeamName('')).toBe(DEFAULT_TEAM_NAME);
    expect(normalizeTeamName('   ')).toBe(DEFAULT_TEAM_NAME);
    expect(normalizeTeamName('  測試小隊  ')).toBe('測試小隊');
  });

  it('enforces the same maximum length as the input field', () => {
    const exact = '甲'.repeat(TEAM_NAME_MAX_LENGTH);
    const tooLong = `${exact}乙`;
    expect(isValidTeamName(exact)).toBe(true);
    expect(isValidTeamName(tooLong)).toBe(false);
    expect(normalizeTeamName(tooLong)).toBe(exact);
  });

  it('reads the saved team name from the cookie header', () => {
    const encoded = encodeURIComponent('路人確認用小隊');
    expect(readTeamNameCookie(`other=1; ${TEAM_NAME_COOKIE}=${encoded}; theme=dark`)).toBe('路人確認用小隊');
    expect(readTeamNameCookie('other=1')).toBe(DEFAULT_TEAM_NAME);
  });
});

describe('team name match integration', () => {
  it('uses the chosen name when Standard and Online game definitions are created', () => {
    expect(appSource).toContain('name: confirmedTeamName');
    expect(appSource).toContain('name: onlineLocalTeamName');
    expect(appSource).toContain('name: onlineRemoteTeamName ?? gameDefinition.rules.enemy.name');
  });

  it('requires the Online name before creating or joining a room and carries Guest identity over the data channel', () => {
    expect(onlineDialogSource).toContain('disabled={!validTeamName}');
    expect(onlineDialogSource).toContain('createHostRoom(size, confirmedTeamName)');
    expect(onlineDialogSource).toContain('joinGuestRoom(guestCode, confirmedTeamName)');
    expect(onlineSessionSource).toContain('teamName: state.localTeamName');
    expect(onlineSessionSource).toContain('remoteTeamName: normalizeTeamName(message.teamName ?? DEFAULT_TEAM_NAME)');
  });

  it('renders TeamState names instead of temporary battle labels', () => {
    expect(gameHeaderSource).toContain('label={game.player.name}');
    expect(gameHeaderSource).toContain('label={game.enemy.name}');
    expect(teamColumnSource).toContain('const displayTitle = team.name || title;');
  });

  it('swaps Host and Guest names together with the Guest perspective', () => {
    const hostGame = createInitialGame(() => 0.42, STANDARD_GAME_DEFINITION);
    hostGame.player.name = 'Host 小隊';
    hostGame.enemy.name = 'Guest 小隊';

    const guestGame = swapGamePerspective(hostGame);
    expect(guestGame.player.name).toBe('Guest 小隊');
    expect(guestGame.enemy.name).toBe('Host 小隊');
    expect(hostGame.player.name).toBe('Host 小隊');
    expect(hostGame.enemy.name).toBe('Guest 小隊');
  });
});
