<?php

include '../site/bootstrap.php';

$app = new \Espo\Core\Application();
$app->setupSystemUser();

if (file_exists('../src/scripts/AfterInstall.php')) {
    include('../src/scripts/AfterInstall.php');
    $afterInstall = new AfterInstall();
    $afterInstall->run($app->getContainer());
}
