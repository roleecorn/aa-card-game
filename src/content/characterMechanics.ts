export interface CharacterMechanics {
  externalEffectImmune?: boolean;
}

export const CHARACTER_MECHANICS: Record<string, CharacterMechanics> = {
  shennau: { externalEffectImmune: true },
};

export function hasCharacterMechanic(
  characterId: string,
  mechanic: keyof CharacterMechanics,
): boolean {
  return CHARACTER_MECHANICS[characterId]?.[mechanic] === true;
}
