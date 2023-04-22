
// import {WellKnownTextParser} from "./wtk";

// let input = 'LINESTRING(-85.2116 29.4555, -86.15544 24.45544, -89.1244 45.5444)';
// const parser = new WellKnownTextParser();

// console.log(parser.parse(input));

import {parse_molecule} from "./molecule";
import {parse_wkt} from "./wtk"

document.querySelectorAll('button[data-target]').forEach((element: HTMLElement) => {
    element.addEventListener('click', () => {
        const type = element.dataset.input;
        const target = document.getElementById(element.dataset.target) as HTMLTextAreaElement;
        const input = document.getElementById(type) as HTMLInputElement;
        target.value = '';
        let result: any = {};
        if (type === 'wkt') {
            result = parse_wkt(input.value);
        } else if (type ==='molecule') {
            result = parse_molecule(input.value);
        }
        target.value = JSON.stringify(result, null, 4);
    });
});
