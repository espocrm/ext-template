# Template repository for EspoCRM extensions

Create a repository for your extension from this template.

## Preparing repository

Run:

```
php init.php
```

It will ask to enter an extension name and some other information.

After that, you can remove `init.php` file from your repository. Commit changes and proceed to configuration & building.


## Configuration

Create `config.json` file in the root directory. You can copy `config-default.json` and rename it to `config.json`.

When reading, this config will be merged with `config-default.json`. You can override default parameters in the created config.

Parameters:

* espocrm.repository - from what repository to fetch EspoCRM;
* espocrm.branch - what branch to fetch (`stable` is set by default); you can specify version number instead (e.g. `5.9.2`);
* database - credentials of the dev database;
* install.siteUrl - site url of the dev instance;
* install.defaultOwner - a webserver owner (important to be set right);
* install.defaultGroup - a webserver group (important to be set right).


## Config for EspoCRM instance

You can override EspoCRM config. Create `config.php` in the root directory of the repository. This file will be applied after EspoCRM installation (when building).

Example:

```php
<?php
return [
    'useCacheInDeveloperMode' => true,
];
```

## Building

After building, EspoCRM instance with installed extension will be available at `site` directory. You will be able to access it with credentials:

* Username: admin
* Password: 1

### Preparation

1. You need to have *node*, *npm*, *composer* installed.
2. Run `npm install`.
3. Create a database. Note that without the created database instance building will fail. The database name is set in the config file. You can change it.

### Full EspoCRM instance building

It will download EspoCRM (from the repository specified in the config), then build and install it. Then it will install the extension.

Command:

```
npm run all
```

Note: It will remove a previously installed EspoCRM instance, but keep the database intact.

Note: If an error occurred, check `site/data/logs/` for details. It's often a database is not created.

### Copying extension files to EspoCRM instance

You need to run this command every time you make changes in `src` directory and you want to try these changes on Espo instance.

Command:

```
npm run copy
```

To avoid running this command manually, use a file watcher in your IDE. The configuration for PhpStorm is included in this repository. See below about the file watcher.

### Running after-install script

AfterInstall.php will be applied for EspoCRM instance.

Command:

```
node build --after-install
```

### Extension package building

Command:

```
npm run extension
```

The package will be created in `build` directory.

Note: The version number is taken from `package.json`.

### Installing addition extensions

If your extension requires other extensions, there is a way to install them automatically while building the instance.

Necessary steps:

1. Add the current EspoCRM version to the `config.php`:

```php
<?php
return [
    'version' => '9.0.0',
];

```

2. Create the `extensions` directory in the root directory of your repository.
3. Put needed extensions (e.g. `my-extension-1.0.0.zip`) in this directory.

Extensions will be installed automatically after running the command `node build --all` or `node build --install`.

## Development workflow

1. Do development in `src` dir.
2. Run `npm run --copy`.
3. Test changes in EspoCRM instance at `site` dir.

## Using entity manager to create entities

You can block out new entity types right in Espo (using Entity Manager) and then copy generated custom files (`site/custom` dir) to the repository (`src` dir) using `copy-custom.js` script.

1. Create entity types, fields, layouts, relationships in Espo (it should be available in `site` dir after building).
2. Run `node copy-custom.js`. It will copy all files from `site/custom` to `src/files/custom/Espo/Modules/{ModuleName}` and apply needed modifications to files.
3. Remove files from `site/custom`.
4. Run `node build --copy`. It will copy files from the repository to Espo build (`site/custom//Espo/Modules/{ModuleName}` dir).
5. Clear cache in Espo.
6. Test in Espo.
7. Commit changes.

You can remove `copy-custom.js` from the repository if you don't plan to use it future.

## Using composer in extension

If your extension requires additional libraries, they can be installed by composer:

1. Create a file `src/files/custom/Espo/Modules/{ModuleName}/composer.json` with your dependencies.
2. Once you run `node build --all` or `node build --composer-install`, composer dependencies will be automatically installed.
3. Create a file `src/files/custom/Espo/Modules/{ModuleName}/Resources/autoload.json`.

