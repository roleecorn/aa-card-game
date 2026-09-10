let selectedLeaderId: string | undefined;

export function setSelectedLeaderId(memberId: string | undefined): void {
  selectedLeaderId = memberId;
}

export function getSelectedLeaderId(): string | undefined {
  return selectedLeaderId;
}

export function clearSelectedLeaderId(): void {
  selectedLeaderId = undefined;
}
