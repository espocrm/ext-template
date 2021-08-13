const fs = require('fs-extra');
const unzipper = require('unzipper');
const mv = require('mv');
const cp = require('child_process');
const path = require('path');
const request = require('request');

const helpers = require('./helpers.js');
const extensionParams = require('./extension.json');

const config = helpers.loadConfig();

const branch = helpers.getProcessParam('branch');

if (helpers.hasProcessParam('all')) {
    fetchEspo({branch: branch})
    .then(
        () => install()
    )
    .then(
        () => installExtensions()
    )
    .then(
        () => copyExtension()
    )
    .then(
        () => rebuild()
    )
    .then(
        () => afterInstall()
    )
    .then(
        () => setOwner()
    )
    .then(
        () => console.log('Done')
    );
}

if (helpers.hasProcessParam('install')) {
    install().then(function () {
        installExtensions().then(function () {
            setOwner().then(function () {
                console.log('Done');
            });
        });
    });
}

if (helpers.hasProcessParam('fetch')) {
    fetchEspo({branch: branch}).then(function () {
        console.log('Done');
    });
}

if (helpers.hasProcessParam('copy')) {
    copyExtension().then(function () {
        setOwner().then(function () {
            console.log('Done');
        });
    });
}
if (helpers.hasProcessParam('after-install')) {
    afterInstall().then(function () {
        console.log('Done');
    });
}

if (helpers.hasProcessParam('extension')) {
    buildExtension().then(function () {
        console.log('Done');
    });
}

if (helpers.hasProcessParam('rebuild')) {
    rebuild().then(function () {
        console.log('Done');
    });
}

function fetchEspo (params) {
    params = params || {};

    return new Promise(function (resolve, fail) {
        console.log('Fetching EspoCRM repository...');

        if (fs.existsSync('./site/archive.zip')) {
            fs.unlinkSync('./site/archive.zip');
        }

        helpers.deleteDirRecursively('./site');

        if (!fs.existsSync('./site')) {
            fs.mkdirSync('./site');
        }

        var branch = params.branch || config.espocrm.branch;

        if (config.espocrm.repository.indexOf('https://github.com') === 0) {
            var repository = config.espocrm.repository;

            if (repository.substr(-4) === '.git') {
                repository = repository.substr(0, repository.length - 4);
            }

            if (repository.substr(-1) !== '/') repository += '/';

            var archiveUrl = repository + 'archive/' + branch + '.zip';

            console.log('  Downloading EspoCRM archive from Github...');

            request(archiveUrl)
                .pipe(fs.createWriteStream('./site/archive.zip'))
                .on('close', function () {
                    console.log('  Unzipping...');

                    fs.createReadStream('./site/archive.zip')
                        .pipe(
                            unzipper.Extract({path: 'site'})
                        ).on('close', function () {
                            fs.unlinkSync('./site/archive.zip');

                            helpers.moveDir('./site/espocrm-' + branch, './site').then(function () {
                                resolve();
                            });
                        }).on('error', function () {
                            console.log('  Error while unzipping.');
                            fail();
                        });
                });
        }
        else {
            // var command = "git archive --remote=\""+repository+"\" --output=\"./site/archive.zip\" " + branch;
        }
    });
}

