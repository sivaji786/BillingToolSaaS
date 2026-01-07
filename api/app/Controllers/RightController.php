<?php

namespace App\Controllers;

use App\Models\RightModel;
use CodeIgniter\API\ResponseTrait;

class RightController extends BaseController
{
    use ResponseTrait;

    public function index()
    {
        $model = new RightModel();
        
        // Check for grouping
        $groupByModule = $this->request->getGet('group_by_module');
        $rights = $model->orderBy('module', 'ASC')->orderBy('code', 'ASC')->findAll();

        if ($groupByModule) {
            $grouped = [];
            foreach ($rights as $right) {
                $grouped[$right['module']][] = $right;
            }
            return $this->respond($grouped);
        }

        return $this->respond($rights);
    }
}
