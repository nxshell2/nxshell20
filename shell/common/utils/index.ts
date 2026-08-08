function isPromise(p: any): boolean {
  return (p && typeof p.then === 'function')
}

function insert<T>(array: T[], ele: T, pos?: number): T[] {
  if (typeof pos !== 'number' || pos > array.length) {
    array.push(ele)
    return array
  }
  if (pos <= 0) {
    array.unshift(ele)
    return array
  }

  const left = array.splice(0, pos)
  return left.concat([ele]).concat(array)
}

function resetValues(o: any): any {
  function getDefaultValue(v: any): any {
    const type = typeof v
    return ({
      string: () => '',
      number: () => 0,
      boolean: () => false,
      undefined: () => undefined
    } as any)[type] || (() => {
      if (Array.isArray(v)) {
        return []
      } else if (v === null) {
        return null
      } else if (v instanceof Date) {
        return new Date()
      } else {
        return v
      }
    })()
  }
  if (Array.isArray(o)) {
    return o.map((v) => {
      return getDefaultValue(v)
    })
  } else {
    Object.keys(o).forEach((key) => {
      o[key] = getDefaultValue(o[key])
    })
    return o
  }
}

export {
  insert,
  isPromise,
  resetValues
}
