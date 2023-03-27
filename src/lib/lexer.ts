
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

function isAToken(value: any): value is Token<any> {
    return typeof value === 'object'
        && Object.hasOwn(value, 'type')
        && Object.hasOwn(value, 'value')
        && Object.hasOwn(value, 'position')
        && Object.hasOwn(value, 'input');
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
            '${args.input.slice(0, args.start)}**⇝'${args.input.slice(args.start, args.end + 1)}'⇜**${args.input.slice(args.end | 1)})'
        `);
    }

    private static _normalizeArg(value: PositionRegExpExecArray | Token<any>): {value: string, start: number, end: number, input: string} {
        if (isAToken(value)) {
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

    private _regex;
    private _input: string;
    private _scanner: Generator<Token<T>, boolean, string>;
    private _current: IteratorResult<Token<T>>
    private _lookahead: IteratorResult<Token<T>>;

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
        this._regex = new RegExp(pattern, flags);
    }

    set input(input: string) {
        this._input = input;
        this.reset();
    }

    next(): Token<T> {
        let current: Token<T>;
        if (!this._current.done) {
            current = this._current.value;
            this._current = this._lookahead;
            this._lookahead = this._scanner.next(this._input as any);
        }
        return current;
    }

    get current(): Token<T> {
        return this._current.value;
    }

    get lookahead(): Token<T> {
        return this._lookahead.value;
    }

    hasNext(): boolean {
        return !this._current.done;
    }

    isNextA(type: T): boolean {
        return !this._lookahead.done && this._lookahead.value.type === type;
    }

    isNextAny(...types: T[]): boolean {
        return types.some(type => this.isNextA(type));
    }

    reset(): void {
        this._scanner = null;
        this._current = null;
        this._lookahead = null;
        this._scanner = this.scanner(this._input);

        this._current = this._scanner.next(this._input as any);
        this._lookahead = this._scanner.next(this._input as any);
    }


    private * scanner(input: string): Generator<Token<T>, boolean, string> {
        let current: PositionRegExpExecArray = this._regex.exec(input);
        while (current != null) {
            yield this.createToken(current);
            current = this._regex.exec(input);
        }
        return true;
    }

    protected abstract catchablePatterns(): string[];

    protected abstract createToken(value: RegExpExecArray);
}

