
/**
 * Adds the indices property provided with the `d` flag to the existing {@link RegExpExecArray} interface.
 *
 * @see <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/hasIndices">RegExp.prototype.hasIndices</a>
 */
export interface PositionRegExpExecArray extends RegExpExecArray {
    indices: [number, number][]
}

/**
 * Token class wraps a `type` to a value and includes its start & end positions.
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
    constructor(value: PositionRegExpExecArray | Token<any> | string) {
        if (typeof value !== 'string') {
            const args = SyntaxError._normalizeArg(value);
            value = `
            (!) Syntax Error: 
                Unknown value '${args.value}' at position ${args.start}!
                '${args.input.slice(0, args.start)}˰${args.input.slice(args.start, args.end)}${args.input.slice(args.end)}'
            `;
        }
        super(value);
    }

    /**
     * static utility method used to normalize the {@link Token} or {@link PositionRegExpExecArray} argument into an
     * object which can construct the message for an {@link SyntaxError}
     * @param value
     * @private
     */
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

    /**
     * Resets and sets the input to lex.
     *
     * @param input
     */
    set input(input: string) {
        this.reset();
        this.#input = input;
        this.#scanner = this.scanner(this.#input);
        this.#current = this.#scanner.next(this.#input as any);
        this.#lookahead = this.#scanner.next(this.#input as any);
    }

    /**
     * Move the lexer to the next token
     */
    next(): Token<T> {
        let current: Token<T>;
        if (!this.#current.done) {
            current = this.#current.value;
            this.#current = this.#lookahead;
            this.#lookahead = this.#scanner.next(this.#input as any);
        }
        return current;
    }

    /**
     * Get the current token
     */
    get current(): Token<T> {
        return this.#current.value;
    }

    /**
     * Get the lookahead token. Lookahead is the token at one-position to the right of the current or null if no more
     * tokens are available.
     */
    get lookahead(): Token<T> {
        return this.#lookahead.value;
    }

    /**
     * Indicates whether the lexer has a next token.
     */
    hasNext(): boolean {
        return !this.#current.done;
    }

    /**
     * Predicate to test if the next token is a specific type.
     * @param type
     */
    isNextA(type: T): boolean {
        return (!this.#lookahead.done && this.#lookahead.value.type === type) || (this.#lookahead.done && null === type);
    }

    /**
     * Predicate to test if the next token is any of the types.
     * @param types
     */
    isNextAny(...types: T[]): boolean {
        return types.some(this.isNextA.bind(this));
    }

    /**
     * Resets the lexer
     */
    protected reset(): void {
        this.#scanner = null;
        this.#current = null;
        this.#lookahead = null;
    }

    /**
     * The scanner {@link Generator} function which iterates over the tokens
     * @private
     */
    private * scanner(input: string): Generator<Token<T>, null, string> {
        let current: PositionRegExpExecArray = this.#regex.exec(input) as PositionRegExpExecArray;
        while (current != null) {
            yield this.createToken(current);
            current = this.#regex.exec(input) as PositionRegExpExecArray;
        }
        return null;
    }

    /**
     * An array of regex patterns used to construct the lexer
     * @protected
     */
    protected abstract catchablePatterns(): string[];

    /**
     * Used to create a {@link Token} for the specified position value.
     * @protected
     */
    protected abstract createToken(value: PositionRegExpExecArray);
}

