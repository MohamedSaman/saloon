<?php

it('returns a successful response for root customer booking portal', function () {
    $this->get('/')->assertStatus(200);
});

it('returns a successful response for the customer booking portal', function () {
    $this->get('/book')->assertStatus(200);
});
