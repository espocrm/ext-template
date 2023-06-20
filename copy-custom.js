import fs from 'fs-extra';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);

const extensionParams = require('./extension.json');

copyCustom();

function copyCustom () {
    const moduleName = extensionParams.module;
    const sourcePath = './site/custom/Espo/Custom/';
    const distPath = './src/files/custom/Espo/Modules/' + moduleName;

    fs.copySync(sourcePath, distPath);

    let entityTypeList = [];

    if (fs.existsSync(distPath + '/Entities')) {
        fs.readdirSync(distPath + '/Entities').forEach(file => {
            entityTypeList.push(file.slice(0, file.length - 4));
        });
    }

    entityTypeList.forEach(eType => {
        const scopeDefsFile = distPath + '/Resources/metadata/scopes/' + eType + '.json';
        const defs = require(scopeDefsFile);

        defs['module'] = moduleName;
        fs.writeFileSync(scopeDefsFile, JSON.stringify(defs, null, '    '));

        ['Controllers', 'Entities', 'Repositories', 'SelectManagers', 'Services'].forEach(item => {
            let file = distPath + '/' + item + '/' + eType + '.php';

            if (!fs.existsSync(file)) {
                return;
            }

            let contents = fs.readFileSync(file).toString();

            contents = contents
                .replace(new RegExp('namespace Espo\\\\Custom', 'g'), 'namespace Espo\\Modules\\' + moduleName);

            fs.writeFileSync(file, contents);
        });
    });

    console.log(
        "Done.\nCustom files were copied from 'site' to 'src'. " +
        "Now you can remove files from 'site/custom' and commit changes.");
}
