import {AbstractLexer, PositionRegExpExecArray, SyntaxError, Token} from "./lexer";
import {Geometry, LineString, Point, Polygon} from "geojson";
import {AbstractParser, parse} from "./parser";

enum WellKnownTextToken {

    GEOMETRY = 100,
    NUMERIC = 200,
    COMMA = 300,
    LPAREN = 401,
    RPAREN = 402
}

class WellKnowTextLexer extends AbstractLexer<WellKnownTextToken> {

    private static geometryTypes = ['point', 'linestring', 'polygon'];

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

class WellKnownTextParser extends AbstractParser<WellKnownTextToken, Geometry>{

    private geometry?: Partial<Geometry>;

    protected output(): Geometry {
        return this.geometry as Geometry;
    }

    constructor() {
        super(new WellKnowTextLexer());
    }

    parse(input: string, context?: any): Geometry {
        this.geometry = {};
        return super.parse(input, this.geometry);
    }

    // -------------------- Start Point Rules -------------------------------- //
    @parse<WellKnownTextToken, Point>(
        (geometry, token) => token.type === WellKnownTextToken.GEOMETRY
            && (token.value as string).toLowerCase() === 'point'
    )
    parsePoint(): WellKnownTextToken[] {
        this.geometry.type = 'Point';
        return [WellKnownTextToken.LPAREN];
    }

    @parse<WellKnownTextToken, Point>(
        (geometry, token) => token.type === WellKnownTextToken.LPAREN
            && geometry?.type === 'Point'
    )
    parsePointLeftParenthesis(): WellKnownTextToken[] {
        (this.geometry as Point).coordinates = [];
        return [WellKnownTextToken.NUMERIC];
    }

    @parse<WellKnownTextToken, Point>(
        (geometry, token) => token.type === WellKnownTextToken.NUMERIC
            && geometry?.type === 'Point'
    )
    parsePointNumeric(token: Token<WellKnownTextToken>): WellKnownTextToken[] {
        (<Point>this.geometry).coordinates.push(token.value);
        return (<Point>this.geometry).coordinates.length === 2 ? [WellKnownTextToken.RPAREN] : [WellKnownTextToken.NUMERIC];
    }

    @parse<WellKnownTextToken, Point>(
        (geometry, token) => token.type === WellKnownTextToken.RPAREN
            && geometry?.type === 'Point'
    )
    parsePointRightParenthesis(): WellKnownTextToken[] {
        return [null];
    }
    // --------------------- End Point Rules --------------------------------- //


    // ----------------- Start LineString Rules ------------------------------ //
    @parse<WellKnownTextToken, LineString>(
        (geometry, token) => token.type === WellKnownTextToken.GEOMETRY
            && (token.value as string).toLowerCase() === 'linestring'
    )
    parseLineString(): WellKnownTextToken[] {
        this.geometry.type = 'LineString';
        (this.geometry as LineString).coordinates = [];
        return [WellKnownTextToken.LPAREN];
    }

    @parse<WellKnownTextToken, LineString>(
        (geometry, type) => type.type === WellKnownTextToken.LPAREN
            && geometry?.type === 'LineString'
    )
    parseLineStringLeftParenthesis(token: Token<WellKnownTextToken>, lookahead: Token<WellKnownTextToken>): WellKnownTextToken[] {
        if (lookahead?.type === WellKnownTextToken.NUMERIC) {
            (this.geometry as LineString).coordinates.push([]);
            return [WellKnownTextToken.NUMERIC];
        }
        return [WellKnownTextToken.LPAREN];
    }

    @parse<WellKnownTextToken, LineString>(
        (geometry, token) => token.type === WellKnownTextToken.NUMERIC
            && geometry?.type === 'LineString'
    )
    parseLineStringNumeric(token: Token<WellKnownTextToken>) {
        (this.geometry as LineString).coordinates[(this.geometry as LineString).coordinates.length - 1].push(token.value);
        return (this.geometry as LineString).coordinates[(this.geometry as LineString).coordinates.length - 1].length === 2
            ? [WellKnownTextToken.RPAREN, WellKnownTextToken.COMMA]
            : [WellKnownTextToken.NUMERIC];
    }

