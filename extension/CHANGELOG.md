# Change Log

## [0.4.7]

- **Per Line enable possibility**: Use `//?` at the end of a line if you only want to enable it for certain lines
- **Real-time Code Execution**: See the results of your code as you type, without the need to switch windows or execute your script separately.
- **Support for all kind of Imports**: Effortlessly import any Node module or other code within your worksheet. Wether you use `required` or `import`, we got you covered.
- **ESM Support**: Fully compatible with ECMAScript modules, enabling modern JavaScript development practices.
- **Support for JavaScript and TypeScript**: Whether you're working with JavaScript or TypeScript, this plugin has you covered.
- **Easy Activation**: Just add `//ts-worksheet` to your file, and you're all set.
- **Seamless Integration**: Works perfectly within the Visual Studio Code environment, making it a natural extension of your coding workflow.

## [0.5.0]
- **`throw` support**: Now supporting `throw` expressions.

## [0.5.1]
- **fixed showing spaces correctly**

## [0.6.0]
- **enable timetravel options**: There is now a new icon in the activity-toolbar where you can scrub through the executed code and also show the order of you ran code.

## [0.6.1]
- **bug fixes**

## [0.6.2]
- **README updated**

## [0.6.3]
- **bugfixes**

## [0.6.4]
- **bugfixes**

## [0.7.0]
- **support for bun and deno**: Now you also can run your code using deno or bun if you have the cli installed.

## [0.8.0]
- **ongoing script-support**: We now also support scripts which are still running like servers or setInterval(). This works for nodeJS on macOS and linux.
- **many bug fixes**

## [0.8.1]
- **bugfixes**

## [0.8.6]
- **stopwatch**: Now you see the time the script used to run
- **bugfixes**: import-checks for Deno is now working better and template literal-strings in specific cases do no longer let the compilation fail.

## [0.8.7]
- **bugfixes**

## [0.8.8]
- **made compatible with vscode 1.83**

## [0.8.9]
- **copy value on hover**: Now we can hover the inlay hint and copy the value to the clipboard

## [0.8.10]
- **await fix**: Fixed handling of await in arrays.
- **better hover**: text and objects on hover can now be copied easily to clipboard

## [0.8.11]
- **fix error-handling string**: Made the error handling easier to read.

## [0.8.12]
- **fixed non working version 0.8.11 because of wrong packaging**

## [0.8.13]
- **better hover output formatting**: New lines in hovering are now better formatted

## [0.8.14]
- **Trigger worksheet from command-palette**: Now just trigger the "Run TypeScript Worksheet" command from the command palette to trigger the worksheet.

## [0.8.15]
- **Support generator functions**: Prior to this version, if you used a generator function and `yield`, then the worksheet would have not worked at all.

## [0.8.16]
- **New command palette command**: Now you can run your files without showing the results on variables using the `Run TypeScript Worksheet without variables` command.

## [0.8.17] - [0.8.25]
- **Bugfixes**: Several bugfixes

## [0.8.27]
- **Bugfixes**: Ignore eslint errors