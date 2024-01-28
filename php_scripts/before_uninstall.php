<?php

include '../site/bootstrap.php';

$app = new \Espo\Core\Application();
$app->setupSystemUser();

if (file_exists('../src/scripts/BeforeUninstall.php')) {
    include('../src/scripts/BeforeUninstall.php');
    $beforeUninstall = new BeforeUninstall();
    $beforeUninstall->run($app->getContainer());
}