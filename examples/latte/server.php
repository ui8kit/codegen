<?php

/**
 * Latte welcome preview — php -S 127.0.0.1:5176 server.php
 * Renders the generated .latte primitives with the shared shadcn tokens.
 */

declare(strict_types=1);

$root = dirname(__DIR__, 2); // ui8kit-codegen/

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (str_starts_with($uri, '/static/')) {
    $file = dirname(__DIR__) . '/web' . $uri;
    if (is_file($file)) {
        $types = ['css' => 'text/css', 'js' => 'text/javascript', 'svg' => 'image/svg+xml', 'woff2' => 'font/woff2'];
        header('Content-Type: ' . ($types[pathinfo($file, PATHINFO_EXTENSION)] ?? 'application/octet-stream'));
        readfile($file);
        return;
    }
    http_response_code(404);
    echo 'Not found';
    return;
}

require $root . '/generated/php/vendor/autoload.php';

$latte = new Latte\Engine();
$tmp = sys_get_temp_dir() . '/ui8kit-latte-example';
if (!is_dir($tmp)) {
    mkdir($tmp, 0777, true);
}
$latte->setTempDirectory($tmp);
$latte->setLoader(new Latte\Loaders\FileLoader($root));

echo $latte->renderToString('examples/latte/templates/page.latte', ['runtime' => 'Latte']);
