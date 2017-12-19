notes on debugging the Ethdbg Visual Studio Code Extension

### Launching the Debugger Configuration

run `vsce` package on the vscode-ethdbg extension
note the location of the resulting `vsix` file.

**recommended launch configuration for use in the test project:** 
```launch.json
{
  "version": "0.2.0",
  "configurations": [
      {   
          "name": "ethdbgTEST",
          "type": "ether-debug",
          "request": "launch",
          "program": "/home/insi/Projects/ETHDBG/test-project/contracts/greeter.sol",
          "execArgs": [],
          "stopOnEntry": false,
          "trace": false,
          "stopOnAllBreakpoints": true,
          "root": "${workspaceRoot}/${relativeFile}",
          "debugServer": 4711
      }
  ]
}

```
**Configuration with Execution Arguments for TestRPC**
```launch.json
{
  "version": "0.2.0",
  "configurations": [
      {   
          "name": "ethdbgTEST",
          "type": "ether-debug",
          "request": "launch",
          "program": "/home/insi/Projects/ETHDBG/test-project/contracts/greeter.sol",
          "execArgs": ["--fork", false, "--loglvl", "6", "--port", "8545"],
          "stopOnEntry": false,
          "trace": false,
          "stopOnAllBreakpoints": true,
          "root": "${workspaceRoot}/${relativeFile}",
          "debugServer": 4711
      }
  ]
}

```

**Debug Configuration**
- Launch the vscode-ethdbg extension in one window
- go to left panel and click the debug icon, (a crossed out bug)
- Launch the debug configuration in the 'Server' configuration. *NOT* extension+server
- leave it running
  - note the port the debug server is running on by checking the `Debug Console`
  - if the port is anything other than `4711` change it in the launch.json file
    - it's entry is under `debugServer`
- Launch another window with your test project (official test-project <Github Link>)
- Install the VSIX extension from earlier, if you haven't already
- Make sure to click 'reload' when VSCode prompts you
  - this is just to make VSCode recognize the `ether-debug` type
- make sure to add the configuration from earlier in `launch.json`
- launch the `ethdbgTEST` debugger config from the debug panel in VSCode
- you should be able to debug the VSCode extension now.





