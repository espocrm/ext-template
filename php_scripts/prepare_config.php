<?php

$configFile = __DIR__ . '/../site/data/config.php';
$configTempFile = __DIR__ . '/../site/data/config-temp.php';
$configInternalFile = __DIR__ . '/../site/data/config-internal.php';

$data = [];

if (file_exists($configFile)) {
    $data = include $configFile;
}

if (file_exists($configTempFile)) {
    $dataTemp = include $configTempFile;

    $data = array_merge($data, $dataTemp);
}

file_put_contents($configFile, "<?php\nreturn " . var_export($data, true) . ";");

if (file_exists($configInternalFile)) {
    $dataInternal = include $configInternalFile;

    unset($dataInternal['database']);

    file_put_contents($configInternalFile, "<?php\nreturn " . var_export($dataInternal, true) . ";");
}
