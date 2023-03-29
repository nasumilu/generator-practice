import {AbstractLexer, SyntaxError, Token} from "./lexer";

// A map of parsing class and its decorated parsing methods
const PARSE_REGISTRY = new Map<string, Map<any, (token: Token<any>, lookahead: Token<any>, context?: any) => any[]>>();

/**
 * Parsing decorator used to register a parsing classes function.
 * @param type
 */
export function parse<T, TOut>(type: T) {
    return function(target: any, property: string, descriptor: PropertyDescriptor) {
        if (!PARSE_REGISTRY.has(target.constructor.name)) {
            PARSE_REGISTRY.set(target.constructor.name, new Map());
        }
        PARSE_REGISTRY.get(target.constructor.name).set(type, descriptor.value);
    }
}

/**
 * Base parser class
 */
export abstract class AbstractParser<T, TOut> {

    protected constructor(private readonly lexer: AbstractLexer<T>) { }

    protected abstract output(): TOut;

    parse(input: string, context?: any): TOut {
        const parserLookup = PARSE_REGISTRY.get(this.constructor.name);
        if (!parserLookup) {
            throw new Error("No parsing methods registered, please provide at least one decorated @parse method!");
        }
        this.lexer.input = input;
        while(this.lexer.hasNext()) {
            // get the parsing function from the registry
            const current = this.lexer.current;
            const lookahead = this.lexer.lookahead;

            const parser = parserLookup.get(current.type).bind(this);
            let next = parser(current, lookahead, context);
            if (!this.lexer.isNextAny(...next)) {
                throw new SyntaxError(this.lexer.next());
            }
            this.lexer.next();
        }
        return this.output();
    }

}