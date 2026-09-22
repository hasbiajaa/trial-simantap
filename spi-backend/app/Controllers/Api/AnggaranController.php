<?php
namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Models\AnggaranModel;

class AnggaranController extends ResourceController
{
    protected $modelName = AnggaranModel::class;
    protected $format    = 'json';

    public function index()
    {
        return $this->respond($this->model->findAll());
    }
}