function install () {
    return new Promise(function (resolve) {
        console.log('Installing EspoCRM instance...');

        console.log('  Creating config...');

        createConfig();

        buildEspo();

        if (fs.existsSync('./site/install/config.php')) {
            fs.unlinkSync('./site/install/config.php');
        }

        console.log('  Install: step1...');

        cp.execSync("php install/cli.php -a step1 -d \"user-lang=" + config.install.language + "\"",
            {cwd: './site'});

        console.log('  Install: setupConfirmation...');

        cp.execSync(
            "php install/cli.php -a setupConfirmation -d \"host-name=" + config.database.host +
            "&db-name=" + config.database.dbname +
            "&db-user-name=" + config.database.user +
            "&db-user-password=" + config.database.password + "\"",
            {cwd: './site'}
        );

        console.log('  Install: checkPermission...');

        cp.execSync("php install/cli.php -a \"checkPermission\"", {cwd: './site', stdio: 'ignore'});

        console.log('  Install: saveSettings...');

        cp.execSync(
            "php install/cli.php -a saveSettings -d \"site-url=" + config.install.siteUrl +
            "&default-permissions-user=" + config.install.defaultOwner +
            "&default-permissions-group=" + config.install.defaultGroup + "\"",
            {cwd: './site'}
        );

        console.log('  Install: buildDatabase...');

        cp.execSync("php install/cli.php -a \"buildDatabase\"", {cwd: './site', stdio: 'ignore'});

        console.log('  Install: createUser...');

        cp.execSync("php install/cli.php -a createUser -d \"user-name=" + config.install.adminUsername +
            '&user-pass=' + config.install.adminPassword + "\"",
            {cwd: './site'}
        );

        console.log('  Install: finish...');

        cp.execSync("php install/cli.php -a \"finish\"", {cwd: './site'});

        console.log('  Merge configs...');

        cp.execSync("php merge_configs.php", {cwd: './php_scripts'});

        resolve();
    });
}

function buildEspo () {
    console.log('  Npm install...');

    cp.execSync("npm install", {cwd: './site', stdio: 'ignore'});

    console.log('  Building...');

    cp.execSync("grunt", {cwd: './site', stdio: 'ignore'});
}

function createConfig () {
    const config = helpers.loadConfig();

    var configString = `<?php
        return [
            'database' => [
                'driver' => '${config.database.driver}',
                'host' => '${config.database.host}',
                'port' => '${config.database.port}',
                'charset' => '${config.database.charset}',
                'dbname' => '${config.database.dbname}',
                'user' => '${config.database.user}',
                'password' => '${config.database.password}',
            ],
            'isDeveloperMode' => true,
            'useCache' => true,
        ];
    `;

    fs.writeFileSync('./site/data/config.php', configString);
}

function composerInstall () {
    cp.execSync("composer install --no-dev --ignore-platform-reqs", {cwd: './site', stdio: 'ignore'});
}

function copyExtension () {
    return new Promise(function (resolve, fail) {
        console.log('Copying extension to EspoCRM instance...');

        var moduleName = extensionParams.module;
        var moduleNameHyphen = helpers.camelCaseToHyphen(moduleName);

        if (fs.existsSync('./site/application/Espo/Modules/' + moduleName)) {
            console.log('  Removing backend files...');

            helpers.deleteDirRecursively('./site/application/Espo/Modules/' + moduleName);
        }

        if (fs.existsSync('./site/client/modules/' + moduleNameHyphen)) {
            console.log('  Removing frontend files...');

            helpers.deleteDirRecursively('./site/client/modules/' + moduleNameHyphen);
        }

        if (fs.existsSync('./site/tests/unit/Espo/Modules/' + moduleName)) {
            console.log('  Removing unit test files...');

            helpers.deleteDirRecursively('./site/tests/unit/Espo/Modules/' + moduleName);
        }

        if (fs.existsSync('./site/tests/integration/Espo/Modules/' + moduleName)) {
            console.log('  Removing integration test files...');

            helpers.deleteDirRecursively('./site/tests/integration/Espo/Modules/' + moduleName);
        }

        console.log('  Copying files...');

        fs.copySync('./src/files', './site/');
        fs.copySync('./tests', './site/tests');

        if (!fs.existsSync('./site/application/Espo/Modules/' + moduleName + '/vendor')) {
            internalComposerInstall('./site/application/Espo/Modules/' + moduleName);
        }

        resolve();
    });
}

function rebuild () {
    return new Promise(function (resolve) {
        console.log('Rebuilding EspoCRM instance...');

        cp.execSync("php rebuild.php", {cwd: './site'});

        resolve();
    });
}

