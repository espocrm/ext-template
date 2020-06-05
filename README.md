# Template repository for EspoCRM extensions

Create a repository for your extension from this template.

## Preparing repository

Run:

```
php init.php
```

It will ask to enter an extension name and some other information.

After that, you can remove `init.php` file from your respository. Commit changes and proceed to configuration & building.


## Configuration

Create `config.json` file in the root directory. When reading, this config will be merged with `config-default.json`. You can override default parameters in the created config.

Parameters:

* espocrm.repository - from what repository to fetch EspoCRM;
* espocrm.branch - what branch to fetch (`stable` is set by default); you can specify version number instead (e.g. `5.9.2`);
* database - credentials of the dev database;
* install.siteUrl - site url of the dev instance.


## Config for EspoCRM instance

You can override EspoCRM config. Create `config.php` in the root directory of the repository. This file will be applied after EspoCRM intallation (when building).

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
3. Create a database. The database name is set in the config file.

### Full EspoCRM instance building

It will download EspoCRM (from the repository specified in the config), then build and install it. Then it will install the extension.

Command:

```
node build --all
```

Note: It will remove a previously installed EspoCRM instance, but keep the database intact.

### Copying extension files to EspoCRM instance

You need to run this command every time you make changes in `src` directory and you want to try these changes on Espo instance.

Command:

```
node build --copy
```

### Running after-install script

AfterInstall.php will be applied for EspoCRM instance.

Command:

```
node build --after-install
```

### Extension package building

Command:

```
node build --extension
```

The package will be created in `build` directory.

Note: The version number is taken from `package.json`.

## Development workflow

1. Do development in `src` dir.
2. Run `node build --copy`.
3. Test changes in EspoCRM instance at `site` dir.

## Blocking out extension in Espo

You can block out new entity types right in Espo (using Entity Manager) and then copy generated custom files (`site/custom` dir) to the repository (`src` dir) using `copy-custom.js` script.

1. Create entity types, fields, layouts, relationships in Espo (it should be available in `site` dir after building).
2. Run `node copy-custom.js`. It will copy all files from `site/custom` to `src/files/application/Modules/{ModuleName}` and apply needed modifications to files.
3. Remove files from `site/custom`.
4. Run `node build --copy`. It will copy files from the repository to Espo build (`site/application/Espo/Modules/{ModuleName}` dir).
5. Clear cache in Espo.
6. Test in Espo.
7. Commit changes.
8. Profit.

You can remove `copy-custom.js` from the repository if you don't plan to use it future.

## Versioning

The version number is stored in `package.json` and `package-lock.json`.

Bumping version:

```
npm version patch
npm version minor
npm version major
```

## Tests

Prepare:

1. `node build --copy`
2. `cd site`
3. `grunt test`

Unit tests:

```
vendor/bin/phpunit --bootstrap=./vendor/autoload.php tests/unit/Espo/Modules/{@name}
```

Integration tests:

```
vendor/bin/phpunit --bootstrap=./vendor/autoload.php tests/integration/Espo/Modules/{@name}
```

## License

Change a license in `LICENSE.txt` file. The current license is intended for scripts of this repository. It's not supposed to be used for code of your extension.
