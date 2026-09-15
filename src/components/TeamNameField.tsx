import { TextField } from '@mui/material';
import { isValidTeamName, TEAM_NAME_MAX_LENGTH } from '../preferences/teamName';

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function TeamNameField({ value, onChange, disabled = false, autoFocus = false }: Props) {
  const valid = isValidTeamName(value);

  return (
    <TextField
      label="隊伍名稱"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      autoFocus={autoFocus}
      fullWidth
      error={!valid}
      helperText={valid ? '會顯示在對局畫面；連線時可用來確認正在和誰對戰。' : '請輸入隊伍名稱。'}
      slotProps={{ htmlInput: { maxLength: TEAM_NAME_MAX_LENGTH } }}
    />
  );
}
