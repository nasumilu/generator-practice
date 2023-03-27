import {AbstractLexer, PositionRegExpExecArray, SyntaxError, Token} from "./lexer";
import {Geometry} from "geojson";
import {AbstractParser, parse} from "./parser";

export enum WellKnownTextToken {

    GEOMETRY = 100,
    NUMERIC = 200,
    COMMA = 300,
    LPAREN = 401,
    RPAREN = 402
}

export class WellKnowTextLexer extends AbstractLexer<WellKnownTextToken> {

    private static geometryTypes = ['point', 'linestring', 'polygon', 'multipoint', 'multilinestring', 'multipolygon'];

    public constructor(caseInsensitive?: boolean) {
        super(caseInsensitive);
    }

    protected createToken(value: PositionRegExpExecArray) {
        const position = value.indices[0];

        // handle other token types comma, left and right parenthesis; otherwise throw a syntax error.
        switch(value[0]) {
            case ',': return new Token<WellKnownTextToken>(WellKnownTextToken.COMMA, value[0], position, value.input);
            case '(': return new Token<WellKnownTextToken>(WellKnownTextToken.LPAREN, value[0], position, value.input);
            case ')': return new Token<WellKnownTextToken>(WellKnownTextToken.RPAREN, value[0], position, value.input);
        }

        // create a numeric token
        const numericValue = parseFloat(value[0]);
        if (!Number.isNaN(numericValue)) {
            return new Token<WellKnownTextToken>(WellKnownTextToken.NUMERIC, numericValue, position, value.input);
        }

        // create a geometry token
        if (WellKnowTextLexer.geometryTypes.some(g => g === value[0].toLowerCase())) {
            return new Token<WellKnownTextToken>(WellKnownTextToken.GEOMETRY, value[0], position, value.input);
        }

        throw new SyntaxError(value);
    }

    protected catchablePatterns(): string[] {
        const pattern = WellKnowTextLexer.geometryTypes;
        pattern.push('[-+]?\\d*\\.?\\d+', '\\(', '\\)', ',');
        pattern.push('\\S+'); // all other non-whitespace values (syntax error)
        return pattern;
    }
}

export class WellKnownTextParser extends AbstractParser<WellKnownTextToken, Geometry>{

    constructor() {
        super(new WellKnowTextLexer());
    }

    @parse<WellKnownTextToken, Geometry>(WellKnownTextToken.GEOMETRY)
    parseGeometry(token: Token<WellKnownTextToken>, lookahead: Token<WellKnownTextToken>, out: Geometry): WellKnownTextToken {
        const type = (token.value as string).toLowerCase();
        switch (type) {
            case 'point':
                out.type = 'Point';
                break;
            case 'linestring':
                out.type = 'LineString';
                break;
        }
        return WellKnownTextToken.LPAREN;
    }

    @parse<WellKnownTextToken, Geometry>(WellKnownTextToken.NUMERIC)
    parseNumeric(token: Token<WellKnownTextToken>, lookahead: Token<WellKnownTextToken>, out: Geometry): WellKnownTextToken|WellKnownTextToken[] {
        switch (out.type) {
            case 'Point':
                out.coordinates.push(token.value);
                return out.coordinates.length === 2 ? WellKnownTextToken.RPAREN : WellKnownTextToken.NUMERIC;
            case 'LineString':
                out.coordinates[out.coordinates.length - 1].push(token.value);
                return out.coordinates[out.coordinates.length - 1].length === 2 ? [WellKnownTextToken.RPAREN, WellKnownTextToken.COMMA] : WellKnownTextToken.NUMERIC;
        }
    }

    @parse<WellKnownTextToken, Geometry>(WellKnownTextToken.LPAREN)
    parseLeftParenthesis(value: Token<WellKnownTextToken>, lookahead: Token<WellKnownTextToken>, out: Geometry) {
        switch(out.type) {
            case 'Point':
                out.coordinates = [];
                return WellKnownTextToken.NUMERIC;
            case 'LineString':
                if (!out.coordinates) {
                    out.coordinates = [];
                }
                if (lookahead.type === WellKnownTextToken.NUMERIC) {
                    out.coordinates.push([]);
                    return WellKnownTextToken.NUMERIC;
                }
                return WellKnownTextToken.LPAREN;
        }
    }

    @parse<WellKnownTextToken, Geometry>(WellKnownTextToken.RPAREN)
    parseRightParenthesis(value: Token<WellKnownTextToken>, lookahead: Token<WellKnownTextToken>, out: Geometry): WellKnownTextToken | null {

        switch(out.type) {
            case 'Point':
                return null;
            case 'LineString':
                return lookahead.type === WellKnownTextToken.COMMA ? WellKnownTextToken.COMMA : null;
        }
    }

    @parse<WellKnownTextToken, Geometry>(WellKnownTextToken.COMMA)
    parseComma(value: Token<WellKnownTextToken>, lookahead: Token<WellKnownTextToken>, out: Geometry): WellKnownTextToken  {
        switch(out.type) {
            case 'Point':
                return null;
            case 'LineString':
                if (lookahead.type === WellKnownTextToken.NUMERIC) {
                    out.coordinates.push([]);
                    return WellKnownTextToken.NUMERIC
                }
                return WellKnownTextToken.LPAREN;
        }

    }

}

