const fs = require('fs-extra');
const unzipper = require('unzipper');
const mv = require('mv');
const cp = require('child_process');
var request = require('request');

const helpers = require('./helpers.js');
const extensionParams = require('./extension.json');

const config = helpers.loadConfig();

copyCustom();

function copyCustom () {
    var moduleName = extensionParams.module;

    var sourcePath = './site/custom/Espo/Custom/';
    var distPath = './src/files/application/Espo/Modules/' + moduleName;

    fs.copySync(sourcePath, distPath);

    var entityTypeList = [];

    if (fs.existsSync(distPath + '/Entities')) {
        fs.readdirSync(distPath + '/Entities').forEach(file => {
            entityTypeList.push(file.substr(0, file.length - 4));
        });
    }

    entityTypeList.forEach(function (eType) {
        var scopeDefsFile = distPath + '/Resources/metadata/scopes/' + eType + '.json';
        var defs = require(scopeDefsFile);
        defs['module'] = moduleName;
        fs.writeFileSync(scopeDefsFile, JSON.stringify(defs, null, '    '));


        var controllerFile = distPath + '/Controller/' + eType + '.php';

        ['Controllers', 'Entities', 'Repositories', 'SelectManagers', 'Services'].forEach(function (item) {
            var file = distPath + '/'+item+'/' + eType + '.php';
            if (!fs.existsSync(file)) return;

            var contents = fs.readFileSync(file).toString();

            contents = contents.replace(new RegExp('namespace Espo\\\\Custom', 'g'), 'namespace Espo\\Modules\\' + moduleName);

            fs.writeFileSync(file, contents);
        }, this);

    }, this);

    console.log(
        "Done.\nCustom files were copied from 'site' to 'src'. Now you can remove files from 'site/custom' and commit changes.");
}
