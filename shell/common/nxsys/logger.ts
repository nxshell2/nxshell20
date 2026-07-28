import { EventEmitter } from "events";

class NxLogger extends EventEmitter {
    file: string;
    constructor(file: string) {
        super();
        this.file = file;
    }

    info() {
    }
}

export { NxLogger };
