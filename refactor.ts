import { Project, SyntaxKind } from 'ts-morph';
const project = new Project();
project.addSourceFilesAtPaths("server.ts");
const sourceFile = project.getSourceFileOrThrow("server.ts");

// 1. Convert all route handlers to async
const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
callExpressions.forEach(callExpr => {
    const exprText = callExpr.getExpression().getText();
    if (exprText.match(/^(app|apiRouter|authRouter|projectsRouter|usersRouter)\.(get|post|put|delete|patch)$/)) {
        const args = callExpr.getArguments();
        const lastArg = args[args.length - 1];
        if (lastArg && lastArg.getKind() === SyntaxKind.ArrowFunction) {
            const arrowFn = lastArg.asKind(SyntaxKind.ArrowFunction);
            if (arrowFn && !arrowFn.isAsync()) {
                arrowFn.setIsAsync(true);
            }
        }
    }
});

// 2. Await getUserFromRequest
const varDecls = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
varDecls.forEach(decl => {
    const init = decl.getInitializer();
    if (init && init.getKind() === SyntaxKind.CallExpression) {
        if (init.getText().startsWith("getUserFromRequest(")) {
            init.replaceWithText(`await ${init.getText()}`);
        }
    }
});

// 3. Make getUserFromRequest async
const funcDecls = sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration);
const getUserFn = funcDecls.find(f => f.getName() === "getUserFromRequest");
if (getUserFn && !getUserFn.isAsync()) {
    getUserFn.setIsAsync(true);
    getUserFn.setReturnType("Promise<UserRecord>");
}

sourceFile.saveSync();
console.log("Basic async refactoring completed.");
