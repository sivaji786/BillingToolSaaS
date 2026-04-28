<?php

namespace App\Models;

class BusinessLetterModel extends InvoiceModel
{
    /**
     * Scope the query to business letters only.
     * Always call this before querying to ensure isolation from invoices.
     */
    public function letters(): static
    {
        return $this->where('template_type', 'business_letter');
    }
}
