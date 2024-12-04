export declare class ScriptProcessor {
    private static generateUniquePrefix;
    private static wrapInScope;
    static processScripts(html: string): {
        processedHtml: string;
        combinedScript: string;
    };
}
