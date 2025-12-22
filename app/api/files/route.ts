import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_PATH = '/Users/darshan/Downloads/Important/soroban-hello-world';

type FileNode = {
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  children?: FileNode[];
};

async function buildFileTree(dirPath: string, basePath: string = ''): Promise<FileNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    // Skip node_modules, target, .git, etc.
    if (entry.name === 'node_modules' || entry.name === 'target' || entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const children = await buildFileTree(fullPath, relativePath);
      nodes.push({
        name: entry.name,
        type: 'folder',
        path: relativePath,
        children
      });
    } else {
      nodes.push({
        name: entry.name,
        type: 'file',
        path: relativePath
      });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'folder' ? -1 : 1;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');

  try {
    // If requesting a specific file's content
    if (filePath) {
      const fullPath = path.join(PROJECT_PATH, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return NextResponse.json({ content });
    }

    // Otherwise return the file tree
    const fileTree = await buildFileTree(PROJECT_PATH);
    return NextResponse.json({ files: fileTree });

  } catch (error) {
    console.error('Error reading files:', error);
    return NextResponse.json(
      { error: 'Failed to read files' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { path: filePath, content } = await request.json();
    const fullPath = path.join(PROJECT_PATH, filePath);
    
    await fs.writeFile(fullPath, content, 'utf-8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json(
      { error: 'Failed to save file' },
      { status: 500 }
    );
  }
}