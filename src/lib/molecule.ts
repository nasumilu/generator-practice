import {AbstractLexer, PositionRegExpExecArray, SyntaxError, Token} from "./lexer";
import {AbstractParser, parse} from "./parser";

export type Molecule = {[element: string]: number};

export enum MoleculeToken {
    ELEMENT = 1,
    NUMERIC = 2
}

export class MoleculeLexer extends AbstractLexer<MoleculeToken> {

    public constructor() {
        super(false);
    }

    protected catchablePatterns(): string[] {
        return ['([A-Z]{1}([a-z]{1})?)', '\\d+', '\\S'];
    }

    protected createToken(value: PositionRegExpExecArray) {
        const position = value.indices[0];

        // create a numeric token
        const numericValue = parseFloat(value[0]);
        if (!Number.isNaN(numericValue)) {
            return new Token<MoleculeToken>(MoleculeToken.NUMERIC, numericValue, position, value.input);
        }
        if ((value[0].length === 1 && value[0] === value[0].toUpperCase())
            || (value[0].length === 2 && value[0].charAt(0) === value[0].charAt(0).toUpperCase() && value[0].charAt(1) === value[0].charAt(1).toLowerCase())) {
            return new Token<MoleculeToken>(MoleculeToken.ELEMENT, value[0], position, value.input);
        }

        throw new SyntaxError(value);
    }

}

export class MoleculeParser extends AbstractParser<MoleculeToken, Molecule> {

    constructor() {
        super(new MoleculeLexer());
    }

    protected initOut(): Molecule {
        return {};
    }

    @parse(MoleculeToken.NUMERIC)
    parseNumber(): MoleculeToken[] {
        return [MoleculeToken.ELEMENT, null];
    }

    @parse(MoleculeToken.ELEMENT)
    parseElement(value: Token<MoleculeToken>, lookahead: Token<MoleculeToken>, out: Molecule): MoleculeToken[] {
        if (!out[value.value]) {
            out[value.value] = NaN;
        }
        if (lookahead?.type === MoleculeToken.NUMERIC) {
            out[value.value] = lookahead.value;
        } else {
            out[value.value] = 1;
        }
        return [MoleculeToken.ELEMENT, MoleculeToken.NUMERIC, null];
    }
}