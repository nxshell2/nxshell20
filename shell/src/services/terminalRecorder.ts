import path from "path";
import Storage from "./storage";

export interface AsciicastHeader {
    version: 2;
    width: number;
    height: number;
    timestamp: number;
    title: string;
    env?: Record<string, string>;
}

export interface RecordingMeta {
    fileName: string;
    filePath: string;
    sessionName: string;
    sessionUuid: string;
    startTime: number;
    duration: number;
    title: string;
}

class TerminalRecorder {
    private startTime: number = 0;
    private records: string[] = [];
    private width: number = 80;
    private height: number = 24;
    private recording: boolean = false;
    private sessionName: string = "";
    private sessionUuid: string = "";
    private dataListener: ((_data: any) => void) | null = null;
    private resizeListener: ((_cols: number, _rows: number) => void) | null = null;
    private session: any = null;

    start(session: any, sessionName: string, sessionUuid: string, cols: number, rows: number): void {
        if (this.recording) {
            return;
        }
        this.session = session;
        this.sessionName = sessionName;
        this.sessionUuid = sessionUuid;
        this.width = cols || 80;
        this.height = rows || 24;
        this.startTime = Date.now();
        this.records = [];
        this.recording = true;

        this.dataListener = (data: any) => {
            if (!this.recording) return;
            const elapsed = (Date.now() - this.startTime) / 1000;
            const text = typeof data === "string" ? data : Buffer.from(data).toString("utf8");
            this.records.push(JSON.stringify([
                Math.round(elapsed * 1000) / 1000,
                "o",
                text
            ]));
        };

        this.resizeListener = (newCols: number, newRows: number) => {
            this.width = newCols;
            this.height = newRows;
        };

        session.on("data", this.dataListener);
        session.on("resize", this.resizeListener);
    }

    isRecording(): boolean {
        return this.recording;
    }

    getDuration(): number {
        if (!this.recording) return 0;
        return (Date.now() - this.startTime) / 1000;
    }

    async stop(): Promise<RecordingMeta | null> {
        if (!this.recording) {
            return null;
        }
        this.recording = false;

        if (this.dataListener && this.session) {
            this.session.off("data", this.dataListener);
            this.dataListener = null;
        }
        if (this.resizeListener && this.session) {
            this.session.off("resize", this.resizeListener);
            this.resizeListener = null;
        }

        const duration = (Date.now() - this.startTime) / 1000;
        const header: AsciicastHeader = {
            version: 2,
            width: this.width,
            height: this.height,
            timestamp: Math.floor(this.startTime / 1000),
            title: this.sessionName || "NxShell Recording",
            env: {
                SHELL: "/bin/bash",
                TERM: "xterm-256color"
            }
        };

        const content = [JSON.stringify(header), ...this.records].join("\n") + "\n";
        const timestamp = Math.floor(this.startTime / 1000);
        const safeName = this.sessionName.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, "_");
        const fileName = `${safeName}_${this.sessionUuid.substring(0, 8)}_${timestamp}.cast`;

        const recordingsDir = getRecordingsDir();
        const filePath = path.join(recordingsDir, fileName);

        try {
            const localStorage = Storage.localStorage;
            await localStorage.createDir(recordingsDir);
            await localStorage.writeFile(filePath, content);
        } catch (e) {
            console.error("[TerminalRecorder] Failed to save recording:", e);
            return null;
        }

        return {
            fileName,
            filePath,
            sessionName: this.sessionName,
            sessionUuid: this.sessionUuid,
            startTime: this.startTime,
            duration,
            title: this.sessionName
        };
    }

    dispose(): void {
        if (this.recording) {
            this.stop();
        }
    }
}

function getRecordingsDir(): string {
    const localStorage = Storage.localStorage;
    return path.join(localStorage.getAppDataDirty(), "recordings");
}

async function listRecordings(sessionUuid?: string): Promise<RecordingMeta[]> {
    const recordingsDir = getRecordingsDir();
    const localStorage = Storage.localStorage;

    try {
        const items = await localStorage.listDir(recordingsDir);
        const recordings: RecordingMeta[] = [];

        for (const item of items) {
            if (item.isDir || !item.name.endsWith(".cast")) continue;

            try {
                const filePath = path.join(recordingsDir, item.name);
                const content = await localStorage.readFile(filePath);
                if (!content) continue;

                const lines = content.split("\n");
                if (lines.length < 1) continue;

                const header = JSON.parse(lines[0]) as AsciicastHeader;

                let duration = 0;
                if (lines.length > 1) {
                    const lastLine = JSON.parse(lines[lines.length - 2]);
                    duration = lastLine[0] || 0;
                }

                const parts = item.name.replace(".cast", "").split("_");
                const recUuid = parts.length >= 2 ? parts[parts.length - 2] : "";

                if (sessionUuid && recUuid && !sessionUuid.startsWith(recUuid)) {
                    continue;
                }

                recordings.push({
                    fileName: item.name,
                    filePath,
                    sessionName: header.title || parts.slice(0, -2).join("_") || "Recording",
                    sessionUuid: recUuid,
                    startTime: header.timestamp * 1000,
                    duration,
                    title: header.title || ""
                });
            } catch (e) {
                // skip invalid files
            }
        }

        recordings.sort((a, b) => b.startTime - a.startTime);
        return recordings;
    } catch (e) {
        return [];
    }
}

async function deleteRecording(filePath: string): Promise<void> {
    const localStorage = Storage.localStorage;
    await localStorage.deleteFile(filePath);
}

async function readRecording(filePath: string): Promise<string | null> {
    const localStorage = Storage.localStorage;
    return await localStorage.readFile(filePath);
}

export {
    TerminalRecorder,
    getRecordingsDir,
    listRecordings,
    deleteRecording,
    readRecording
};
