<?php

class AfterUninstall
{
    protected $container;

    public function run($container)
    {
        $this->container = $container;
    }

    protected function clearCache()
    {
        try {
            $this->container->get('dataManager')->clearCache();
        } catch (\Exception $e) {}
    }
}
