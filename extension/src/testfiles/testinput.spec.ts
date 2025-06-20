//ts-worksheet-with-variables
import axios from "axios";


Promise.resolve('start but not start');

export const T = "adf";
export function exportFun() {

}

const exports = 2;

function ta() {}
const f = ta;
const t = () => {
  console.log("sdf");
  return 1;
};

type A = "string";
//   ^?

await new Promise((r) => setTimeout(r, 0));
console.error("as  df", 2);
await new Promise((r) => setTimeout(r, 0));
console.error("asdf", 2);
console.table("asdf table");
console.log();

const spaces = "ate     b";
t();
f();
t();

console.log("afasf");

//ts-worksheet-with-variables
const zeroTo10_ = Array.from({ length: 11 });

zeroTo10_;

zeroTo10_.map((_, i) => i);

for (let i = 1; i < 10; i++) {
  console.log(`i: ${i}`);
}

class Person_ {
  constructor(public name: string) {}

  shoutHello() {
    console.log("called with " + this.name);
    return `Hello ${this.name}`.toUpperCase();
  }
}

const person_ = new Person_("Christian Wörz");

person_.name;

person_.shoutHello();

person_.name = "New Name";
person_.shoutHello();

const url = "http://google.com";

let a = url,
  b = "2";
a;

Promise.resolve('asf');

const ASDF = { a: "asdf", b: 2 };
//use Promises
Promise.resolve({status: 200}).then((r) => r.status);

console.log(await axios.get(url).then((r) => r.status), "b");
// use toplevel await with modules:
try {
  console.log("Await status: " + (await axios.get(url)).status);
} catch (err) {
  console.log(err);
}

const withFn = {
  another: null,
  wupdi: '2',
  hello: () => {}
};

const switcher: any = 'switcha';

switch(switcher + 1) {
  case 'test':
    console.log('is test');
    case 'switcha1':
      console.log('is switcha1');
}

if(false && true) {
  console.log('should not go in');
} else if(true) {
  console.log('in elseif');
} else {
  console.log('should not go in');
}

if(true && true) {
  console.log('in if');
} else if(false) {
  console.log('should not go in');
} else {
  console.log('should not go in');
}

if(false && true) {
  console.log('should not go in');
} else if(false) {
  console.log('should not go in');
} else {
  console.log('in else');
}

const ternary = true ? 'isfirst' : 'wup';

function wrappedIf() {
  if(false && true) {
    console.log('should not go in');
  } else if(false) {
    console.log('should not go in');
  } else {
    console.log('in else');
  }  
}

wrappedIf();
let j = 0;
let k = 0;
for(let w = 0; w < 10; w++) {
  j++;
  ++k;
}

const ternaryTest = 0;

if(ternaryTest) {
  console.log('ternary-test done');
}

if(!ternaryTest) {
  console.log('ternary-test done');
}

if(!!ternaryTest) {
  console.log('ternary-test done');
}

switch(!ternaryTest) {

}

switch(ternaryTest) {

}

switch(!!ternaryTest) {

}
let i = 0;
const u = (n: number) => n;
'a' + i++ + 'b';
u(i++);

`${i++}`;


function withParams(a: string, b: number) {}
const arrowWithParams = (c: number) => {}
withParams;
exportFun;

0n;
-0n;
NaN;

const lineBraks = `
hello 

again 
`;

const awaitInArray = [Promise.resolve('hello'), await Promise.resolve('hello again')];
const simpleAwaitWorks = await Promise.resolve('test');


function* yieldTest() {
  let i = 0;
  console.log('hello yield');
  yield i;
}

yieldTest().next();