
// import {WellKnownTextParser} from "./wtk";

// let input = 'LINESTRING(-85.2116 29.4555, -86.15544 24.45544, -89.1244 45.5444)';
// const parser = new WellKnownTextParser();

// console.log(parser.parse(input));

import {parse_molecule} from "./molecule";

document.querySelectorAll('button[data-target]').forEach((element: HTMLElement) => {
    element.addEventListener('click', () => {
        const target = element.dataset.target;
        const input = element.dataset.input;
        const result = parse_molecule((document.getElementById(input) as HTMLInputElement).value);
        (document.getElementById(target) as HTMLTextAreaElement).value = JSON.stringify(result, null, 4);
    });
});
