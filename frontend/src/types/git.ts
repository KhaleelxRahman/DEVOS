export interface GitStatus {
  branch: string;
  is_clean: boolean;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
  ahead?: number;
  behind?: number;
}

export interface GitCommit {
  hash: string;
  author: string;
  message: string;
  date: string;
}

export interface GitDiff {
  diff: string;
  stats?: {
    files_changed: number;
    insertions: number;
    deletions: number;
  };
}
