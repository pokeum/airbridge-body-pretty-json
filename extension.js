const vscode = require('vscode');
const modifier = require('./modifier');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	/** 
	 * Command: Airbridge Pretty Json 
	 */
	const airbridgePrettyJson = vscode.commands.registerCommand('airbridge-body-pretty-json.airbridgePrettyJson', function () {

		// Get active editor
		const editor = vscode.window.activeTextEditor;
		if (!editor) { return; }

		const document = editor.document;
		const text = document.getText();
		let modifiedText;

		// Flatten and sort logs
		let logEntries = modifier.flattenLogs(text);
		logEntries = modifier.sortLogs(logEntries);

		// Get first available body content
		const body = modifier.extractBodies(logEntries)[0];
		if (body) {
			try {
				// Parse JSON
				const eventChunk = JSON.parse(body);
				eventChunk.events.forEach(eventPiece => {
					try {
						eventPiece.body = JSON.parse(eventPiece.body);
					} catch (error) {
						vscode.window.showErrorMessage(`Failed to parse event body.\n${error.message}`);
					}
				});

				// Pretty JSON
				modifiedText = JSON.stringify(eventChunk, null, 4);
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

	/**
	 * Command: Airbridge Pretty Json - All
	 */
	const airbridgePrettyJsonAll = vscode.commands.registerCommand('airbridge-body-pretty-json.airbridgePrettyJsonAll', async function () {

		// Get active editor
		const editor = vscode.window.activeTextEditor;
		if (!editor) { return; }

		const document = editor.document;
		const text = document.getText();
		let content;

		// Flatten and sort logs
		let logEntries = modifier.flattenLogs(text);
		logEntries = modifier.sortLogs(logEntries);

		// Get all bodies
		const bodies = modifier.extractBodies(logEntries);
		if (bodies.length === 0) {
			vscode.window.showErrorMessage("Unable to format: No body content found.");
			return;
		}
		for (const body of bodies) {
			try {
				// Parse JSON
				const eventChunk = JSON.parse(body);
				eventChunk.events.forEach(eventPiece => {
					try {
						eventPiece.body = JSON.parse(eventPiece.body);
					} catch (error) {
						vscode.window.showErrorMessage(`Failed to parse event body.\n${error.message}`);
					}
				});

				// Pretty JSON
				content = JSON.stringify(eventChunk, null, 4);
			} catch (error) {
				vscode.window.showErrorMessage(`Unable to format: Invalid JSON detected.\n${error.message}`);
				return;
			}
			
			// Create and open a new untitled editor with the formatted JSON
			try {
				const doc = await vscode.workspace.openTextDocument({ language: 'json', content: content });
				await vscode.window.showTextDocument(doc);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to create untitled file.\n${error.message}`);
			}
		}
	});

	context.subscriptions.push(airbridgePrettyJson, airbridgePrettyJsonAll);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}