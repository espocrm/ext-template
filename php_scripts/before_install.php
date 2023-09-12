<?php

include '../site/bootstrap.php';

$app = new \Espo\Core\Application();
$app->setupSystemUser();

if (file_exists('../src/scripts/BeforeInstall.php')) {
    include('../src/scripts/BeforeInstall.php');
    $beforeInstall = new BeforeInstall();
    $beforeInstall->run($app->getContainer());
}