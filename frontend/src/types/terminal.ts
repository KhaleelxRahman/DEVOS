export interface TerminalExecutePayload {
  command: string;
  args?: string[];
}

export interface TerminalResult {
  exit_code: number;
  stdout: string;
  stderr: string;
  execution_time_ms?: number;
}

export interface TerminalHistoryItem {
  id: string;
  command: string;
  exit_code: number;
  created_at: string;
}
