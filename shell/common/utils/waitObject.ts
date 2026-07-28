class WaitObject {
    resolve: (v: any) => void = () => {};
    reject: (e: any) => void = () => {};
    p: Promise<any> | null = null;
    constructor() {
        this.p = new Promise((resolve, reject) => {
            this.resolve = (v: any) => {
                resolve(v);
            };
            this.reject = (e: any) => {
                reject(e);
            };
        });
    }

    wait() {
        return this.p!;
    }
}

export default WaitObject;
