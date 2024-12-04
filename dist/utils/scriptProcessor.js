import * as cheerio from 'cheerio';
export class ScriptProcessor {
    static generateUniquePrefix() {
        return `_scope_${Math.random().toString(36).substring(7)}`;
    }
    static wrapInScope(content, prefix) {
        // Replace var declarations with let/const to prevent hoisting
        content = content.replace(/\bvar\s+(\w+)/g, 'let $1');
        // Wrap variables in a unique object to prevent naming conflicts
        return `
            const ${prefix} = {};
            (function(exports) {
                ${content}
            })(${prefix});
        `;
    }
    static processScripts(html) {
        const $ = cheerio.load(html);
        const scripts = [];
        let combinedScript = '';
        // Process each script tag
        $('script').each((_, element) => {
            const $script = $(element);
            const src = $script.attr('src');
            const type = $script.attr('type');
            // Skip module scripts and external react-express scripts
            if (type === 'module' || (src && (src.includes('/__react-express/') ||
                src.includes('/socket.io/') ||
                src.startsWith('http://') ||
                src.startsWith('https://')))) {
                return;
            }
            // Store script content and remove the tag
            scripts.push({
                content: $script.html() || '',
                src,
                type
            });
            $script.remove();
        });
        // Process and combine scripts
        scripts.forEach((script) => {
            if (script.content.trim()) {
                const prefix = this.generateUniquePrefix();
                combinedScript += this.wrapInScope(script.content, prefix) + '\n';
            }
        });
        // Wrap everything in DOMContentLoaded
        const finalScript = `
            document.addEventListener("DOMContentLoaded", () => {
                ${combinedScript}
            });
        `;
        // Add the combined script back to the HTML
        $('body').append(`<script>${finalScript}</script>`);
        return {
            processedHtml: $.html(),
            combinedScript: finalScript
        };
    }
}
//# sourceMappingURL=scriptProcessor.js.map