    @parse<WellKnownTextToken, LineString>(
        (geometry, token) => token.type === WellKnownTextToken.COMMA
            && geometry?.type === 'LineString'
    )
    parseLinStringComma(value: Token<WellKnownTextToken>, lookahead: Token<WellKnownTextToken>): WellKnownTextToken[]  {
        if (lookahead?.type === WellKnownTextToken.NUMERIC) {
            (this.geometry as LineString).coordinates.push([]);
            return [WellKnownTextToken.NUMERIC]
        }
        return [WellKnownTextToken.LPAREN];
    }

    @parse<WellKnownTextToken, LineString>(
        (geometry, token) => token.type === WellKnownTextToken.RPAREN
            && geometry.type === 'LineString'
    )
    parseLineStringRightParenthesis(value: Token<WellKnownTextToken>, lookahead: Token<WellKnownTextToken>): WellKnownTextToken[] {
        if (lookahead?.type === WellKnownTextToken.COMMA) {
            return [WellKnownTextToken.COMMA];
        }

        if (lookahead?.type === WellKnownTextToken.RPAREN) {
            return [WellKnownTextToken.RPAREN];
        }

        if ((this.geometry as LineString).coordinates.length !== 2) {
            // missing a ordinate value, syntax error
            throw new SyntaxError(value);
        }
        // otherwise comma next ordered pair otherwise end of linestring.
        return [null];
    }
    // ------------------ End LineString Rules ------------------------------ //

    // ------------------ Start Polygon Rules ------------------------------- //
    @parse<WellKnownTextToken, Polygon>(
        (geometry, token) => token.type === WellKnownTextToken.GEOMETRY
            && (token.value as string).toLowerCase() === 'polygon'
    )
    parsePolygon(): WellKnownTextToken[] {
        this.geometry.type = 'Polygon';
        (this.geometry as Polygon).coordinates = [];
        return [WellKnownTextToken.LPAREN];
    }

    @parse<WellKnownTextToken, Polygon>(
        (geometry, type) => type.type === WellKnownTextToken.LPAREN
            && geometry?.type === 'Polygon'
    )
    parsePolygonLeftParenthesis(token: Token<WellKnownTextToken>, lookahead: Token<WellKnownTextToken>): WellKnownTextToken[] {
        if (lookahead?.type === WellKnownTextToken.NUMERIC) {
            (this.geometry as Polygon).coordinates.push([]);
            return [WellKnownTextToken.NUMERIC];
        }
        return [WellKnownTextToken.LPAREN];
    }

    @parse<WellKnownTextToken, Polygon>(
        (geometry, token) => token.type === WellKnownTextToken.NUMERIC
            && geometry?.type === 'Polygon'
    )
    parsePolygonNumeric(token: Token<WellKnownTextToken>) {
        (this.geometry as Polygon).coordinates[(this.geometry as Polygon).coordinates.length - 1].push(token.value);
        return (this.geometry as Polygon).coordinates[(this.geometry as Polygon).coordinates.length - 1].length === 2
            ? [WellKnownTextToken.RPAREN, WellKnownTextToken.COMMA]
            : [WellKnownTextToken.NUMERIC];
    }

    @parse<WellKnownTextToken, Polygon>(
        (geometry, token) => token.type === WellKnownTextToken.COMMA
            && geometry?.type === 'Polygon'
    )
    parsePolygonComma(value: Token<WellKnownTextToken>, lookahead: Token<WellKnownTextToken>): WellKnownTextToken[]  {
        if (lookahead?.type === WellKnownTextToken.NUMERIC) {
            (this.geometry as Polygon).coordinates.push([]);
            return [WellKnownTextToken.NUMERIC]
        }
        return [WellKnownTextToken.LPAREN];
    }

    @parse<WellKnownTextToken, Polygon>(
        (geometry, token) => token.type === WellKnownTextToken.RPAREN
            && geometry.type === 'Polygon'
    )
    parsePolygonRightParenthesis(value: Token<WellKnownTextToken>, lookahead: Token<WellKnownTextToken>): WellKnownTextToken[] {
        if (lookahead?.type === WellKnownTextToken.COMMA) {
            return [WellKnownTextToken.COMMA];
        }

        if (lookahead?.type === WellKnownTextToken.RPAREN) {
            return [WellKnownTextToken.RPAREN];
        }
        return [null];
    }

    // ------------------- End Polygon Rules -------------------------------- //
}

// A Highlander const, there can be only one!
const WKT_PARSER = new WellKnownTextParser();

/**
 * Parse well-known text (WKT) into a {@link Geometry} type.
 */
export function parse_wkt(value: string) : Geometry {
    return WKT_PARSER.parse(value);
}

