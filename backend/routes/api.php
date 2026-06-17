<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PokemonController;
use App\Http\Controllers\Api\FusionController;
use App\Http\Controllers\Api\NewsController;
use App\Http\Controllers\Api\FaqController;

Route::prefix('v1')->group(function () {
    Route::apiResource('pokemon', PokemonController::class)->only(['index', 'show']);
    Route::apiResource('fusions', FusionController::class)->only(['index', 'show']);
    Route::apiResource('news', NewsController::class)->only(['index', 'show']);
    Route::apiResource('faq', FaqController::class)->only(['index', 'show']);
});
