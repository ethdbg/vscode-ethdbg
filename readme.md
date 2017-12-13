This is an ethereum debugger adapter developed using Microsoft/vscode-mock-debug as a starter.

# VS Code Ethereum Debug
 
Ethereum Debug VSCode is a VSCode extension builrary. <link to ethdbg>

*Ethereum Debug VSCode* is a debug adapter for Visual Studio Code.
It supports *step*, *continue*, *breakpoints*, *exceptions*,
*variable access* and *arbitrary code execution*, connected to the ethdbg Debugger Library.

## Using ether Debug

* Install the **ether Debug** extension in VS Code, either through the marketplace or
through the VSIX file available in github releases
* Drop into Debug mode, setting your TestRPC to debug TestRPC provider `localhost:8546` by default
* Switch to the debug viewlet and press the gear dropdown.
* Select the debug environment "ether Debug".
* Press the green 'play' button to start debugging.


TODO: put real Travis CI of vscode ext and ethdbg library here
![ether Debug](images/ether-debug.gif)

## Build and Run

[![build status](https://travis-ci.org/Microsoft/vscode-ether-debug.svg?branch=master)](https://travis-ci.org/Microsoft/vscode-ether-debug)
[![build status](https://ci.appveyor.com/api/projects/status/empmw5q1tk6h1fly/branch/master?svg=true)](https://ci.appveyor.com/project/weinand/vscode-ether-debug)


