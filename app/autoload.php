<?php
// ============================================================
//  app/autoload.php — PSR-4 style autoloader for the App namespace
//  Usage: require_once __DIR__ . '/app/autoload.php';
// ============================================================

spl_autoload_register(function (string $class): void {
    // Only handle the App\ namespace
    if (!str_starts_with($class, 'App\\')) return;

    $relative = substr($class, 4);                        // strip 'App\'
    $file     = __DIR__ . '/' . str_replace('\\', '/', $relative) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});
