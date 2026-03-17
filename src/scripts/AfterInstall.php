<?php

use Espo\Core\Container;
use Espo\Core\InjectableFactory;
use Espo\Core\Utils\Config;
use Espo\Core\Utils\Config\ConfigWriter;
use Espo\ORM\EntityManager;

/**
 * Called when the extension is installed. Here you can write config parameter or create default records.
 */
class AfterInstall
{
    public function run(Container $container)
    {
        // Use to create or read records.
        $em = $container->getByClass(EntityManager::class);

        // Use to add parameter values to the config.
        $configWriter = $container->getByClass(InjectableFactory::class)->create(ConfigWriter::class);

        $config = $container->getByClass(Config::class);
    }
}

