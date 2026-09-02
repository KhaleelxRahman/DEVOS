export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  language?: string;
  content?: string;
}

export interface FileItem {
  path: string;
  name: string;
  content: string;
  language: string;
  size: number;
}

export interface FileContent {
  path: string;
  name?: string;
  content: string;
  language?: string;
  size?: number;
}
