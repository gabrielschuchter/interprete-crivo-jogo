import { Compiler } from 'inkjs/compiler/Compiler';
import { Story } from 'inkjs/engine/Story';
const src = `
VAR confianca = 0
=== custodia ===
Custódia acende o lampião e olha o chão sob a luz.
* [Perguntar onde caiu a chave] -> chave
* [Perguntar se procurou na sombra] -> sombra
=== chave ===
"Aqui, onde há luz."
~ confianca = confianca + 1
-> DONE
=== sombra ===
Ela hesita. "Ninguém procura lá."
~ confianca = confianca - 1
-> DONE
`;
const t0 = performance.now();
const json = new Compiler(src).Compile().ToJson();
const t1 = performance.now();
const s = new Story(json);
s.ChoosePathString('custodia');
let out = [];
while (s.canContinue) out.push(s.Continue().trim());
out.push('ESCOLHAS: ' + s.currentChoices.map(c => c.text).join(' | '));
s.ChooseChoiceIndex(0);
while (s.canContinue) out.push(s.Continue().trim());
console.log(out.join('\n'));
console.log('confianca =', s.variablesState['confianca']);
console.log(`compilar: ${(t1-t0).toFixed(0)} ms; json: ${json.length} bytes`);
