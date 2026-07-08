<?php

/**
 * Twig welcome preview — php -S 127.0.0.1:5177 server.php
 * Renders the generated .html.twig primitives with the shared shadcn tokens.
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

$twig = new Twig\Environment(
    new Twig\Loader\FilesystemLoader([__DIR__ . '/templates', $root . '/generated/ui']),
    ['autoescape' => 'html', 'strict_variables' => false, 'cache' => false]
);
$twig->addExtension(new UI8Kit\TwigExtension());

echo $twig->render('page.html.twig', ['runtime' => 'Twig']);
