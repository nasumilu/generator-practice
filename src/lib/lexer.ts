
/**
 * Adds the indices property provided with the `d` flag to the existing {@link RegExpExecArray} interface.
 *
 * @see <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/hasIndices">RegExp.prototype.hasIndices</a>
 */
export interface PositionRegExpExecArray extends RegExpExecArray {
    indices: [number, number][]
}

/**
 * Token class binds a `type` to a value.
 */
export class Token<T> {

    public constructor(public readonly type: T,
                       public readonly value: any,
                       public readonly position: [number, number],
                       public readonly input: string) {
    }

    /**
     * Get the token's value starting position
     */
    get startPosition(): number|undefined {
        return this.position[0] ?? undefined;
    }

    /**
     * Gets the token's value ending position
     */
    get endPosition(): number|undefined {
        return this.position[1] ?? undefined;
    }

}

/**
 * Base error for a syntax error.
 *
 * Syntax errors may occur while lexing or parsing a value. Where lexing simply verifies that the value is valid while
 * parse ensures that the values correctly ordered.
 */
export class SyntaxError extends Error {
    constructor(value: PositionRegExpExecArray | Token<any>) {
        const args = SyntaxError._normalizeArg(value);
        super(`Syntax Error: 
            Unknown value '${args.value}' at position ${args.start}!
            '${args.input.slice(0, args.start)}˰${args.input.slice(args.start, args.end)}${args.input.slice(args.end)}'
        `);
    }

    private static _normalizeArg(value: PositionRegExpExecArray | Token<any>): {value: string, start: number, end: number, input: string} {
        if (value instanceof Token) {
            return {value: value.value, start: value.startPosition, end: value.endPosition, input: value.input};
        }
        return {value: value[0], start:  value.indices[0][0], end: value.indices[0][1], input: value.input};
    }
}

/**
 * Base class for a basic lexical analysis using RegExp.
 *
 * @see <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp">RegExp</a>
 */
export abstract class AbstractLexer<T> {

    #regex: RegExp;
    #input: string;
    #scanner: Generator<Token<T>, boolean, string>;
    #current: IteratorResult<Token<T>>
    #lookahead: IteratorResult<Token<T>>;

    /**
     * Constructs a lexer from a valid {@link RegExp} pattern
     * @param caseInsensitive indicates whether when matching, casing differences are ignored (default: true)
     * @protected
     */
    protected constructor(caseInsensitive?: boolean) {
        let flags = 'dg';
        if (caseInsensitive ?? true) {
            flags += 'i';
        }
        const pattern = `(${this.catchablePatterns().join(')|(')})`;
        this.#regex = new RegExp(pattern, flags);
    }

    set input(input: string) {
        this.reset();
        this.#input = input;
        this.#scanner = this.scanner(this.#input);
        this.#current = this.#scanner.next(this.#input as any);
        this.#lookahead = this.#scanner.next(this.#input as any);
    }

    next(): Token<T> {
        let current: Token<T>;
        if (!this.#current.done) {
            current = this.#current.value;
            this.#current = this.#lookahead;
            this.#lookahead = this.#scanner.next(this.#input as any);
        }
        return current;
    }

    get current(): Token<T> {
        return this.#current.value;
    }

    get lookahead(): Token<T> {
        return this.#lookahead.value;
    }

    hasNext(): boolean {
        return !this.#current.done;
    }

    isNextA(type: T): boolean {
        return (!this.#lookahead.done && this.#lookahead.value.type === type) || (this.#lookahead.done && null === type);
    }

    isNextAny(...types: T[]): boolean {
        return types.some(type => this.isNextA(type));
    }

    reset(): void {
        this.#scanner = null;
        this.#current = null;
        this.#lookahead = null;
    }


    private * scanner(input: string): Generator<Token<T>, null, string> {
        let current: PositionRegExpExecArray = this.#regex.exec(input) as PositionRegExpExecArray;
        while (current != null) {
            yield this.createToken(current);
            current = this.#regex.exec(input) as PositionRegExpExecArray;
        }
        return null;
    }

    protected abstract catchablePatterns(): string[];

    protected abstract createToken(value: RegExpExecArray);
}

