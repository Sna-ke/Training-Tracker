<?php
declare(strict_types=1);
require_once __DIR__ . '/app/autoload.php';
use App\Auth;
Auth::logout();
header('Location: login.php');
exit;
