
// import {WellKnownTextParser} from "./wtk";

// let input = 'LINESTRING(-85.2116 29.4555, -86.15544 24.45544, -89.1244 45.5444)';
// const parser = new WellKnownTextParser();

// console.log(parser.parse(input));

import {parse_molecule} from "./molecule";
import {parse_wkt} from "./wtk"

document.querySelectorAll('button[data-target]').forEach((element: HTMLElement) => {
    element.addEventListener('click', () => {
        const target = element.dataset.target;
        const input = element.dataset.input;
        let result: any = {};
        if (input === 'wkt') {
            result = parse_wkt((<HTMLInputElement>document.getElementById(input)).value);
        } else if (input ==='molecule') {
            result = parse_molecule((<HTMLInputElement>document.getElementById(input)).value);
        }
        (document.getElementById(target) as HTMLTextAreaElement).value = JSON.stringify(result, null, 4);
    });
});