Note: The extension build will contain only the `vendor` directory without the `composer.json` file.

The `autoload.json` file defines paths for namespaces:

```json
{
    "psr-4": {
        "LibraryNamespace\\": "custom/Espo/Modules/{ModuleName}/vendor/<vendor-name>/<library-name>/path/to/src"
    }
}
```

## Versioning

The version number is stored in `package.json` and `package-lock.json`.

Bumping version:

```
npm version patch
npm version minor
npm version major
```

## Tests

To prepare the Espo instance:

```
npm run prepare-test
```

Fetches the instance and runs composer install. To be used for unit tests and static analysis in CI environment. Takes less time than the full installation.


### Unit

Run composer install for the site:

```
(cd site; composer install)
```

Command to run unit tests:

```
(node build --copy; node build --composer-install; cd site; vendor/bin/phpunit tests/unit/Espo/Modules/{@name})
```

or

```
npm run unit-tests
```

### Integration

You need to build a test instance first:

1. `node build --copy`
2. `(cd site; grunt test)`

You need to create a config file `tests/integration/config.php`:

```php
<?php

return [
    'database' => [
        'driver' => 'pdo_mysql',
        'host' => 'localhost',
        'charset' => 'utf8mb4',
        'dbname' => 'TEST_DB_NAME',
        'user' => 'YOUR_DB_USER',
        'password' => 'YOUR_DB_PASSWORD',
    ],
];
```

Command to run integration tests:

```
(node build --copy; node build --composer-install; cd site; vendor/bin/phpunit tests/integration/Espo/Modules/{@name})
```

or

```
npm run integration-tests
```

Note that integration tests needs the full Espo installation.

### Static analysis

Command to run:

```
node build --copy; node build --composer-install; site/vendor/bin/phpstan
```

or

```
npm run sa
```

If your extension contains additional PHP packages, you also need to add `site/custom/Espo/Modules/{@name}/vendor` to the *scanDirectories* section in *phpstan.neon* config.

Note: You can omit *composer-install* command if your extension does not contain PHP packages.

## Configuring IDE

You need to set the following paths to be ignored in your IDE:

* `build`
* `site/build`
* `site/custom/`
* `site/client/custom/`
* `site/tests/unit/Espo/Modules/{@name}`
* `site/tests/integration/Espo/Modules/{@name}`

### File watcher

You can set up a file watcher in the IDE to automatically copy and transpile files upon saving.

File watcher parameters for PhpStorm:

* Program: `node`
* Arguments: `build --copy-file --file=$FilePathRelativeToProjectRoot$`
* Working Directory: `$ProjectFileDir$`

Note: The File Watcher configuration for PhpStorm is included in this reposistory.

## Using ES modules

The initialization script asks whether you want to use ES6 modules. It's recommended to choose "YES".

If you want to switch to ES6 later:

1. Set *bundled* to true in `extension.json`.
2. Set *bundled* and *jsTranspiled* to true in `src/files/custom/Espo/Modules/{@name}/Resources/module.json`.
3. Add `src/files/custom/Espo/Modules/{@name}/Resources/metadata/app/client.json`
    ```json
    {
        "scriptList": [
            "__APPEND__",
            "client/custom/modules/{@nameHyphen}/lib/init.js"
        ]
    }
    ```

## Javascript frontend libraries

Install *rollup*.

In `extension.json`, add a command that will bundle the needed library into an AMD module. Example:

```json
{
    "scripts": [
        "npx rollup node_modules/some-lib/build/esm/index.mjs --format amd --file build/assets/lib/some-lib.js --amd.id some-lib"
    ]
}
```

Add the library module path to `src/files/custom/Espo/Modules/{@name}/Resources/metadata/app/jsLibs.json`

```json
{
    "some-lib": {
        "path": "client/custom/modules/{@nameHyphen}/lib/some-lib.js"
    }
}
```

When you build, the library module will be automatically included in the needed location.

Note that you may also need to create *rollup.config.js* to set some additional Rollup parameters that are not supported via CLI usage.

## License

Change a license in `LICENSE` file. The current license is intended for scripts of this repository. It's not supposed to be used for code of your extension.
