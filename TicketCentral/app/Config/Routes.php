<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// Tickets API
$routes->get('tickets', '\App\Controllers\TicketController::index');
$routes->post('tickets', '\App\Controllers\TicketController::create');

// CORS Options
$routes->options('(:any)', 'Cors::options');
