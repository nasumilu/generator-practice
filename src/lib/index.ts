import {WellKnownTextParser} from "./wtk";
import {MoleculeParser} from "./molecule";

let input = 'LINESTRING(-85.2116 29.4555, -86.15544 24.45544, -89.1244 45.5444)';
const parser = new WellKnownTextParser();

console.log(parser.parse(input));

const molecule = 'C6H12O';

const moleculeParser = new MoleculeParser();

console.log(moleculeParser.parse(molecule));