import {AbstractLexer, PositionRegExpExecArray, SyntaxError, Token} from "./lexer";
import {AbstractParser, parse} from "./parser";

type Molecule = {[element: string]: number};

enum MoleculeToken {
    ELEMENT = 1,
    NUMERIC = 2
}
class MoleculeLexer extends AbstractLexer<MoleculeToken> {

    public constructor() {
        super(false);
    }

    protected catchablePatterns(): string[] {
        return ['[A-Z]{1}([a-z])?'];
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

class MoleculeParser extends AbstractParser<MoleculeToken, Molecule> {

    #molecule: Molecule;

    constructor() {
        super(new MoleculeLexer());
    }

    parse(input: string, context?: any): Molecule {
        this.#molecule = {};
        return super.parse(input, context);
    }

    @parse((molecule, token) => token.type === MoleculeToken.NUMERIC)
    parseNumber(): MoleculeToken[] {
        return [MoleculeToken.ELEMENT, null];
    }

    @parse((molecule, token) => token.type === MoleculeToken.ELEMENT)
    parseElement(value: Token<MoleculeToken>, lookahead: Token<MoleculeToken>): MoleculeToken[] {
        if (!this.#molecule[value.value]) {
            this.#molecule[value.value] = 0;
        }
        if (lookahead?.type === MoleculeToken.NUMERIC) {
            this.#molecule[value.value] = lookahead.value;
            return [MoleculeToken.NUMERIC];
        } else {
            this.#molecule[value.value] += 1;
            return [MoleculeToken.ELEMENT, null];
        }
    }

    protected output(): Molecule {
        return this.#molecule;
    }
}

// A Highlander const, there can be only one!
const MOLECULE_PARSER = new MoleculeParser();

/**
 * Parse a molecule into a {@link Molecule} type.
 * @param value
 */
export function parse_molecule(value: string) : Molecule {
    return MOLECULE_PARSER.parse(value);
}