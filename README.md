# generator-practice

## Description

While looking over the [MDN web docs](https://developer.mozilla.org/en-US/) I encountered a `function*`. Obviously, 
I succumbed to curiosity and here you are! At that time I needed a simple lookahead, left-to-right (LALR) lexer/parser so what
could be better than to use a generator function. The parsing object would just be one token ahead, a kind of buffer of 
one, hence the LALR(1).

This was inspired by curiosity and....

- [Doctrine Lexer](https://www.doctrine-project.org/projects/doctrine-lexer/en/1.2/index.html)
- [PLY (Python Lex-Yacc)](https://www.dabeaz.com/ply/)
- [experta](https://pypi.org/project/experta/)

### Usage

First, the package contains a couple of examples. The examples are _dead_ simple to more complex use cases, but the 
general idea is the same. 

1. Extend the `AbstractLexer` class and provide an implementation of `catchablePatterns` and `createToken`. The simplest
   example is the *Molecule* lexer.

```typescript
enum MoleculeToken {
    ELEMENT = 1,
    NUMERIC = 2
}

class MoleculeLexer extends AbstractLexer<MoleculeToken> {

    public constructor() {
        super(false);
    }

    protected catchablePatterns(): string[] {
        return ['[A-Z]{1}([a-z])?', '\\d+', '\\S'];
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
```

Then the parser, overloading the `parse` method to provide context:

```typescript
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
```

Construct the parser, as

```typescript
const parser = new MoleculeParser();
const results = JSON.stringify(parser.parse('BaTiSi3O9'), null, 4);
```
Expected output:
```json
{
    "Ba": 1,
    "Ti": 1,
    "Si": 3,
    "O": 9
}
```

### Parsing Explained
The `@parse` is a decorated which provides a predicate for which it is responsible for parsing a specific token. These
are the lexical rules, which defined the path which the parsing generator function will invoke. Still lots of work....


### Build the examples

To keep things simple the bundled example uses [Parcel](https://parceljs.org/) an about as simple as it gets JS/TS build
tool. And [yarn](https://yarnpkg.com/) package manager. 

To star the development server....

```shell
$ git clone https://github.com/nasumilu/generator-practice.git
$ cd generator-practice
$ yarn install
$ yarn start
```