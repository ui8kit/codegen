<?php

// Renders generated templates from JSON: stdin [{"template":"ui/button/button.latte","vars":{"p":{...},"children":"x"}}],
// stdout the HTML of each (a failure is "ERROR: <message>"). Used by the parity check of xgen.

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use UI8Kit\Latte\Extension;

$env = Extension::engine(dirname(__DIR__));
$requests = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$out = [];
foreach ($requests as $r) {
    try {
        $out[] = $env->renderToString($r['template'], $r['vars'] ?? []);
    } catch (\Throwable $e) {
        $out[] = 'ERROR: ' . $e->getMessage();
    }
}
echo json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE), "\n";
