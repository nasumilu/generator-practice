import {WellKnownTextParser} from "./wtk";

let input = 'LINESTRING(-85.2116 29.4555, -86.15544 24.45544, -89.1244 45.5444)';
const parser = new WellKnownTextParser();

console.log(parser.parse(input));