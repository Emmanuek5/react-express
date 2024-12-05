import * as cheerio from 'cheerio';

interface ProcessedScript {
    content: string;
    src?: string;
    type?: string;
}

export interface Script {
    content: string;
    src?: string;
    type?: string;
    scope?: 'global' | 'isolated';
}

export class ScriptProcessor {
    private static generateUniquePrefix(): string {
        return `_scope_${Math.random().toString(36).substring(7)}`;
    }

    private static wrapInScope(content: string, prefix: string, scope: 'global' | 'isolated' = 'isolated'): string {
        // Replace var declarations with let/const to prevent hoisting
        content = content.replace(/\bvar\s+(\w+)/g, 'let $1');
        
        if (scope === 'global') {
            // Find all function declarations and assignments
            const functionRegexes = [
                /function\s+(\w+)\s*\([^)]*\)\s*{[^}]*}/g,  // function declarations
                /const\s+(\w+)\s*=\s*function\s*\([^)]*\)\s*{[^}]*}/g,  // const function assignments
                /let\s+(\w+)\s*=\s*function\s*\([^)]*\)\s*{[^}]*}/g,  // let function assignments
                /var\s+(\w+)\s*=\s*function\s*\([^)]*\)\s*{[^}]*}/g,  // var function assignments
                /(\w+)\s*=\s*function\s*\([^)]*\)\s*{[^}]*}/g  // direct assignments
            ];

            let globalFunctions: string[] = [];
            
            // Process each type of function declaration/assignment
            functionRegexes.forEach(regex => {
                const matches = content.match(regex) || [];
                matches.forEach(match => {
                    const nameMatch = match.match(/(?:function\s+|(?:const|let|var)\s+)?(\w+)(?:\s*=)?/);
                    if (nameMatch?.[1]) {
                        globalFunctions.push(`window.${nameMatch[1]} = ${nameMatch[1]};`);
                    }
                });
            });

            return `
                const ${prefix} = {};
                (function(exports) {
                    ${content}
                    
                    // Make functions globally available
                    ${globalFunctions.join('\n')}
                })(${prefix});
            `;
        }

        // For isolated scope, just wrap the content
        return `
            const ${prefix} = {};
            (function(exports) {
                ${content}
            })(${prefix});
        `;
    }

    public static processScripts(html: string): { processedHtml: string; combinedScript: string } {
        const $ = cheerio.load(html);
        const scripts: Script[] = [];
        let combinedScript = '';

        $('script').each((_, element) => {
            const $script = $(element);
            const src = $script.attr('src');
            const type = $script.attr('type');
            const scope = $script.attr('data-scope') as 'global' | 'isolated' || 'isolated';
            
            // Skip module scripts and external react-express scripts
            if (type === 'module' || (src && (
                src.includes('react-express.js') ||
                src.includes('react-express.min.js')
            ))) {
                return;
            }

            // Handle inline scripts
            if (!src) {
                scripts.push({
                    content: $script.html()?.trim() || '',
                    type,
                    scope
                });
                $script.remove();
            }
        });

        // Add DOMContentLoaded wrapper
        combinedScript = 'document.addEventListener("DOMContentLoaded", () => {\n';

        // Process all scripts
        scripts.forEach((script) => {
            if (script.content) {
                const prefix = this.generateUniquePrefix();
                combinedScript += this.wrapInScope(script.content, prefix, script.scope) + '\n';
            }
        });

        // Close DOMContentLoaded wrapper
        combinedScript += '});\n';

        // Add the combined script back to the HTML
        $('body').append(`<script>${combinedScript}</script>`);

        return {
            processedHtml: $.html(),
            combinedScript
        };
    }
}
