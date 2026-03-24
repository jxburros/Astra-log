import JSZip from 'jszip';
import type { FileSystemTree } from '@webcontainer/api';

export async function parseZipToTree(file: File): Promise<FileSystemTree> {
  const zip = await JSZip.loadAsync(file);
  const tree: FileSystemTree = {};

  // Find the root folder name if everything is nested under one folder (typical for GitHub zips)
  const files = Object.values(zip.files).filter(f => !f.dir);
  let rootPrefix = '';
  if (files.length > 0) {
    const firstPathParts = files[0].name.split('/');
    if (firstPathParts.length > 1) {
      const potentialRoot = firstPathParts[0] + '/';
      const allShareRoot = files.every(f => f.name.startsWith(potentialRoot));
      if (allShareRoot) {
        rootPrefix = potentialRoot;
      }
    }
  }

  for (const zipEntry of files) {
    const relativePath = zipEntry.name.startsWith(rootPrefix)
      ? zipEntry.name.substring(rootPrefix.length)
      : zipEntry.name;

    const parts = relativePath.split('/');
    let currentLevel: any = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // It's a file
        const content = await zipEntry.async('uint8array');
        currentLevel[part] = {
          file: {
            contents: content
          }
        };
      } else {
        // It's a directory
        if (!currentLevel[part]) {
          currentLevel[part] = { directory: {} };
        }
        currentLevel = currentLevel[part].directory;
      }
    }
  }
  return tree;
}
