const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// Replace map.get, map.set, map.delete, map.values, map.has
const mapNames = ['users', 'projects', 'projectFiles', 'projectMembersMap', 'projectCommentsMap', 'fileHistoryStore', 'userMemoriesStore', 'terminalSessionsStore', 'tokenToUserId', 'conversations', 'terminalHistories', 'gitStatesStore', 'projectMemoryStore', 'deploymentsStore'];

for (const name of mapNames) {
    // get, set, delete, has
    const regex1 = new RegExp(`(?<!await\\s)\\b${name}\\.(get|set|delete|has)\\(`, 'g');
    content = content.replace(regex1, `await ${name}.$1(`);

    // values, keys, entries
    const regex2 = new RegExp(`(?<!await\\s)\\b${name}\\.(values|keys|entries)\\(\\)`, 'g');
    content = content.replace(regex2, `await ${name}.$1()`);
}

// Array.from(await map.values()) is fine if our proxy values() returns an array, but wait: Array.from is synchronous. It expects an iterable.
// So if values() returns a Promise<Array>, Array.from(Promise) will yield an empty array!
// We need to change `Array.from(await map.values())` to just `(await map.values())` since our proxy will return an array directly!
for (const name of mapNames) {
    const regex3 = new RegExp(`Array\\.from\\(await ${name}\\.values\\(\\)\\)`, 'g');
    content = content.replace(regex3, `(await ${name}.values())`);
}

fs.writeFileSync('server.ts', content);
console.log('Regex replacements done.');
