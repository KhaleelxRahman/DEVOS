import { Project, SyntaxKind } from 'ts-morph';
const project = new Project();
project.addSourceFilesAtPaths("server.ts");
const sourceFile = project.getSourceFileOrThrow("server.ts");

const callExprs = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
callExprs.forEach(callExpr => {
    const exprText = callExpr.getExpression().getText();
    if (exprText === 'users.get' || exprText === 'users.set' || 
        exprText === 'users.delete' || exprText === 'projects.get' || 
        exprText === 'projects.set' || exprText === 'projects.delete' ||
        exprText === 'tokenToUserId.get' || exprText === 'tokenToUserId.set' || exprText === 'tokenToUserId.has') {
        
        // Add await
        callExpr.replaceWithText(`await ${callExpr.getText()}`);
    } else if (exprText === 'users.values') {
        callExpr.replaceWithText(`await users.values()`);
    } else if (exprText === 'projects.values') {
        callExpr.replaceWithText(`await projects.values()`);
    }
});

// Also replace `Array.from(await users.values())` with `await users.values()` if we make the repo return an array
const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
calls.forEach(call => {
    if (call.getText().startsWith("Array.from(await projects.values())")) {
        call.replaceWithText("await projects.values()");
    }
    if (call.getText().startsWith("Array.from(await users.values())")) {
        call.replaceWithText("await users.values()");
    }
});

// Handle Array.from(projects.values()) directly
calls.forEach(call => {
    if (call.getText().startsWith("Array.from(projects.values())")) {
        call.replaceWithText("await projects.values()");
    }
    if (call.getText().startsWith("Array.from(users.values())")) {
        call.replaceWithText("await users.values()");
    }
});

sourceFile.saveSync();
console.log("Map calls refactored.");
