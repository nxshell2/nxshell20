import { EventEmitter } from "events";

export type NxDataTransferEvents = "prepare" | "transferring" | "finished" | "abort" | "error" | "filecreated" | "ask";
export type NxDataTransferType = "file" | "dir";
export type NxDataTransferUserAction = "retry" | "overwrite" | "rename" | "skip" | "cancel" | "merge" | "ask";

export interface NxTransferMessage {
    event: NxDataTransferEvents;
    args?: any;
}

export interface NxTransferDataDesc {
    nodeUUID: string;
    path: string;
    type?: NxDataTransferType;
    connId?: number;
    createFolder?: boolean;
}

export interface NxTransferAnswers {
    overwrite: {
        action: "ask" | "merge" | "skip";
        keep: boolean;
    };
    merge: {
        action: "ask" | "overwrite" | "skip";
        keep: boolean;
    };
}

class NxDataTransfer extends EventEmitter {
    _setFrom(from: NxTransferDataDesc): void {}
    _setTo(to: NxTransferDataDesc): void {}
    _bindChannel(channelId: number): void {}
    answer(action: NxDataTransferUserAction, keep: boolean): void {}
    startTransferring(): void {}
}

export { NxDataTransfer };
