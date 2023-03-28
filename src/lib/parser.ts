import {AbstractLexer, SyntaxError, Token} from "./lexer";

const PARSE_REGISTRY = new Map<string, Map<any, (token: Token<any>, lookahead: Token<any>, out: any) => any[]>>();

export function parse<T, TOut>(type: T) {
    return function(target: any, property: string, descriptor: PropertyDescriptor) {
        if (!PARSE_REGISTRY.has(target.constructor.name)) {
            PARSE_REGISTRY.set(target.constructor.name, new Map<T, (token: Token<T>, lookahead: Token<T>, out: TOut) => T[]>());
        }
        PARSE_REGISTRY.get(target.constructor.name).set(type, descriptor.value);
    }
}


export abstract class AbstractParser<T, TOut> {

    protected constructor(private readonly lexer: AbstractLexer<T>) { }

    protected abstract initOut(): TOut;

    parse(input: string): TOut {
        const out = this.initOut();
        const parserLookup = PARSE_REGISTRY.get(this.constructor.name);
        if (!parserLookup) {
            throw new Error("No parsing methods registered, please provide at least one decorated @parse method!");
        }
        this.lexer.input = input;
        while(this.lexer.hasNext()) {
            // get the parsing function from the registry
            const current = this.lexer.current;
            const parser = parserLookup.get(current.type);
            const lookahead = this.lexer.lookahead;
            let next = parser(current, lookahead, out);
            if (next && this.lexer.hasNext() && !this.lexer.isNextAny(...next)) {
                throw new SyntaxError(this.lexer.next());
            }
            this.lexer.next();
        }
        return out;
    }

}