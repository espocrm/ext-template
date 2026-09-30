<?php

fwrite(STDOUT, "Enter an extension name:\n");
$fh = fopen('php://stdin', 'r');
$name = trim(fgets($fh));
fclose($fh);

$nameLabel = $name;
$name = ucfirst($name);
$name = str_replace(' ', '', ucwords(preg_replace('/^[a-z0-9]+/', ' ', $name)));
$nameHyphen = strtolower(preg_replace('/(?<!^)[A-Z]/', '-$0', $name));

fwrite(STDOUT, "Enter a description text:\n");
$fh = fopen('php://stdin', 'r');
$description = trim(fgets($fh));
fclose($fh);

if (!str_ends_with($description, '.')) {
    $description .= '.';
}

fwrite(STDOUT, "Enter an author name:\n");
$fh = fopen('php://stdin', 'r');
$author = trim(fgets($fh));
fclose($fh);

$replacePlaceholders = function (string $file) use
    ($name, $nameHyphen, $nameLabel, $description, $author)
{
    $content = file_get_contents($file);

    $content = strtr($content, [
        '{@name}' => $name,
        '{@nameHyphen}' => $nameHyphen,
        '{@nameLabel}' => $nameLabel,
        '{@description}' => $description,
        '{@author}' => $author,
        '{@bundled}' => 'true',
        '{@jsTranspiled}' => 'true',
    ]);

    file_put_contents($file, $content);
};

$files = [
    'package.json',
    'extension.json',
    'jsconfig.json',
    'tsconfig.json',
    'config-default.json',
    'phpstan.neon',
    'composer.json',
    'README.md',
    'src/files/custom/Espo/Modules/MyModuleName/Resources/module.json',
    '.github/workflows/test.yml.disabled',
];

foreach ($files as $file) {
    $replacePlaceholders($file);
}

$content = <<<CLIENT_JSON
{
  "scriptList": [
      "__APPEND__",
      "client/custom/modules/{@nameHyphen}/lib/init.js"
  ]
}
CLIENT_JSON;

$path = 'src/files/custom/Espo/Modules/MyModuleName/Resources/metadata/app/';
mkdir($path, 0755, true);

$path .= "client.json";
file_put_contents($path, $content);

$replacePlaceholders($path);


rename('src/files/custom/Espo/Modules/MyModuleName', 'src/files/custom/Espo/Modules/'. $name);
rename('src/files/client/custom/modules/my-module-name', 'src/files/client/custom/modules/'. $nameHyphen);

rename('tests/unit/Espo/Modules/MyModuleName', 'tests/unit/Espo/Modules/'. $name);
rename('tests/integration/Espo/Modules/MyModuleName', 'tests/integration/Espo/Modules/'. $name);

echo "Ready. Now you need to run 'npm install'.\n";
