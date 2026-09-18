export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  extension?: string;
  children?: FileNode[];
}

export interface FileContent {
  path: string;
  name: string;
  content: string;
  language?: string;
  size: number;
}
