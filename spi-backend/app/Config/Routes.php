<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

service('auth')->routes($routes);

$routes->group('api', ['namespace' => 'App\Controllers\Api'], function ($routes) {
    // Auth — publik
    $routes->post('auth/login',    'AuthController::login');
    $routes->post('auth/register', 'AuthController::register');
    $routes->options('auth/login', function() {
        return response()->setStatusCode(200);
    });
    $routes->options('auth/register', function() {
        return response()->setStatusCode(200);
    });

    // Protected — perlu JWT
    $routes->group('', ['filter' => 'jwtAuth'], function ($routes) {
        $routes->get('audit',              'AuditController::index');
        $routes->post('audit',             'AuditController::create');
        $routes->get('audit/(:num)',       'AuditController::show/$1');
        $routes->put('audit/(:num)',       'AuditController::update/$1');

        $routes->get('rtl',               'RtlController::index');   
        $routes->put('rtl/(:num)',        'RtlController::update/$1');
        $routes->post('rtl/(:num)/bukti', 'RtlController::uploadBukti/$1');

        $routes->get('temuan',            'TemuanController::index');
        $routes->get('kalender',          'KalenderController::index');
        $routes->post('kalender',         'KalenderController::create');

        $routes->get('notifikasi',        'NotifikasiController::index');
        $routes->patch('notifikasi/(:num)/read', 'NotifikasiController::markRead/$1');

        $routes->get('anggaran',          'AnggaranController::index');
    });

    // Catch-all OPTIONS request for CORS preflight
    $routes->options('(:any)', function() {
        return response()->setStatusCode(200);
    });
});
