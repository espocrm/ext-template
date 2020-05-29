<?php

include '../site/bootstrap.php';

$app = new \Espo\Core\Application();
$app->setupSystemUser();

$config = $app->getContainer()->get('config');

if (file_exists('../config.php')) {
    $override = include('../config.php');

    foreach ($override as $key => $value) {
        $config->set($key, $value);
    }

    $config->save();
}
