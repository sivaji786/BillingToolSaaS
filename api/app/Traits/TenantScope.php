<?php

namespace App\Traits;

trait TenantScope
{
    /**
     * Filter data by current tenant
     */
    protected function beforeFind(array $data)
    {
        $appConfig = config('App');
        $tenant = isset($appConfig->currentTenant) ? $appConfig->currentTenant : null;
        
        if ($tenant && !isset($data['data']['tenant_id'])) {
            // Check if we are already filtering by tenant_id to avoid duplication/conflicts
            // Access builder from model?
            // In CI4 beforeFind, $data['method'] is 'find', 'findAll', etc.
            // We need to modify the query builder instance ($this)
            
            $this->where($this->table . '.tenant_id', $tenant->id);
        }
        
        return $data;
    }
    
    /**
     * Auto-add tenant_id on insert
     */
    protected function beforeInsert(array $data)
    {
        $appConfig = config('App');
        $tenant = isset($appConfig->currentTenant) ? $appConfig->currentTenant : null;
        
        // If data is batch, handle it loop? CI4 passes data row by row or batch?
        // Data['data'] contains the row(s).
        
        if ($tenant) {
            // Check if it's a single row insert or batch
            // Typically $data['data'] is the array of key-values
            
            // Should verify if key 'tenant_id' is already set
            if (!isset($data['data']['tenant_id'])) {
                 $data['data']['tenant_id'] = $tenant->id;
            }
        }
        
        return $data;
    }
    
    /**
     * Ensure we don't update other tenant's data
     */
    protected function beforeUpdate(array $data)
    {
         $appConfig = config('App');
         $tenant = isset($appConfig->currentTenant) ? $appConfig->currentTenant : null;
         if ($tenant) {
             $this->where($this->table . '.tenant_id', $tenant->id);
         }
         return $data;
    }

    protected function beforeDelete(array $data)
    {
         $appConfig = config('App');
         $tenant = isset($appConfig->currentTenant) ? $appConfig->currentTenant : null;
         if ($tenant) {
             $this->where($this->table . '.tenant_id', $tenant->id);
         }
         return $data;
    }
}
