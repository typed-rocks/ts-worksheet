

<div align="center">
<h1 style="font-size:50px">TypeScript Worksheet</h1>

## [Usage](#usage) | [Features](#features)

<h3>Get the results of your&nbsp;<img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/ts.png" width="30">&nbsp;or&nbsp;<img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/js.png" width="30">&nbsp;code right in your IDE</h3>
  <div >
 <a  style= role="button" href="https://marketplace.visualstudio.com/items?itemName=chwoerz.ts-worksheet">
        Download for VSCode
    </a>
    <br>
    <br>
     <a  style= role="button" href="https://plugins.jetbrains.com/plugin/23660-typescript-worksheet/">
        Download for Jetbrains
    </a>
    
</div>
<img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/result.gif" width=500> 

  <h3>Compatible with the major runtimes...</h3>
    <div class="mt-3 d-flex justify-content-center gap-4">
        <img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/bun.png" width="80"/>
        <img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/nodejs.png" width="80"/>
        <img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/deno.png" width="80"/>
    </div>
<div>
    <h3>...and languages</h3>
    <div class="mt-3 d-flex justify-content-center gap-4">
        <img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/ts.png" width="80"/>
        <img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/js.png" width="80"/>
    </div>
</div>

<h2 style="font-size: 40px;">Features</h2>
</div>
<div align="center">
    <div>
        <div >
            <h3>Real-time Code Execution</h3>
            <p>See the results of your code as you save the file, without the need to switch windows or execute your
                script
                separately.</p>
        </div>
        <div>
            <img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/realtime.png" width=300/>
        </div>
    </div>
    <hr>
    <div>
        <div>

  <h3>Use different runtimes</h3>
  <p>Easily switch between <img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/bun.png" width="25"/>, <img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/deno.png" width="25"> and <img
                      src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/nodejs.png" width="25"/> to run your scripts. We try our best to handle compatibility issues
  for you.</p>
</div>
<div>
<img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/runtimes.png" width=100/>
</div>
</div>
<hr>
   <div>
        <div >
            <h3>Copy value on click</h3>
            <p>Just click on the inlay and get the value copied to clipboard.</p>
        </div>
        <div>
            <img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/cut.png" width=300/>
        </div>
    </div>
    <hr>

  <div>
        <div>
            <h3>Timetravel (only vscode)</h3>
            <p>Scrub through your code and see the exact order your code was executed. Especially useful for
                understanding async code.</p>
        </div>
        <div>
            <img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/scrub.png" width=300/>
        </div>
    </div>
    <hr>
    <div>
        <div>

  <h3>Support for all kind of Imports</h3>
            <p>Effortlessly import any Node module or other files from your project into your worksheet. Whether you
                use CommonJS with <code>require</code>
                or ESM with <code>import</code>, we got you covered.</p>
        </div>
        <div>
            <img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/import.png" width=300/>
        </div>
    </div>
    <hr>
    <div>
        <div>

  <h3>async and top level <code>await</code> support</h3>
            <p>You can effortlessly test your asynchronous code using <code>Promises</code> but also
                <code>async/await.</code></p>
        </div>
        <div>
            <img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/async.png" width=300/>
        </div>
    </div>
    <hr>
    <div>
        <div>

   <h3>Easy Activation</h3>
            <p>Just add <code>//ts-worksheet</code> or <code>//ts-worksheet-with-variables</code> to your file, and
                you're
                all set.</p>
        </div>
        <div>
            <img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/firstline.png" width=300/>
        </div>
    </div>
    <hr>
    <div>
        <div>
            <h3>Per-Line activation</h3>
            <p>Just <code>//?</code> at the end of the lines you want to have the result shown.</p>
        </div>
        <div>
            <img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/single.png" width=300/>
        </div>
    </div>
    <hr>
    <div>
        <div>

<h3>Customisable</h3>
<p>Change the colors and run behaviour yourself.</p>
</div>
<div >
<img src="https://raw.githubusercontent.com/typed-rocks/ts-worksheet/main/imgs/settings.png" width=300/>
</div>
</div>

</div>

## Usage

After installation, you have multiple ways of running the plugin.

### Configure it first

You will now have a new icon in the your left gutter in VSCode which you can use to configure your plugin.

<img src="./imgs/config.png" width=300>


### Run at save:

1. Open a JavaScript or TypeScript file.
2. Add `//ts-worksheet` or `//ts-worksheet-with-variables` at the top of the file.
3. Start coding and save the file when you are ready! You'll see the output of your code directly in the editor.

The difference between `//ts-worksheet` and `//ts-worksheet-with-variables` is the later shows also the results of your variable initialization. So for example you will get the output of this line only with the later one:

```typescript
const hello = 'hi';
```
 
### Run from Command Palette:

1. Open a JavaScript or TypeScript file.
2. Open your Command Palette and run the command `Run TypeScript Worksheet` or `Run TypeScript Worksheet without variables`

This will use the configuration to run the worksheet once in your current file so you don't run it by accident when you save your file like with the comment approach.


**ATTENTION**: This is still an early version of the plugin. If you find any issues, [Create an issue for it](https://github.com/typed-rocks/ts-worksheet/issues/new).

## Feedback and Support

We value your feedback! If you encounter any issues or have suggestions for improvements, [please feel free to reach out to us](https://github.com/typed-rocks/ts-worksheet/issues/new). Your input helps us make this tool even better for the developer community.

## License

This plugin is licensed under [MIT License](https://opensource.org/licenses/MIT).
