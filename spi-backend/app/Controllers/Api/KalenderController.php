<?php
namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Models\JadwalRapatModel;

class KalenderController extends ResourceController
{
    protected $modelName = JadwalRapatModel::class;
    protected $format    = 'json';

    public function index()
    {
        return $this->respond($this->model->findAll());
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        if ($this->model->insert($data)) {
            return $this->respondCreated(['id' => $this->model->getInsertID()]);
        }
        return $this->failValidationErrors($this->model->errors());
    }
}
