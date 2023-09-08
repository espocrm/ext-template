<?php

include '../site/bootstrap.php';

use Espo\Core\InjectableFactory;
use Espo\Core\Utils\Config\ConfigWriter;

$app = new \Espo\Core\Application();
$app->setupSystemUser();

$configWriter = $app->getContainer()->getByClass(InjectableFactory::class)->create(ConfigWriter::class);

if (file_exists('../config.php')) {
    $override = include('../config.php');

    foreach ($override as $key => $value) {
        $configWriter->set($key, $value);
    }

    $configWriter->save();
}
