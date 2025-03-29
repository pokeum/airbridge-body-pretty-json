const vscode = require('vscode');
const modifier = require('./modifier');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	const disposable = vscode.commands.registerCommand('airbridge-body-pretty-json.airbridgePrettyJson', function () {

		// Get active editor
		const editor = vscode.window.activeTextEditor;
		if (!editor) { return; }

		const document = editor.document;
		const text = document.getText();

		// Sort and flatten log
		let modifiedText = modifier.sortLogs(modifier.flattenLogs(text)).join('\n');
		
		// Remove Android log prefix
		modifiedText = modifier.removeAndroidLogPrefix(modifiedText);

		// Get first available body content
		const body = modifier.extractBody(modifiedText);
		if (body) {
			modifiedText = modifier.unescape(body);

			// Pretty JSON
			try {
				const json = JSON.parse(modifiedText);
				modifiedText = JSON.stringify(json, null, 4);
			} catch (error) {
				vscode.window.showErrorMessage(`Unable to format: Invalid JSON detected.\n${error.message}`);
				return;
			}
		} else {
			vscode.window.showErrorMessage("Unable to format: No body content found.");
			return;
		}

		const fullRange = new vscode.Range(
			document.positionAt(0),
			document.positionAt(text.length)
		);

		editor.edit(editBuilder => {
			editBuilder.replace(fullRange, modifiedText);
		});
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}