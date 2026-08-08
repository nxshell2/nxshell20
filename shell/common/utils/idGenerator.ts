class IdGenerator {
  lastId: number = 0
  constructor(initId: number = 0) {
    this.lastId = initId
  }

  getNext(): number {
    return this.lastId++
  }
}

const globalIdGenerator = new IdGenerator()

function getGlobalId(): number {
  return globalIdGenerator.getNext()
}

export {
  getGlobalId,
  IdGenerator
}
