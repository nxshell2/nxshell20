import { NxLogger } from "../common/nxsys/logger";
import { createObjectHandle } from "./nxobjs";

const winston: any = require('winston');
const { printf } = winston.format;

const rawFormat = printf(({ level, message, label, timestamp }: any) => {
    return message;
});

class NxLoggerServer extends NxLogger {
    logger: any = null;

    constructor(logFile: string) {
        super(logFile);
        this._create_logger();
    }

    _create_logger() {
        const logger = winston.createLogger({
            format: rawFormat,
            transports: [
                new winston.transports.File({ filename: this.file }),
            ],
            exitOnError: false,
        });
        this.logger = logger;
    }

    info(s: string) {
        this.logger.info(s);
    }
}

function createLogger(file: string): number {
    const logger = new NxLoggerServer(file);
    const handler = createObjectHandle(logger);
    return handler;
}

export { createLogger };
