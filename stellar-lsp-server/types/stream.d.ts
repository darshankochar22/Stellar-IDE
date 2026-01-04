// types/stream.d.ts
declare module 'stream' {
    interface ReadWriteStream {
        destroyed?: boolean;
        destroy?(error?: Error): void;
    }
}