function afterInstall () {
    return new Promise(function (resolve) {
        console.log('Running after-install script...');

        cp.execSync("php after_install.php", {cwd: './php_scripts'});

        resolve();
    })
}

function buildExtension () {
    return new Promise(function (resolve) {
        console.log('Building extension package...');

        var moduleName = extensionParams.module;
        var moduleNameHyphen = helpers.camelCaseToHyphen(moduleName);

        const package = require('./package.json');

        var manifest = {
            name: extensionParams.name,
            description: extensionParams.description,
            author: extensionParams.author,
            php: extensionParams.php,
            acceptableVersions: extensionParams.acceptableVersions,
            version: package.version,
            skipBackup: true,
            releaseDate: (new Date()).toISOString().split('T')[0],
        };

        var packageFileName = moduleNameHyphen + '-' + package.version + '.zip';

        if (!fs.existsSync('./build')) {
            fs.mkdirSync('./build');
        }

        if (fs.existsSync('./build/tmp')) {
            helpers.deleteDirRecursively('./build/tmp');
        }

        if (fs.existsSync('./build/' + packageFileName)) {
            fs.unlinkSync('./build/' + packageFileName);
        }

        fs.mkdirSync('./build/tmp');

        fs.copySync('./src', './build/tmp');

        internalComposerBuildExtension();

        fs.writeFileSync('./build/tmp/manifest.json', JSON.stringify(manifest, null, 4));

        const archiver = require('archiver');
        const archive = archiver('zip');

        var zipOutput = fs.createWriteStream('./build/' + packageFileName);

        zipOutput.on('close', function () {
            console.log('Package has been built.');

            helpers.deleteDirRecursively('./build/tmp');

            resolve();
        });

        var currentPath = path.dirname(fs.realpathSync(__filename));

        archive.directory('./build/tmp', '').pipe(zipOutput);

        archive.finalize();
    });
}

function installExtensions () {
    return new Promise(function (resolve, fail) {

        if (!fs.existsSync('./extensions')) {
            resolve();

            return;
        }

        console.log("Installing extensions from 'extensions' directory...");

        fs.readdirSync('./extensions/').forEach( function (file) {
            if (path.extname(file).toLowerCase() != '.zip') {
                return;
            }

            console.log('  Install: ' + file);

            cp.execSync(
                "php command.php extension --file=\"../extensions/" + file + "\"",
                {
                    cwd: './site',
                    stdio: 'ignore',
                }
            );
        });

        resolve();
    });
}

function setOwner () {
    return new Promise(function (resolve) {
        try {
            cp.execSync(
                "chown -R " + config.install.defaultOwner + ":" + config.install.defaultGroup + " .",
                {
                    cwd: './site',
                    stdio: 'ignore',
                }
            );
        }
        catch (e) {}

        resolve();
    });
}

function internalComposerInstall (modulePath) {
    if (!fs.existsSync(modulePath + '/composer.json')) {

        return;
    }

    console.log('  Running internal composer: install...');

    cp.execSync(
        "composer install --no-dev --ignore-platform-reqs",
        {
            cwd: modulePath,
            stdio: 'ignore'
        }
    );
}

function internalComposerBuildExtension() {
    var moduleName = extensionParams.module;

    if (!fs.existsSync('./build/tmp/files/application/Espo/Modules/' + moduleName + '/vendor')) {
        internalComposerInstall('./build/tmp/files/application/Espo/Modules/' + moduleName);
    }

    var removedFileList = [
        'files/application/Espo/Modules/' + moduleName + '/composer.json',
        'files/application/Espo/Modules/' + moduleName + '/composer.lock',
        'files/application/Espo/Modules/' + moduleName + '/composer.phar',
    ];

    removedFileList.forEach(function (file) {
        if (fs.existsSync('./build/tmp/' + file)) {
            fs.unlinkSync('./build/tmp/' + file);
        }
    });
}