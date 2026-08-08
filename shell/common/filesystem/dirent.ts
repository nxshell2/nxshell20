import { FStats } from './fstat'

class Dirent extends FStats {
  name: string = ''
  constructor(name: string, stat: any) {
    super(stat)
    this.name = name
  }
}

export { Dirent }
