import {AbstractLexer, SyntaxError, Token} from "./lexer";

export type ParsePredicate<T, TOut> = (context: TOut, token: Token<T>, lookahead?: Token<T>) => boolean;
export type ParseMethod<T> = (token: Token<T>, lookahead: Token<T>, context?: any) => Token<T>[];

export type ParsingMethod<T, TOut> = {
    predicate: ParsePredicate<T, TOut>,
    method: ParseMethod<T>
}

// A map of parsing class and its decorated parsing methods
const PARSE_REGISTRY = new Map<string, Set<ParsingMethod<any, any>>>();

/**
 * Parsing decorator used to register a parsing classes function.
 */
export function parse<T, TOut>(predicate: ParsePredicate<T, TOut>) {
    return function(target: any, property: string, descriptor: PropertyDescriptor) {
        if (!PARSE_REGISTRY.has(target.constructor.name)) {
            PARSE_REGISTRY.set(target.constructor.name, new Set());
        }
        PARSE_REGISTRY.get(target.constructor.name).add({predicate, method: descriptor.value});
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
            const next = Array.from(parserLookup.values())
                .find(fn => fn.predicate.call(undefined, context, current, lookahead))?.method.call(this, current, lookahead);
            if (undefined == next || !this.lexer.isNextAny(...next)) {
                throw new SyntaxError(this.lexer.next());
            }
            this.lexer.next();
        }
        return this.output();
    }

}