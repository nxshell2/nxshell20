import * as fs from 'node:fs'

export function read(jsonPath: string): any {
  const jsonString = fs.readFileSync(jsonPath, { encoding: 'utf8' })
  return JSON.parse(jsonString)
}
