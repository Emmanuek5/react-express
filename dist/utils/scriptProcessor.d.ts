export interface Script {
    content: string;
    src?: string;
    type?: string;
    scope?: 'global' | 'isolated';
}
export declare class ScriptProcessor {
    private static generateUniquePrefix;
    private static wrapInScope;
    static processScripts(html: string): {
        processedHtml: string;
        combinedScript: string;
    };
}
