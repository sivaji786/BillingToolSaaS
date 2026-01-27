<?php

namespace App\Controllers;

use App\Models\CountryModel;
use CodeIgniter\API\ResponseTrait;

class CountryController extends BaseController
{
    use ResponseTrait;

    public function index()
    {
        $lang = $this->request->getGet('lang') ?: 'en';
        
        // Map common lang codes to column suffix
        $validLangs = ['en', 'de', 'ar'];
        if (!in_array($lang, $validLangs)) {
            $lang = 'en';
        }

        $model = new CountryModel();
        $countries = $model->select("code, name_{$lang} as name")
                           ->orderBy("name_{$lang}", 'ASC')
                           ->findAll();

        return $this->respond($countries);
    }
}
