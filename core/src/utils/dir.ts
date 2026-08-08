import { lstatSync, opendirSync } from 'node:fs'
import { extname, join } from 'node:path'

export function isDirExists(dirPath: string): boolean {
  try {
  const stat = lstatSync(dirPath)
  return stat.isDirectory()
  } catch(e) {
  console.error(e)
  return false
  }
}

export function walkDir(root: string, filters?: string[]): string[] {
  if (!isDirExists(root)) {
  return []
  }
  const dir = opendirSync(root)
  const dirList: string[] = []
  let dirent = dir.readSync()
  while (dirent) {
  if (dirent.isDirectory()) {
    const files = walkDir(join(root, dirent.name), filters)
    dirList.push(...files)
  }
  if (!dirent.isFile()) {
    dirent = dir.readSync()
    continue
  }
  const ext = extname(dirent.name)
  if (!filters || filters.includes(ext)) {
    dirList.push(join(root, dirent.name))
  }
  dirent = dir.readSync()
  }
  dir.closeSync()

  return dirList
}
