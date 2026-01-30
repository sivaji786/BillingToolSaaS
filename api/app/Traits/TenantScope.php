<?php

namespace App\Traits;

trait TenantScope
{
    protected $ignoreTenant = false;

    /**
     * Disable tenant scoping for the next query
     */
    public function withoutTenant()
    {
        $this->ignoreTenant = true;
        return $this;
    }

    /**
     * Filter data by current tenant
     */
    protected function beforeFind(array $data)
    {

        if ($this->ignoreTenant) {
            $this->ignoreTenant = false; // Reset for next query
            return $data;
        }

        $appConfig = config('App');
        $tenant = isset($appConfig->currentTenant) ? $appConfig->currentTenant : null;
        
        
        // FAIL-CLOSED LOGIC:
        // If there is NO tenant context, we MUST NOT show all data. 
        // We force an impossible condition unless explicitly bypassed (e.g., for Super Admin, which would need a bypass flag).
        // Since we don't have a robust Super Admin "Global Scope" bypass yet, we err on the side of security.
        
        if ($tenant && is_object($tenant) && isset($tenant->id)) {
            if (!isset($data['data']['tenant_id'])) {
                $this->where($this->table . '.tenant_id', $tenant->id);
            }
        } else {
             // NO TENANT FOUND -> BLOCK EVERYTHING
             // This corresponds to "accessing from api.billingtool.com" without X-Tenant-ID header.
             // Better to return nothing than everything.
             $this->where('1=0');
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
        
        if ($tenant && is_object($tenant) && isset($tenant->id)) {
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
         if ($tenant && is_object($tenant) && isset($tenant->id)) {
             $this->where($this->table . '.tenant_id', $tenant->id);
         }
         return $data;
    }

    protected function beforeDelete(array $data)
    {
         $appConfig = config('App');
         $tenant = isset($appConfig->currentTenant) ? $appConfig->currentTenant : null;
         if ($tenant && is_object($tenant) && isset($tenant->id)) {
             $this->where($this->table . '.tenant_id', $tenant->id);
         }
         return $data;
    }
}
