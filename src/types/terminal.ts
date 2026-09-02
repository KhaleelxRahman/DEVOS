export interface TerminalCommandResult {
  command: string;
  output: string;
  exit_code: number;
  timestamp: string;
}

export interface TerminalResult {
  command: string;
  output: string;
  exit_code: number;
  cwd?: string;
  stdout?: string;
  stderr?: string;
}

export interface TerminalExecutePayload {
  command: string;
  cwd?: string;
}

export interface TerminalSession {
  id: string;
  project_id: string;
  cwd: string;
  history: string[];
}
