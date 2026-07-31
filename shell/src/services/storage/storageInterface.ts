export default class StorageProviderInterface {
    providerName = "";
    constructor(name: string) {
        this.providerName = name;
    }

    save(_name: string, _object: Record<string, unknown>): Promise<void> {
        throw new Error("Save function not implemented");
    }
    read(_name: string): Promise<unknown> {
        throw new Error("Read function not implemented");
    }

    configure(_config: any) {}

    listDir(_dirPath: string): Promise<{ name: string; isDir: boolean }[]> {
        throw new Error("listDir not implemented");
    }
    readFile(_filePath: string): Promise<string | null> {
        throw new Error("readFile not implemented");
    }
    writeFile(_filePath: string, _content: string): Promise<void> {
        throw new Error("writeFile not implemented");
    }
    createDir(_dirPath: string): Promise<void> {
        throw new Error("createDir not implemented");
    }
    deleteFile(_filePath: string): Promise<void> {
        throw new Error("deleteFile not implemented");
    }
    move(_from: string, _to: string): Promise<void> {
        throw new Error("move not implemented");
    }

    testConnection?(): Promise<{ success: boolean; message: string }> {
        throw new Error("testConnection not implemented");
    }

    getStatus?(): string | Promise<string> {
        throw new Error("getStatus not implemented");
    }

    getAppDataDirty?(): string {
        throw new Error("getAppDataDirty not implemented");
    }

    readLegacy?(_name: string): Promise<unknown> {
        throw new Error("readLegacy not implemented");
    }

    delete?(_name: string): Promise<void> {
        throw new Error("delete not implemented");
    }
}
