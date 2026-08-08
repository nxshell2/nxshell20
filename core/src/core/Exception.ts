class Exception extends Error {
  errCode: number = 0;
  constructor(code: number, desc: string) {
    super(desc);
    this.errCode = code;
  }
}

export default Exception;
